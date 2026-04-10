import { ai, LLM_MODEL, embedQuery } from './gemini'
import { supabase } from './supabaseClient'

// ── Types ──────────────────────────────────────────────────
export type PodcastTheme = 'standard' | 'story' | 'dramatic' | 'fun' | 'revision'
export type PodcastLanguage = 'english' | 'hindi'

export interface AudioOverviewInput {
  subjectId: string
  subjectTitle: string
  chapterId: number
  chapterTitle: string
  mode: 'full' | 'topic'
  topic?: string
  theme: PodcastTheme
  language: PodcastLanguage
  model?: string
}

export interface AudioOverviewResult {
  audioUrl: string
  script: string
  durationEstimate: string
}

type ProgressCallback = (stage: string, detail: string) => void

// ── Theme & Language Prompt Blocks ─────────────────────────
const THEME_INSTRUCTIONS: Record<PodcastTheme, string> = {
  standard: 'ACT AS A PROFESSIONAL EDUCATOR. Use a calm, methodical, and authoritative yet warm tone. Organize information into logical segments with clear transitions. Prioritize academic clarity above all else, ensuring technical terms are defined simply but accurately.',
  story: 'ACT AS A MASTER STORYTELLER. Weave the entire educational content into a single, compelling narrative or real-world scenario. Instead of just stating facts, describe how concepts "act" in the story. Use vivid imagery and relatable characters or situations to anchor the learning material.',
  dramatic: 'ACT AS A COMMANDING NARRATOR. Use high-stakes, expressive delivery with pauses for emphasis. Frame the concepts as powerful "discoveries" or critical "turning points" in science/history. Increase the intensity when discussing fundamental laws or major breakthroughs to inspire awe and curiosity.',
  fun: 'ACT AS AN ENERGETIC AND PLAYFUL MENTOR. Use light-hearted analogies, energetic pacing, and an informal, conversational style. Keep the energy high and the language "breezy" without losing factual accuracy. Make the learning feel like a fun conversation between friends.',
  revision: 'ACT AS A RAPID-RESPONSE TUTOR. Use an ultra-fast, high-density delivery. Strip away all fluff and narratives. Focus exclusively on a punchy list of definitions, formulas, key trends, and "must-know" facts. The script should reflect an urgent, high-efficiency review session.',
}

const LANGUAGE_INSTRUCTIONS: Record<PodcastLanguage, string> = {
  english: 'Write the entire script in clear, simple English suitable for CBSE Class 10 students.',
  hindi: 'Write the entire script in simple, clear Hindi (Devanagari script), suitable for CBSE Class 10 students. Ensure natural spoken Hindi, not overly formal or Sanskrit-heavy.',
}

// ── Cache ──────────────────────────────────────────────────
const audioCache = new Map<string, AudioOverviewResult>()

function cacheKey(input: AudioOverviewInput): string {
  return `${input.subjectId}::${input.chapterId}::${input.mode}::${input.topic || ''}::${input.theme}::${input.language}`
}

// ── Cosine Similarity ──────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// ── Fetch All Chapter Chunks ───────────────────────────────
export async function fetchChapterChunks(chapterId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('chapter_document_chunks')
    .select('content')
    .eq('chapter_id', chapterId)

  if (error) throw new Error(`Failed to fetch chunks: ${error.message}`)
  if (!data || data.length === 0) return []

  return data.map((row: any) => row.content)
}

// ── Fetch Topic-Specific Chunks (Embedding Similarity) ────
export async function fetchTopicChunks(chapterId: number, topic: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('chapter_document_chunks')
    .select('content, embedding')
    .eq('chapter_id', chapterId)

  if (error) throw new Error(`Failed to fetch chunks: ${error.message}`)
  if (!data || data.length === 0) return []

  // Get query embedding for the topic
  const queryEmb = await embedQuery(topic)

  // Score each chunk by similarity
  const scored = data.map((row: any) => {
    const emb = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding
    return {
      content: row.content as string,
      score: cosineSimilarity(queryEmb, emb),
    }
  })

  scored.sort((a, b) => b.score - a.score)

  // Return top 8 most relevant chunks
  return scored.slice(0, 8).map(s => s.content)
}

