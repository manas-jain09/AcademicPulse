import { GoogleGenAI } from '@google/genai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const EMBEDDING_MODEL = import.meta.env.VITE_EMBEDDING_MODEL || 'gemini-embedding-2-preview'
export const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gemini-3.1-flash-lite-preview'

if (!API_KEY) {
    console.error('VITE_GEMINI_API_KEY is missing from environment variables.')
}

export const ai = new GoogleGenAI({ apiKey: API_KEY })

// ── Embedding ──────────────────────────────────────────────
export async function embedText(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { taskType: 'RETRIEVAL_DOCUMENT' },
    })
    return response.embeddings?.[0]?.values ?? []
}

export async function embedQuery(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { taskType: 'RETRIEVAL_QUERY' },
    })
    return response.embeddings?.[0]?.values ?? []
}

// Removed Vision Figure Extraction Functions

// ── Chat History Type ──────────────────────────────
export interface ChatMessage {
    role: 'user' | 'assistant'
    text: string
}

export async function chatWithContextStream(
    query: string,
    contextChunks: string[],
    chatHistory: ChatMessage[],
    language: string,
    onChunk: (text: string) => void,
    systemPromptOverride?: string
): Promise<string> {
    const hasContext = contextChunks.length > 0
    const context = contextChunks.join('\n\n---\n\n')

    // Build conversation history string for context window
    const historyStr = chatHistory.length > 0
        ? chatHistory
            .slice(-10) // Keep last 10 messages to avoid token limit
            .map(m => `${m.role === 'user' ? 'Student' : 'Mentor'}: ${m.text}`)
            .join('\n\n')
        : ''

    const systemPrompt = systemPromptOverride || `IDENTITY
You are a personalized AI tutor for CBSE Class 10 Science, built on the "Academic Pulse" platform.
Your knowledge is EXCLUSIVELY limited to the provided chapter excerpts.

STRICT GROUNDING RULES (CRITICAL)
1. You must answer ONLY using information from the "CHAPTER EXCERPTS" section below.
2. If the user asks something NOT covered by the excerpts (even if you know it from your general knowledge), you MUST politely state: "I'm sorry, I couldn't find information about that in the current chapter material. I can only help you with topics covered in Chapter 3: Metals and Non-Metals."
3. Do NOT hallucinate or use any outside knowledge.

CHAPTER SCOPE (Chapter 3: Metals and Non-Metals)
- Physical and chemical properties of metals and non-metals
- Reactivity series
- Ionic compounds and their properties
- Extraction of metals
- Corrosion and prevention

FORMATTING RULES
- Always respond in clear, well-structured Markdown.
- Use bold for key scientific terms.
- Use bullet points or numbered lists for processes and properties.
- Use inline code (e.g., \`NaCl\`) for chemical formulas and symbols.
- Keep responses concise (3-5 sentences or 5-6 bullets).

IMAGE & FIGURE RULES
- You have access to a catalog of figures. When explaining a concept that has a corresponding figure, you MUST include the token \`[FIGURE:X.X]\` on its own line.
- FIGURES CATALOG:
  - [FIGURE:3.1] → Malleability (metals beaten into sheets)
  - [FIGURE:3.2] → Ductility (metals drawn into wires)
  - [FIGURE:3.3] → Reaction of metals with dilute acids
  - [FIGURE:3.4] → Magnesium ribbon burning
  - [FIGURE:3.5] → Sodium reaction with water
  - [FIGURE:3.6] → Calcium reaction with water
  - [FIGURE:3.7] → Metals reacting with steam
  - [FIGURE:3.8] → Reactivity Series (Table)
  - [FIGURE:3.9] → Displacement reaction (Zn + CuSO4)
  - [FIGURE:3.10] → Electrolytic Refining
  - [FIGURE:3.11] → Ionic Bond Formation (Electron transfer)
  - [FIGURE:3.12] → Extraction of Metals / Thermite Reaction
  - [FIGURE:3.13] → Corrosion (Rusting)

TONE
- Encouraging, professional, and student-friendly.

${hasContext ? `CHAPTER EXCERPTS (Your ONLY source of information):
${context}` : '(No chapter excerpts available. You must ask the student to select a topic or guide them conceptually within Chapter 3 bounds.)'}

LANGUAGE: ${language}

${historyStr ? `PREVIOUS MESSAGES:
${historyStr}` : ''}

STUDENT MESSAGE:
${query}`

    const response = await ai.models.generateContentStream({
        model: LLM_MODEL,
        contents: systemPrompt,
        config: {
            temperature: 0,
        },
    })

    let fullText = ''
    for await (const chunk of response) {
        const text = chunk.text ?? ''
        fullText += text
        onChunk(fullText)
    }

    return fullText || 'Sorry, I could not generate a response. Please try again.'
}


// ── Mind Map Generation ────────────────────────────────────
export async function generateMindMap(contextChunks: string[]): Promise<string> {
    const context = contextChunks.join('\n\n---\n\n')

    const response = await ai.models.generateContent({
        model: LLM_MODEL,
        contents: `You are an expert at creating visual mind maps for Class 10 CBSE students.

Based on the following chapter content about "Metals and Non-Metals", generate a Mermaid mindmap diagram.

Rules:
1. Use the Mermaid mindmap syntax
2. The root node should be "Metals and Non-Metals"
3. Include major topics as primary branches (4-6 branches)
4. Each branch should have 2-4 sub-topics
5. Keep labels short and clear (max 4-5 words each)
6. Cover all important concepts from the chapter
7. Return ONLY the mermaid code, no explanation, no code fences

Example format:
mindmap
  root((Metals and Non-Metals))
    Physical Properties
      Lustre
      Malleability
      Ductility
    Chemical Properties
      Reaction with Oxygen
      Reaction with Water

CHAPTER CONTENT:
${context}`,
    })

    const text = (response.text ?? '').trim()
    // Strip markdown code fences if present
    return text.replace(/^```(?:mermaid)?\n?/i, '').replace(/\n?```$/i, '').trim()
}

// ── Quiz Generation ────────────────────────────────────────
export interface QuizQuestion {
    question: string
    options: string[]
    correctIndex: number
}

export async function generateQuiz(contextChunks: string[], topics?: string[]): Promise<QuizQuestion[]> {
    const context = contextChunks.join('\n\n---\n\n')
    const topicHint = topics && topics.length > 0
        ? `\n\nThe student has been asking about these topics, so FOCUS the quiz on these areas:\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : ''

    const response = await ai.models.generateContent({
        model: LLM_MODEL,
        contents: `You are a quiz generator for Class 10 CBSE students studying "Metals and Non-Metals".

Based ONLY on the following chapter content, generate exactly 5 multiple-choice questions.
Each question must have exactly 4 options with only 1 correct answer.
Each question carries 1 mark (total 5 marks).${topicHint}

CHAPTER CONTENT:
${context}

Respond in ONLY valid JSON array format, no extra text, no markdown code blocks:
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctIndex": 0
  }
]

Make questions progressively harder. Cover different topics from the chapter.`,
    })

    const text = (response.text ?? '').trim()
    // Strip markdown code fences if present
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    try {
        const parsed = JSON.parse(jsonStr) as QuizQuestion[]
        return parsed.slice(0, 5)
    } catch {
        console.error('Failed to parse quiz JSON:', text)
        return []
    }
}

// ── Quiz Evaluation ────────────────────────────────────────
export async function evaluateQuiz(
    questions: QuizQuestion[],
    selectedAnswers: number[]
): Promise<{ score: number; total: number; feedback: string[] }> {
    let score = 0
    const feedback: string[] = []

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const selected = selectedAnswers[i]
        if (selected === q.correctIndex) {
            score++
            feedback.push(`✅ Correct!`)
        } else {
            feedback.push(
                `❌ Incorrect. The correct answer is: ${q.options[q.correctIndex]}`
            )
        }
    }

    return { score, total: questions.length, feedback }
}

// ── Flashcard Generation ───────────────────────────────────
export interface Flashcard {
    front: string
    back: string
}

export async function generateFlashcards(contextChunks: string[]): Promise<Flashcard[]> {
    const context = contextChunks.join('\n\n---\n\n')

    const response = await ai.models.generateContent({
        model: LLM_MODEL,
        contents: `You are a study aid for Class 10 CBSE students studying "Metals and Non-Metals".

Based ONLY on the following chapter content, generate 10 flashcards.
Each flashcard should have a "front" (a concept, term, or question) and a "back" (detailed explanation).

CHAPTER CONTENT:
${context}