// ── Generate Podcast Script via LLM ───────────────────────
export async function generatePodcastScript(
  contextChunks: string[],
  chapterTitle: string,
  mode: 'full' | 'topic',
  theme: PodcastTheme = 'standard',
  language: PodcastLanguage = 'english',
  topic?: string
): Promise<string> {
  const context = contextChunks.join('\n\n---\n\n')

  const focusInstruction = mode === 'topic' && topic
    ? `Focus specifically on the topic: "${topic}". Cover this topic in depth using the provided content.`
    : `Cover the entire chapter comprehensively. Hit all major concepts, key terms, and important facts.`

  const themeBlock = THEME_INSTRUCTIONS[theme]
  const langBlock = LANGUAGE_INSTRUCTIONS[language]

  const lengthInstruction = theme === 'revision'
    ? '* Between 400 to 700 words\n* Aim for 3–4 minutes of audio'
    : '* Between 800 to 1200 words\n* Aim for 5–7 minutes of audio'

  const prompt = `You are an AI educational narrator creating a smooth, clear, and structured audio lesson for CBSE Class 10 students.

Your output will be converted into speech using a Text-to-Speech system, so the script must be optimized for clarity, flow, and natural listening.

---

THEME / TONE INSTRUCTION:
${themeBlock}

---

LANGUAGE INSTRUCTION:
${langBlock}

---

INPUT:
CHAPTER: "${chapterTitle}"
${focusInstruction}

CONTENT (STRICT SOURCE — DO NOT GO OUTSIDE THIS):
${context}

---

OBJECTIVE:

Generate a podcast-style explanation following the theme and language instructions above.

---

STYLE & DELIVERY RULES (VERY IMPORTANT):

1. Always start the podcast with the exact phrase: "Hello, I am Academic Pulse." Show professionalism and warmth from the start.

2. Follow the theme tone described above strictly

3. Ensure smooth flow between sentences

   * Use transitions appropriate to the chosen language

3. Keep sentences:

   * Short to medium length
   * Grammatically simple
   * Easy to pronounce

4. Avoid:

   * Mixing languages unless natural (e.g., technical terms in English within Hindi are fine)
   * Symbols or formatting that break speech
   * Complex or nested sentences
   * Abrupt jumps in topics

5. Maintain logical structure:

   * Introduction
   * Concept explanation (step-by-step)
   * Key points
   * Final recap

---

CONTENT RULES:

* Use ONLY the provided content
* Do NOT add external knowledge
* Do NOT hallucinate examples beyond context
* If topic-specific → stay tightly focused
* If full chapter → cover all major concepts in order

---

AUDIO OPTIMIZATION:

* Write as if it will be spoken continuously
* Avoid symbols or formatting that break speech
* Use clear connectors between ideas
* Ensure each paragraph flows into the next naturally

---

OUTPUT FORMAT:

* Plain text only
* No markdown
* No bullet points
* No stage directions
* No speaker labels

---

LENGTH:

${lengthInstruction}

---

STRUCTURE:

1. Introduction appropriate to the theme
2. Sequential explanation of concepts
3. Smooth transitions between sections
4. Final recap with key ideas

---

GOAL:

The listener should be able to:

* Understand the concept clearly
* Follow without confusion
* Revise efficiently through audio

---

Generate the complete podcast script now.
`

  const response = await ai.models.generateContent({
    model: LLM_MODEL,
    contents: prompt,
    config: { temperature: theme === 'revision' ? 0.5 : 0.7 },
  })

  return (response.text ?? '').trim()
}

// ── PCM to WAV Blob Conversion ────────────────────────────
export function pcmToWavBlob(pcmBase64: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): string {
  // Decode base64 to binary
  const binaryStr = atob(pcmBase64)
  const pcmBytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    pcmBytes[i] = binaryStr.charCodeAt(i)
  }

  const dataLength = pcmBytes.length
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)

  // Create WAV header (44 bytes)
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')

  // fmt sub-chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)           // SubChunk1Size (PCM = 16)
  view.setUint16(20, 1, true)            // AudioFormat (PCM = 1)
  view.setUint16(22, numChannels, true)   // NumChannels
  view.setUint32(24, sampleRate, true)    // SampleRate
  view.setUint32(28, byteRate, true)      // ByteRate
  view.setUint16(32, blockAlign, true)    // BlockAlign
  view.setUint16(34, bitsPerSample, true) // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  // Copy PCM data
  const wavBytes = new Uint8Array(buffer)
  wavBytes.set(pcmBytes, 44)

  const blob = new Blob([buffer], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

// ── Voice Maps ────────────────────────────────────────────
const VOICE_MAP: Record<PodcastLanguage, string> = {
  english: 'Kore',
  hindi: 'Puck',
}

// ── Generate TTS Audio via Gemini ─────────────────────────
export async function generateTTSAudio(script: string, language: PodcastLanguage = 'english'): Promise<string> {
  const voiceName = VOICE_MAP[language]

  const response = await ai.models.generateContent({
    model: import.meta.env.VITE_LLM_MODEL_TTS || 'gemini-2.5-flash-preview-tts',
    contents: script,
    config: {
      responseModalities: ['audio'] as any,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    } as any,
  })

  // Extract the base64 audio data from the response
  const parts = (response as any).candidates?.[0]?.content?.parts
  if (!parts || parts.length === 0) {
    throw new Error('No audio data returned from TTS model')
  }

  const audioPart = parts[0]
  if (!audioPart.inlineData?.data) {
    throw new Error('TTS response missing audio data')
  }

  const base64Audio = audioPart.inlineData.data
  return pcmToWavBlob(base64Audio)
}

// ── Main Pipeline ─────────────────────────────────────────
export async function generateAudioOverview(
  input: AudioOverviewInput,
  onProgress?: ProgressCallback
): Promise<AudioOverviewResult> {
  // Check cache first
  const key = cacheKey(input)
  const cached = audioCache.get(key)
  if (cached) {
    onProgress?.('complete', 'Loaded from cache!')
    return cached
  }

  // Step 1: Fetch embeddings/chunks
  onProgress?.('fetching', 'Retrieving chapter content from database...')
  let chunks: string[]

  if (input.mode === 'topic' && input.topic) {
    chunks = await fetchTopicChunks(input.chapterId, input.topic)
  } else {
    chunks = await fetchChapterChunks(input.chapterId)
  }

  if (chunks.length === 0) {
    throw new Error('NO_CONTENT')
  }

  // Step 2: Generate podcast script
  onProgress?.('scripting', 'Writing your podcast script with AI...')
  const script = await generatePodcastScript(
    chunks,
    input.chapterTitle,
    input.mode,
    input.theme,
    input.language,
    input.topic
  )

  if (!script) {
    throw new Error('Failed to generate podcast script')
  }

  // Step 3: Convert to audio via TTS
  onProgress?.('converting', 'Converting script to audio...')
  const audioUrl = await generateTTSAudio(script, input.language)

  // Estimate duration (~150 words per minute)
  const wordCount = script.split(/\s+/).length
  const minutes = Math.round(wordCount / 150)
  const durationEstimate = `~${minutes} min`

  const result: AudioOverviewResult = { audioUrl, script, durationEstimate }

  // Cache the result
  audioCache.set(key, result)

  onProgress?.('complete', 'Your podcast is ready!')
  return result
}