Respond in ONLY valid JSON array format, no extra text, no markdown code blocks:
[
  {
    "front": "What is malleability?",
    "back": "Malleability is the property of metals that allows them to be beaten into thin sheets. Gold and silver are the most malleable metals."
  }
]

Cover the most important concepts from the chapter. Make explanations detailed and student-friendly.`,
    })

    const text = (response.text ?? '').trim()
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    try {
        const parsed = JSON.parse(jsonStr) as Flashcard[]
        return parsed
    } catch {
        console.error('Failed to parse flashcard JSON:', text)
        return []
    }
}

// ── Board Paper Generation ─────────────────────────────────
export async function generateBoardPaper(subjectName: string, difficulty: string, contextChunks: string[]): Promise<any> {
    const context = contextChunks.join('\n\n---\n\n')

    const prompt = `You are a CBSE Board Exam Paper Setter. 
    Task: Generate a Class 10 Board Question Paper for the subject: ${subjectName}.
    Difficulty Level: ${difficulty} (Easy, Medium, Hard, or Mixed).
    
    The paper MUST follow the latest CBSE (2025-26) structure:
    1. Section A: 20 MCQs (1 mark each)
    2. Section B: 6 Very Short Answer (2 marks each)
    3. Section C: 7 Short Answer (3 marks each)
    4. Section D: 3 Long Answer (5 marks each)
    5. Section E: 3 Case-Based (4 marks each)
    
    Rules:
    - Include clear "OR" options for Sections B, C, and D (at least 2 per section).
    - Case-based questions must include a passage.
    - Questions must be GROUNDED in the provided context.
    - Total marks: 80.
    
    ${context ? `Use this CHAPTER CONTENT as the primary source:\n${context}` : 'Use general CBSE Class 10 syllabus for the subject.'}
    
    Respond in ONLY valid JSON format with this structure:
    {
      "title": "...",
      "code": "...",
      "duration": "3 Hours",
      "totalMarks": 80,
      "generalInstructions": ["...", "..."],
      "sections": [
        {
          "title": "Section A",
          "type": "20 Multiple Choice Questions",
          "totalMarks": 20,
          "instructions": "Each question carries 1 mark.",
          "questions": [
            { "number": 1, "text": "...", "type": "mcq", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "marks": 1, "answer": "..." }
          ]
        },
        ... (repeat for B, C, D, E)
      ]
    }
    
    Return ONLY JSON, no markdown code blocks.`

    const response = await ai.models.generateContent({
        model: LLM_MODEL,
        contents: prompt,
        config: {
            temperature: 0.7,
            responseMimeType: "application/json"
        },
    })

    const text = (response.text ?? '').trim()
    return JSON.parse(text)
}

// ── Board Paper Evaluation ──────────────────────────────────
export async function evaluateBoardPaper(paperJson: any, fileBase64: string, mimeType: string): Promise<any> {
    const prompt = `You are a CBSE Board Examiner evaluating a student's answer sheet.
    
    QUESTION PAPER (JSON):
    ${JSON.stringify(paperJson)}
    
    Task: Evaluate the attached student's answer sheet strictly according to CBSE marking schemes and the difficulty level.
    
    Observe each question number, the student's handwritten or typed response, and compare it with the expected level. 
    Calculate marks for each section and question.
    
    Respond in ONLY valid JSON format with this exactly:
    {
      "paperName": "...",
      "totalMarks": 80,
      "totalMarksObtained": 0,
      "percentage": 0,
      "grade": "...",
      "summary": "...",
      "questionWise": [
        { "questionNumber": 1, "marksObtained": 0, "maxMarks": 1, "status": "correct|partial|incorrect", "feedback": "..." }
      ],
      "sectionWise": [
        { "section": "A", "title": "Section A", "marksObtained": 0, "totalMarks": 20, "percentage": 0 }
      ],
      "topicWise": [
        { "topic": "...", "marksObtained": 0, "totalMarks": 0, "status": "strong|average|weak" }
      ],
      "strengths": ["...", "..."],
      "areasForImprovement": ["...", "..."]
    }
    
    Return ONLY JSON, no markdown code blocks.`

    const response = await ai.models.generateContent({
        model: LLM_MODEL,
        contents: [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: fileBase64
                }
            },
            { text: prompt }
        ],
        config: {
            temperature: 0.2,
            responseMimeType: "application/json"
        },
    })

    const text = (response.text ?? '').trim()
    return JSON.parse(text)
}
