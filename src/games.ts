// ── Games Module ────────────────────────────────────────────
// Memory Sprint, Case Cracker, 60-Second Challenge, Build the Answer

import { ai, LLM_MODEL } from './gemini'
import { supabase } from './supabaseClient'

// ── Types ──────────────────────────────────────────────────
export type GameType = 'memory' | 'case' | 'rapid' | 'build'

export interface MemoryQuestion {
  fact: string
  questions: { question: string; options: string[]; correctIndex: number }[]
}

export interface CaseQuestion {
  scenario: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface RapidQuestion {
  question: string
  options: string[]
  correctIndex: number
}

export interface BuildQuestion {
  prompt: string
  steps: string[]          // correct order
  shuffledSteps: string[]  // shuffled for display
}

export interface GameSession {
  gameType: GameType
  questions: any[]
  metadata: {
    subject?: string
    chapter?: string
    difficulty?: string
  }
}

export interface GameScore {
  score: number
  accuracy: number
  pointsEarned: number
  totalQuestions: number
  correctAnswers: number
  streak: number
  highScore: boolean
}

// ── Points Constants ───────────────────────────────────────
const POINTS = {
  CORRECT: 10,
  WRONG: 0,
  SPEED_BONUS: 5,
  CASE_CORRECT: 20,
  PERFECT_BUILD: 50,
  STREAK_X2: 2,
  STREAK_X3: 3,
}

// ── High Score Storage ─────────────────────────────────────
function getHighScore(gameType: GameType): number {
  return parseInt(localStorage.getItem(`pulse_highscore_${gameType}`) || '0', 10)
}

function setHighScore(gameType: GameType, score: number): boolean {
  const current = getHighScore(gameType)
  if (score > current) {
    localStorage.setItem(`pulse_highscore_${gameType}`, score.toString())
    return true
  }
  return false
}

let activeChapterId: number | null = null

// ── Question Generation via Gemini ─────────────────────────
async function fetchChapterContent(chapterId?: number): Promise<string[]> {
  try {
    const query = supabase.from('chapter_document_chunks').select('content')
    if (chapterId) {
      query.eq('chapter_id', chapterId)
    }
    query.limit(15)
    const { data, error } = await query
    if (error) throw error
    return data?.map((d: any) => d.content) || []
  } catch {
    return []
  }
}

export async function generateMemoryQuestions(chunks?: string[]): Promise<MemoryQuestion[]> {
  const context = chunks && chunks.length > 0
    ? chunks.slice(0, 8).join('\n\n---\n\n')
    : ''

  const prompt = `You are the Game Engine for a CBSE Class 10 AI learning platform.
Your role is to generate educational game content that is engaging, accurate, and aligned with CBSE (2025–2026) standards.

GAME MODE: MEMORY SPRINT
- Goal: Test recall ability. Make learning interactive and addictive.
- Rules: Keep facts concise. Questions must directly test recall. Avoid ambiguity. Keep difficulty appropriate for Class 10.
- Source: Use ONLY curriculum-aligned CBSE content. Do NOT hallucinate facts outside the syllabus.

Task: Generate 5 memory challenges based on the provided context.
Each challenge must have:
1. "fact" — a short, clear, interesting fact or concept (2-3 sentences max)
2. "questions" — 1-2 follow-up quiz questions about that fact (with 4 options each)

${context ? `Use this chapter content as the STRICT source:\n${context}` : 'Use general CBSE Class 10 Science concepts (Metals & Non-Metals, Chemical Reactions, etc.).'}

Return ONLY valid JSON (no markdown, no code blocks):
[
  {
    "fact": "...",
    "questions": [
      { "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0 }
    ]
  }
]`

  try {
    const response = await ai.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
      config: { temperature: 0.7 },
    })
    const text = (response.text ?? '').trim()
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    return JSON.parse(jsonStr) as MemoryQuestion[]
  } catch (err) {
    console.error('Failed to generate memory questions:', err)
    return getDefaultMemoryQuestions()
  }
}

export async function generateCaseQuestions(chunks?: string[]): Promise<CaseQuestion[]> {
  const context = chunks && chunks.length > 0
    ? chunks.slice(0, 8).join('\n\n---\n\n')
    : ''

  const prompt = `You are the Game Engine for a CBSE Class 10 AI learning platform.
Your role is to generate educational game content that is engaging, accurate, and aligned with CBSE (2025–2026) standards.

GAME MODE: CASE CRACKER
- Goal: Test conceptual understanding through scenarios.
- Rules: Scenario must be realistic and relevant. Questions should test application, not just memorization. Include plausible distractors. Align difficulty with Class 10 standards.
- Source: Use ONLY curriculum-aligned CBSE content. Do NOT hallucinate facts.

Task: Generate 5 real-world scenario-based questions.
Each must have:
1. "scenario" — A short realistic case (3-4 sentences)
2. "question" — An application/reasoning question about the case
3. "options" — 4 multiple choice options
4. "correctIndex" — index of correct option (0-3)
5. "explanation" — brief explanation of why it is correct (1-2 sentences)

${context ? `Base scenarios STRICTLY on this content:\n${context}` : 'Use general CBSE Class 10 Science concepts.'}

Return ONLY valid JSON (no markdown):
[
  {
    "scenario": "...",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctIndex": 0,
    "explanation": "..."
  }
]`

  try {
    const response = await ai.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
      config: { temperature: 0.7 },
    })
    const text = (response.text ?? '').trim()
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    return JSON.parse(jsonStr) as CaseQuestion[]
  } catch (err) {
    console.error('Failed to generate case questions:', err)
    return getDefaultCaseQuestions()
  }
}

export async function generateRapidQuestions(chunks?: string[]): Promise<RapidQuestion[]> {
  const context = chunks && chunks.length > 0
    ? chunks.slice(0, 10).join('\n\n---\n\n')
    : ''

  const prompt = `You are the Game Engine for a CBSE Class 10 AI learning platform.
Your role is to generate educational game content that is engaging, accurate, and aligned with CBSE (2025–2026) standards.

GAME MODE: 60-SECOND CHALLENGE
- Goal: Test speed + accuracy.
- Rules: Keep questions short, simple, and clear. Avoid long calculations. Ensure quick readability (answerable in 3-5 seconds). One correct answer only.
- Source: Use ONLY curriculum-aligned CBSE content. Do NOT hallucinate facts.

Task: Generate 15 rapid-fire quiz questions.
Each has:
1. "question" — A short, direct question (1 sentence)
2. "options" — 4 multiple choice options (short)
3. "correctIndex" — index of correct option (0-3)

${context ? `Use this STRICT content:\n${context}` : 'Use CBSE Class 10 Science concepts.'}

Return ONLY valid JSON (no markdown):
[
  { "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0 }
]`

  try {
    const response = await ai.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
      config: { temperature: 0.6 },
    })
    const text = (response.text ?? '').trim()
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    return JSON.parse(jsonStr) as RapidQuestion[]
  } catch (err) {
    console.error('Failed to generate rapid questions:', err)
    return getDefaultRapidQuestions()
  }
}

export async function generateBuildQuestions(chunks?: string[]): Promise<BuildQuestion[]> {
  const context = chunks && chunks.length > 0
    ? chunks.slice(0, 8).join('\n\n---\n\n')
    : ''

  const prompt = `You are the Game Engine for a CBSE Class 10 AI learning platform.
Your role is to generate educational game content that is engaging, accurate, and aligned with CBSE (2025–2026) standards.

GAME MODE: BUILD THE ANSWER
- Goal: Teach answer structure and logical sequencing.
- Rules: Steps must form a clear logical flow. No redundant or confusing steps. Align with CBSE marking schemes.
- Source: Use ONLY curriculum-aligned CBSE content. Do NOT hallucinate facts.

Task: Generate 5 step-ordering challenges.
Each has:
1. "prompt" — A question asking to arrange steps in the correct order (1-2 sentences)
2. "steps" — An array of 4-6 short steps in the CORRECT logical/procedural ORDER

${context ? `Use this STRICT content:\n${context}` : 'Use CBSE Class 10 Science concepts.'}

Return ONLY valid JSON (no markdown):
[
  {
    "prompt": "Arrange the steps of extracting metals from their ores in the correct order:",
    "steps": ["Mining the ore", "Crushing and grinding", "Concentration of ore", "Extraction of metal", "Refining"]
  }
]`

  try {
    const response = await ai.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
      config: { temperature: 0.6 },
    })
    const text = (response.text ?? '').trim()
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const questions = JSON.parse(jsonStr) as BuildQuestion[]
    // Add shuffled steps
    return questions.map(q => ({
      ...q,
      shuffledSteps: shuffleArray([...q.steps])
    }))
  } catch (err) {
    console.error('Failed to generate build questions:', err)
    return getDefaultBuildQuestions()
  }
}

// ── Utility Functions ──────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // Ensure shuffled is different from original
  if (JSON.stringify(shuffled) === JSON.stringify(arr) && arr.length > 1) {
    ;[shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
  }
  return shuffled
}

// ── Default Questions (Fallback) ───────────────────────────
function getDefaultMemoryQuestions(): MemoryQuestion[] {
  return [
    {
      fact: "Metals are lustrous, malleable, ductile, and are good conductors of heat and electricity. Gold and silver are the most malleable and ductile metals.",
      questions: [
        { question: "Which metals are most malleable?", options: ["A) Iron and Copper", "B) Gold and Silver", "C) Zinc and Lead", "D) Sodium and Potassium"], correctIndex: 1 }
      ]
    },
    {
      fact: "The reactivity series arranges metals in decreasing order of their reactivity. Potassium (K) is the most reactive metal, while Gold (Au) is the least reactive.",
      questions: [
        { question: "Which is the most reactive metal in the reactivity series?", options: ["A) Sodium", "B) Gold", "C) Potassium", "D) Iron"], correctIndex: 2 },
        { question: "Which metal is least reactive?", options: ["A) Silver", "B) Gold", "C) Copper", "D) Mercury"], correctIndex: 1 }
      ]
    },
    {
      fact: "Corrosion is the process where metals are slowly eaten away by the action of air, moisture, or chemicals. Rusting of iron is the most common example of corrosion.",
      questions: [
        { question: "What is rusting an example of?", options: ["A) Combustion", "B) Corrosion", "C) Reduction", "D) Displacement"], correctIndex: 1 }
      ]
    },
    {
      fact: "Ionic compounds have high melting and boiling points because of the strong electrostatic forces of attraction between opposite charges. They conduct electricity in solution or molten state.",
      questions: [
        { question: "Why do ionic compounds have high melting points?", options: ["A) Weak bonds", "B) Covalent bonds", "C) Strong electrostatic forces", "D) Metallic bonds"], correctIndex: 2 }
      ]
    },
    {
      fact: "Anodizing is a process of forming a thick oxide layer on aluminium to make it resistant to corrosion. This oxide layer can be dyed to give aluminium objects attractive colors.",
      questions: [
        { question: "What is anodizing?", options: ["A) Removing oxide layer", "B) Forming thick oxide layer on Al", "C) Melting aluminium", "D) Alloying aluminium"], correctIndex: 1 }
      ]
    }
  ]
}

function getDefaultCaseQuestions(): CaseQuestion[] {
  return [
    {
      scenario: "A food company is packaging potato chips. They notice that chips stored in regular bags become stale and taste rancid after a few weeks due to oxidation of fats by air.",
      question: "What should the company use to prevent oxidation in chip packets?",
      options: ["A) Fill packets with oxygen", "B) Flush packets with nitrogen gas", "C) Add water inside", "D) Use paper bags"],
      correctIndex: 1,
      explanation: "Nitrogen gas is used as it is an inert gas that prevents oxidation of fats, keeping chips fresh longer."
    },
    {
      scenario: "Rahul placed a copper coin in a solution of silver nitrate and observed that the solution turned blue-green after some time, while a shiny grey deposit formed on the coin.",
      question: "What type of reaction occurred here?",
      options: ["A) Combination reaction", "B) Decomposition reaction", "C) Displacement reaction", "D) Double displacement reaction"],
      correctIndex: 2,
      explanation: "Copper displaced silver from silver nitrate because copper is more reactive than silver in the reactivity series."
    },
    {
      scenario: "During a science experiment, a student dropped a small piece of sodium metal into water. The sodium moved rapidly on the water surface and caught fire, producing a hissing sound.",
      question: "Why does sodium react so vigorously with water?",
      options: ["A) Sodium is non-reactive", "B) Reaction produces hydrogen which is flammable", "C) Water is very acidic", "D) Sodium absorbs water"],
      correctIndex: 1,
      explanation: "Sodium reacts exothermically with water, producing hydrogen gas. The heat generated ignites the hydrogen, causing it to catch fire."
    },
    {
      scenario: "A gold jeweler mixed gold with copper to make ornaments. The customer noticed the jewelry was harder than pure gold but had a slightly reddish tint.",
      question: "What is this mixture of metals called?",
      options: ["A) Amalgam", "B) Alloy", "C) Solution", "D) Compound"],
      correctIndex: 1,
      explanation: "A homogeneous mixture of two or more metals is called an alloy. Gold-copper alloy is harder than pure gold."
    },
    {
      scenario: "Iron gates in a house near the sea corroded much faster than identical gates at a house in a dry desert region, despite both being outdoors.",
      question: "What factor accelerated corrosion near the sea?",
      options: ["A) Sunlight", "B) Salt and moisture in air", "C) Sand particles", "D) Wind speed"],
      correctIndex: 1,
      explanation: "Salty, moist air near the sea accelerates corrosion because salt acts as an electrolyte, speeding up the electrochemical process of rusting."
    }
  ]
}

function getDefaultRapidQuestions(): RapidQuestion[] {
  return [
    { question: "Which gas is produced when metals react with acids?", options: ["A) Oxygen", "B) Nitrogen", "C) Hydrogen", "D) Carbon dioxide"], correctIndex: 2 },
    { question: "What is the chemical formula of rust?", options: ["A) FeO", "B) Fe₂O₃·xH₂O", "C) FeCl₂", "D) FeS"], correctIndex: 1 },
    { question: "Which metal is stored in kerosene?", options: ["A) Copper", "B) Gold", "C) Sodium", "D) Iron"], correctIndex: 2 },
    { question: "Galvanisation uses which metal coating?", options: ["A) Copper", "B) Silver", "C) Zinc", "D) Tin"], correctIndex: 2 },
    { question: "Which is the hardest natural substance?", options: ["A) Gold", "B) Iron", "C) Diamond", "D) Platinum"], correctIndex: 2 },
    { question: "Aqua regia is a mixture of which acids?", options: ["A) HCl + H₂SO₄", "B) HNO₃ + HCl", "C) HCl + H₃PO₄", "D) HNO₃ + H₂SO₄"], correctIndex: 1 },
    { question: "Which property allows metals to be drawn into wires?", options: ["A) Malleability", "B) Ductility", "C) Sonority", "D) Lustre"], correctIndex: 1 },
    { question: "What is the valency of aluminium?", options: ["A) 1", "B) 2", "C) 3", "D) 4"], correctIndex: 2 },
    { question: "Which non-metal is a good conductor of electricity?", options: ["A) Sulphur", "B) Phosphorus", "C) Graphite", "D) Bromine"], correctIndex: 2 },
    { question: "Mercury is a metal that is _____ at room temperature.", options: ["A) Solid", "B) Gas", "C) Liquid", "D) Plasma"], correctIndex: 2 },
    { question: "Which metal is used in thermite welding?", options: ["A) Copper", "B) Iron", "C) Aluminium", "D) Zinc"], correctIndex: 2 },
    { question: "NaCl is an example of:", options: ["A) Covalent compound", "B) Ionic compound", "C) Metallic bond", "D) Hydrogen bond"], correctIndex: 1 },
    { question: "Which metal reacts with cold water?", options: ["A) Iron", "B) Copper", "C) Sodium", "D) Zinc"], correctIndex: 2 },
    { question: "Cinnabar is an ore of:", options: ["A) Copper", "B) Mercury", "C) Zinc", "D) Iron"], correctIndex: 1 },
    { question: "Brass is an alloy of:", options: ["A) Cu + Sn", "B) Cu + Zn", "C) Fe + C", "D) Al + Cu"], correctIndex: 1 }
  ]
}

function getDefaultBuildQuestions(): BuildQuestion[] {
  const questions = [
    {
      prompt: "Arrange the steps for extracting metals from their ores:",
      steps: ["Mining the ore from earth", "Crushing and grinding the ore", "Concentration/Enrichment of ore", "Reduction to obtain metal", "Refining the metal"]
    },
    {
      prompt: "Arrange the steps of formation of an ionic bond in NaCl:",
      steps: ["Sodium atom loses one electron", "Sodium becomes Na⁺ ion", "Chlorine atom gains that electron", "Chlorine becomes Cl⁻ ion", "Electrostatic attraction forms NaCl"]
    },
    {
      prompt: "Arrange the metals from most reactive to least reactive:",
      steps: ["Potassium (K)", "Sodium (Na)", "Aluminium (Al)", "Iron (Fe)", "Copper (Cu)", "Gold (Au)"]
    },
    {
      prompt: "Arrange the steps in the process of galvanisation:",
      steps: ["Clean the iron/steel surface", "Apply flux to the surface", "Dip the iron into molten zinc", "Remove and allow zinc coating to solidify", "Iron is now protected from corrosion"]
    },
    {
      prompt: "Arrange the steps of electrolytic refining of copper:",
      steps: ["Impure copper is made the anode", "Pure copper strip is the cathode", "Acidified copper sulphate is the electrolyte", "Current is passed through the solution", "Pure copper deposits on the cathode"]
    }
  ]
  return questions.map(q => ({
    ...q,
    shuffledSteps: shuffleArray([...q.steps])
  }))
}

// ── Render Functions ───────────────────────────────────────

export function renderGamesHub(): string {
  return `
    <div class="games-hub">
      <div class="games-hub-header">
        <button class="ao-back-btn" id="gamesBackBtn">
          <span class="material-symbols-outlined">arrow_back</span>
          Study Tools
        </button>
        <div class="games-hub-title-wrap">
          <h1 class="games-hub-title">
            <span class="material-symbols-outlined games-hub-icon">sports_esports</span>
            Games Hub
          </h1>
          <p class="games-hub-subtitle">Learn through play — earn points, break records, become unstoppable</p>
        </div>
      </div>

      <div class="games-hub-grid">
        <!-- Memory Sprint -->
        <div class="game-card memory-card" data-game="memory">
          <div class="game-card-glow"></div>
          <div class="game-card-content">
            <div class="game-card-icon memory">
              <span class="material-symbols-outlined">psychology</span>
            </div>
            <div class="game-card-badge">Quick Recall</div>
            <h3>Memory Sprint</h3>
            <p>Test your memory with quick recall challenges. See a fact, then prove you remember it!</p>
            <div class="game-card-meta">
              <span class="game-difficulty easy">Easy-Medium</span>
              <span class="game-highscore" id="hsMemory">
                <span class="material-symbols-outlined">emoji_events</span>
                ${getHighScore('memory')}
              </span>
            </div>
            <button class="game-play-btn memory">
              <span class="material-symbols-outlined">play_arrow</span>
              Play Now
            </button>
          </div>
        </div>

        <!-- Case Cracker -->
        <div class="game-card case-card" data-game="case">
          <div class="game-card-glow"></div>
          <div class="game-card-content">
            <div class="game-card-icon case">
              <span class="material-symbols-outlined">search</span>
            </div>
            <div class="game-card-badge">Scenario Based</div>
            <h3>Case Cracker</h3>
            <p>Solve real-world scenarios using science concepts. Think like a detective!</p>
            <div class="game-card-meta">
              <span class="game-difficulty medium">Medium</span>
              <span class="game-highscore" id="hsCase">
                <span class="material-symbols-outlined">emoji_events</span>
                ${getHighScore('case')}
              </span>
            </div>
            <button class="game-play-btn case">
              <span class="material-symbols-outlined">play_arrow</span>
              Play Now
            </button>
          </div>
        </div>

        <!-- 60-Second Challenge -->
        <div class="game-card rapid-card" data-game="rapid">
          <div class="game-card-glow"></div>
          <div class="game-card-content">
            <div class="game-card-icon rapid">
              <span class="material-symbols-outlined">timer</span>
            </div>
            <div class="game-card-badge">Speed Round</div>
            <h3>60-Second Challenge</h3>
            <p>Answer as many questions as you can in 60 seconds. Race against the clock!</p>
            <div class="game-card-meta">
              <span class="game-difficulty hard">High Intensity</span>
              <span class="game-highscore" id="hsRapid">
                <span class="material-symbols-outlined">emoji_events</span>
                ${getHighScore('rapid')}
              </span>
            </div>
            <button class="game-play-btn rapid">
              <span class="material-symbols-outlined">play_arrow</span>
              Play Now
            </button>
          </div>
        </div>

        <!-- Build the Answer -->
        <div class="game-card build-card" data-game="build">
          <div class="game-card-glow"></div>
          <div class="game-card-content">
            <div class="game-card-icon build">
              <span class="material-symbols-outlined">construction</span>
            </div>
            <div class="game-card-badge">Order & Logic</div>
            <h3>Build the Answer</h3>
            <p>Arrange steps in the correct order to form the perfect answer. Drag and drop!</p>
            <div class="game-card-meta">
              <span class="game-difficulty medium">Medium-Hard</span>
              <span class="game-highscore" id="hsBuild">
                <span class="material-symbols-outlined">emoji_events</span>
                ${getHighScore('build')}
              </span>
            </div>
            <button class="game-play-btn build">
              <span class="material-symbols-outlined">play_arrow</span>
              Play Now
            </button>
          </div>
        </div>
      </div>
    </div>
  `
}

// ── Game Screen Renderer ───────────────────────────────────
export function renderGameScreen(gameType: GameType, container: HTMLElement, onBack: () => void) {
  const titles: Record<GameType, string> = {
    memory: 'Memory Sprint',
    case: 'Case Cracker',
    rapid: '60-Second Challenge',
    build: 'Build the Answer',
  }
  const icons: Record<GameType, string> = {
    memory: 'psychology',
    case: 'search',
    rapid: 'timer',
    build: 'construction',
  }

  container.innerHTML = `
    <div class="game-screen ${gameType}-screen">
      <div class="game-header">
        <div class="game-header-left">
          <button class="game-back-btn" id="gameBackBtn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="game-header-icon ${gameType}">
            <span class="material-symbols-outlined">${icons[gameType]}</span>
          </div>
          <h2>${titles[gameType]}</h2>
        </div>
        <div class="game-header-right">
          <div class="game-streak-badge" id="gameStreakBadge" style="display:none">
            <span class="material-symbols-outlined">local_fire_department</span>
            <span id="gameStreakCount">0</span>🔥
          </div>
          <div class="game-points-badge" id="gamePointsBadge">
            <span class="material-symbols-outlined">star</span>
            <span id="gamePointsCount">0</span> pts
          </div>
        </div>
      </div>
      <div class="game-body" id="gameBody">
        <div class="game-loading">
          <div class="game-loading-spinner"></div>
          <p>Curating your game...</p>

        </div>
      </div>
    </div>
  `

  document.getElementById('gameBackBtn')?.addEventListener('click', onBack)

  // Load and start the game
  loadGame(gameType, container)
}

// ── Game Loaders ───────────────────────────────────────────
async function loadGame(gameType: GameType, container: HTMLElement) {
  const gameBody = document.getElementById('gameBody')!

  try {
    const chunks = await fetchChapterContent(activeChapterId ?? undefined)

    switch (gameType) {
      case 'memory':
        const memoryQs = await generateMemoryQuestions(chunks)
        if (memoryQs.length === 0) throw new Error('NO_QUESTIONS')
        startMemorySprint(gameBody, memoryQs, container)
        break
      case 'case':
        const caseQs = await generateCaseQuestions(chunks)
        if (caseQs.length === 0) throw new Error('NO_QUESTIONS')
        startCaseCracker(gameBody, caseQs, container)
        break
      case 'rapid':
        const rapidQs = await generateRapidQuestions(chunks)
        if (rapidQs.length === 0) throw new Error('NO_QUESTIONS')
        startRapidFire(gameBody, rapidQs, container)
        break
      case 'build':
        const buildQs = await generateBuildQuestions(chunks)
        if (buildQs.length === 0) throw new Error('NO_QUESTIONS')
        startBuildAnswer(gameBody, buildQs, container)
        break
    }
  } catch (err: any) {
    gameBody.innerHTML = `
      <div class="game-error">
        <span class="material-symbols-outlined">error_outline</span>
        <h3>No questions available</h3>
        <p>${err.message === 'NO_QUESTIONS' ? 'No questions available. Try another topic.' : 'Something went wrong. Please try again.'}</p>
        <button class="game-retry-btn" id="gameRetryBtn">
          <span class="material-symbols-outlined">refresh</span>
          Retry
        </button>
      </div>
    `
    document.getElementById('gameRetryBtn')?.addEventListener('click', () => {
      gameBody.innerHTML = `
        <div class="game-loading">
          <div class="game-loading-spinner"></div>
          <p>Curating your game...</p>

        </div>
      `
      loadGame(gameType as GameType, container)
    })
  }
}

// ── Points UI Update ───────────────────────────────────────
function updatePointsDisplay(points: number) {
  const el = document.getElementById('gamePointsCount')
  if (el) {
    el.textContent = points.toString()
    el.parentElement?.classList.add('points-bump')
    setTimeout(() => el.parentElement?.classList.remove('points-bump'), 300)
  }
}

function updateStreakDisplay(streak: number) {
  const badge = document.getElementById('gameStreakBadge')
  const count = document.getElementById('gameStreakCount')
  if (badge && count) {
    if (streak >= 2) {
      badge.style.display = 'flex'
      count.textContent = streak.toString()
      badge.classList.add('streak-bump')
      setTimeout(() => badge.classList.remove('streak-bump'), 400)
    } else {
      badge.style.display = 'none'
    }
  }
}

function calculatePoints(basePoints: number, streak: number, isSpeedBonus: boolean): number {
  let total = basePoints
  if (isSpeedBonus) total += POINTS.SPEED_BONUS
  if (streak >= 5) total *= POINTS.STREAK_X3
  else if (streak >= 3) total *= POINTS.STREAK_X2
  return total
}

async function savePulsePoints(gameType: GameType, points: number, accuracy: number, maxStreak: number) {
  if (points <= 0) return
  
  try {
    const userId = localStorage.getItem('pulse_user_id')
    if (!userId) {
      console.warn('No user ID found in localStorage, cannot save Pulse Points.')
      return
    }

    // 1. Insert into game_scores table
    const { error: insertError } = await supabase.from('game_scores').insert({
      user_id: userId,
      game_name: gameType,
      points: points,
      max_streak: maxStreak,
      accuracy: accuracy
    })
    
    if (insertError) {
      console.error('Error inserting game score:', insertError)
      return
    }

    // 2. Increment total_pulse_points in profiles
    const { data: profile, error: selectError } = await supabase.from('profiles').select('total_pulse_points').eq('id', userId).single()
    if (selectError) {
      console.error('Error fetching profile points:', selectError)
      return
    }
    
    const currentPoints = profile?.total_pulse_points || 0
    const { error: updateError } = await supabase.from('profiles').update({ total_pulse_points: currentPoints + points }).eq('id', userId)
    
    if (updateError) {
      console.error('Error updating pulse points:', updateError)
    } else {
      console.log(`Successfully saved ${points} Pulse Points!`)
    }

  } catch (error) {
    console.error('Failed to save Pulse Points:', error)
  }
}

// ── End Screen ─────────────────────────────────────────────
function showEndScreen(
  gameBody: HTMLElement,
  gameType: GameType,
  totalQuestions: number,
  correctAnswers: number,
  totalPoints: number,
  container: HTMLElement,
  maxStreak: number
) {
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  const isNewHigh = setHighScore(gameType, totalPoints)
  const titles: Record<GameType, string> = {
    memory: 'Memory Sprint',
    case: 'Case Cracker',
    rapid: '60-Second Challenge',
    build: 'Build the Answer',
  }

  let grade = ''
  let gradeClass = ''
  if (accuracy >= 90) { grade = 'Outstanding!'; gradeClass = 'grade-outstanding' }
  else if (accuracy >= 70) { grade = 'Great Job!'; gradeClass = 'grade-great' }
  else if (accuracy >= 50) { grade = 'Good Effort!'; gradeClass = 'grade-good' }
  else { grade = 'Keep Practicing!'; gradeClass = 'grade-practice' }

  // Fire and forget function to track pulse points
  savePulsePoints(gameType, totalPoints, accuracy, maxStreak)

  gameBody.innerHTML = `
    <div class="game-end-screen">
      ${isNewHigh ? `
        <div class="game-new-highscore">
          <span class="material-symbols-outlined">celebration</span>
          <span>New High Score! 🎉</span>
        </div>
      ` : ''}
      <div class="game-end-grade ${gradeClass}">${grade}</div>
      <h2 class="game-end-title">${titles[gameType]} Complete</h2>
      
      <div class="game-end-stats">
        <div class="game-end-stat">
          <div class="game-end-stat-value">${totalPoints}</div>
          <div class="game-end-stat-label">Pulse Points</div>
        </div>
        <div class="game-end-stat">
          <div class="game-end-stat-value">${accuracy}%</div>
          <div class="game-end-stat-label">Accuracy</div>
        </div>
        <div class="game-end-stat">
          <div class="game-end-stat-value">${correctAnswers}/${totalQuestions}</div>
          <div class="game-end-stat-label">Correct</div>
        </div>
        <div class="game-end-stat">
          <div class="game-end-stat-value">${maxStreak}x</div>
          <div class="game-end-stat-label">Best Streak</div>
        </div>
      </div>

      <div class="game-end-actions">
        <button class="game-play-again-btn" id="gamePlayAgainBtn">
          <span class="material-symbols-outlined">replay</span>
          Play Again
        </button>
        <button class="game-back-games-btn" id="gameBackGamesBtn">
          <span class="material-symbols-outlined">grid_view</span>
          Back to Games
        </button>
      </div>
    </div>
  `

  document.getElementById('gamePlayAgainBtn')?.addEventListener('click', () => {
    const gameBodyEl = document.getElementById('gameBody')
    if (gameBodyEl) {
      gameBodyEl.innerHTML = `
        <div class="game-loading">
          <div class="game-loading-spinner"></div>
          <p>Curating your game...</p>

        </div>
      `
      // Reset points display
      updatePointsDisplay(0)
      updateStreakDisplay(0)
      loadGame(gameType, container)
    }
  })

  document.getElementById('gameBackGamesBtn')?.addEventListener('click', () => {
    document.getElementById('gameBackBtn')?.click()
  })
}

// ══════════════════════════════════════════════════════════
// GAME 1: MEMORY SPRINT
// ══════════════════════════════════════════════════════════
function startMemorySprint(gameBody: HTMLElement, questions: MemoryQuestion[], container: HTMLElement) {
  let currentIdx = 0
  let totalPoints = 0
  let streak = 0
  let maxStreak = 0
  let correctAnswers = 0
  let totalQuestionsAsked = 0

  function showFact() {
    if (currentIdx >= questions.length) {
      showEndScreen(gameBody, 'memory', totalQuestionsAsked, correctAnswers, totalPoints, container, maxStreak)
      return
    }

    const q = questions[currentIdx]
    let countdown = 5

    gameBody.innerHTML = `
      <div class="memory-phase fact-phase">
        <div class="memory-progress">
          <div class="memory-progress-text">Round ${currentIdx + 1} of ${questions.length}</div>
          <div class="memory-progress-bar">
            <div class="memory-progress-fill" style="width: ${((currentIdx) / questions.length) * 100}%"></div>
          </div>
        </div>
        <div class="memory-instruction">
          <span class="material-symbols-outlined">visibility</span>
          Memorize this fact!
        </div>
        <div class="memory-fact-card">
          <div class="memory-fact-text">${q.fact}</div>
        </div>
        <div class="memory-countdown">
          <div class="memory-countdown-circle" id="countdownCircle">
            <span id="countdownNum">${countdown}</span>
          </div>
          <p>seconds remaining</p>
        </div>
      </div>
    `

    const countdownEl = document.getElementById('countdownNum')!
    const circle = document.getElementById('countdownCircle')!

    const timer = setInterval(() => {
      countdown--
      if (countdownEl) countdownEl.textContent = countdown.toString()
      circle.style.setProperty('--progress', `${((5 - countdown) / 5) * 100}%`)
      if (countdown <= 0) {
        clearInterval(timer)
        showQuestions(q)
      }
    }, 1000)
  }

  function showQuestions(memQ: MemoryQuestion) {
    let qIdx = 0

    function showSingleQuestion() {
      if (qIdx >= memQ.questions.length) {
        currentIdx++
        showFact()
        return
      }

      const q = memQ.questions[qIdx]
      totalQuestionsAsked++
      const startTime = Date.now()

      gameBody.innerHTML = `
        <div class="memory-phase question-phase">
          <div class="memory-progress">
            <div class="memory-progress-text">Round ${currentIdx + 1} of ${questions.length} — Question ${qIdx + 1}</div>
            <div class="memory-progress-bar">
              <div class="memory-progress-fill" style="width: ${((currentIdx) / questions.length) * 100}%"></div>
            </div>
          </div>
          <div class="memory-instruction recall">
            <span class="material-symbols-outlined">quiz</span>
            What do you remember?
          </div>
          <div class="memory-question">${q.question}</div>
          <div class="memory-options">
            ${q.options.map((opt, i) => `
              <button class="memory-option-btn" data-idx="${i}">${opt}</button>
            `).join('')}
          </div>
        </div>
      `

      gameBody.querySelectorAll('.memory-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const selected = parseInt((btn as HTMLElement).dataset.idx || '0')
          const isCorrect = selected === q.correctIndex
          const isSpeed = (Date.now() - startTime) < 5000

          // Disable all buttons
          gameBody.querySelectorAll('.memory-option-btn').forEach(b => {
            (b as HTMLButtonElement).disabled = true
            const bIdx = parseInt((b as HTMLElement).dataset.idx || '-1')
            if (bIdx === q.correctIndex) b.classList.add('correct')
            if (bIdx === selected && !isCorrect) b.classList.add('wrong')
          })

          if (isCorrect) {
            correctAnswers++
            streak++
            if (streak > maxStreak) maxStreak = streak
            const pts = calculatePoints(POINTS.CORRECT, streak, isSpeed)
            totalPoints += pts
          } else {
            streak = 0
          }

          updatePointsDisplay(totalPoints)
          updateStreakDisplay(streak)

          setTimeout(() => {
            qIdx++
            showSingleQuestion()
          }, 1200)
        })
      })
    }

    showSingleQuestion()
  }

  showFact()
}

// ══════════════════════════════════════════════════════════
// GAME 2: CASE CRACKER
// ══════════════════════════════════════════════════════════
function startCaseCracker(gameBody: HTMLElement, questions: CaseQuestion[], container: HTMLElement) {
  let currentIdx = 0
  let totalPoints = 0
  let streak = 0
  let maxStreak = 0
  let correctAnswers = 0

  function showCase() {
    if (currentIdx >= questions.length) {
      showEndScreen(gameBody, 'case', questions.length, correctAnswers, totalPoints, container, maxStreak)
      return
    }

    const q = questions[currentIdx]
    const startTime = Date.now()

    gameBody.innerHTML = `
      <div class="case-phase">
        <div class="case-progress">
          <div class="case-progress-text">Case ${currentIdx + 1} of ${questions.length}</div>
          <div class="case-progress-bar">
            <div class="case-progress-fill" style="width: ${((currentIdx) / questions.length) * 100}%"></div>
          </div>
        </div>
        <div class="case-scenario-card">
          <div class="case-label">
            <span class="material-symbols-outlined">description</span>
            Case File
          </div>
          <p class="case-scenario-text">${q.scenario}</p>
        </div>
        <div class="case-question">${q.question}</div>
        <div class="case-options">
          ${q.options.map((opt, i) => `
            <button class="case-option-btn" data-idx="${i}">${opt}</button>
          `).join('')}
        </div>
        <div class="case-feedback" id="caseFeedback" style="display:none"></div>
      </div>
    `

    gameBody.querySelectorAll('.case-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = parseInt((btn as HTMLElement).dataset.idx || '0')
        const isCorrect = selected === q.correctIndex
        const isSpeed = (Date.now() - startTime) < 10000
        const feedback = document.getElementById('caseFeedback')!

        // Disable all buttons
        gameBody.querySelectorAll('.case-option-btn').forEach(b => {
          (b as HTMLButtonElement).disabled = true
          const bIdx = parseInt((b as HTMLElement).dataset.idx || '-1')
          if (bIdx === q.correctIndex) b.classList.add('correct')
          if (bIdx === selected && !isCorrect) b.classList.add('wrong')
        })

        if (isCorrect) {
          correctAnswers++
          streak++
          if (streak > maxStreak) maxStreak = streak
          const pts = calculatePoints(POINTS.CASE_CORRECT, streak, isSpeed)
          totalPoints += pts
          feedback.innerHTML = `
            <div class="case-feedback-correct">
              <span class="material-symbols-outlined">check_circle</span>
              <strong>Correct!</strong> ${q.explanation}
            </div>
          `
        } else {
          streak = 0
          feedback.innerHTML = `
            <div class="case-feedback-wrong">
              <span class="material-symbols-outlined">cancel</span>
              <strong>Incorrect.</strong> ${q.explanation}
            </div>
          `
        }

        feedback.style.display = 'block'
        updatePointsDisplay(totalPoints)
        updateStreakDisplay(streak)

        setTimeout(() => {
          currentIdx++
          showCase()
        }, 2500)
      })
    })
  }

  showCase()
}

// ══════════════════════════════════════════════════════════
// GAME 3: 60-SECOND CHALLENGE
// ══════════════════════════════════════════════════════════
function startRapidFire(gameBody: HTMLElement, questions: RapidQuestion[], container: HTMLElement) {
  let currentIdx = 0
  let totalPoints = 0
  let streak = 0
  let maxStreak = 0
  let correctAnswers = 0
  let timeLeft = 60
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let answered = 0

  function showQuestion() {
    if (currentIdx >= questions.length || timeLeft <= 0) {
      if (timerInterval) clearInterval(timerInterval)
      showEndScreen(gameBody, 'rapid', answered, correctAnswers, totalPoints, container, maxStreak)
      return
    }

    const q = questions[currentIdx]

    gameBody.innerHTML = `
      <div class="rapid-phase">
        <div class="rapid-timer-bar">
          <div class="rapid-timer-fill" id="rapidTimerFill" style="width: ${(timeLeft / 60) * 100}%"></div>
        </div>
        <div class="rapid-top-row">
          <div class="rapid-timer" id="rapidTimer">
            <span class="material-symbols-outlined">timer</span>
            <span id="rapidTimeLeft">${timeLeft}s</span>
          </div>
          <div class="rapid-counter">
            Q${currentIdx + 1}
          </div>
        </div>
        <div class="rapid-question">${q.question}</div>
        <div class="rapid-options">
          ${q.options.map((opt, i) => `
            <button class="rapid-option-btn" data-idx="${i}">${opt}</button>
          `).join('')}
        </div>
      </div>
    `

    // Start timer on first question
    if (timerInterval === null) {
      timerInterval = setInterval(() => {
        timeLeft--
        const timeEl = document.getElementById('rapidTimeLeft')
        const fillEl = document.getElementById('rapidTimerFill')
        if (timeEl) timeEl.textContent = `${timeLeft}s`
        if (fillEl) fillEl.style.width = `${(timeLeft / 60) * 100}%`
        
        if (timeLeft <= 10) {
          const timerDiv = document.getElementById('rapidTimer')
          if (timerDiv) timerDiv.classList.add('urgent')
        }
        
        if (timeLeft <= 0) {
          if (timerInterval) clearInterval(timerInterval)
          showEndScreen(gameBody, 'rapid', answered, correctAnswers, totalPoints, container, maxStreak)
        }
      }, 1000)
    }

    gameBody.querySelectorAll('.rapid-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = parseInt((btn as HTMLElement).dataset.idx || '0')
        const isCorrect = selected === q.correctIndex
        answered++

        // Disable all
        gameBody.querySelectorAll('.rapid-option-btn').forEach(b => {
          (b as HTMLButtonElement).disabled = true
          const bIdx = parseInt((b as HTMLElement).dataset.idx || '-1')
          if (bIdx === q.correctIndex) b.classList.add('correct')
          if (bIdx === selected && !isCorrect) b.classList.add('wrong')
        })

        if (isCorrect) {
          correctAnswers++
          streak++
          if (streak > maxStreak) maxStreak = streak
          const pts = calculatePoints(POINTS.CORRECT, streak, true)
          totalPoints += pts
        } else {
          streak = 0
        }

        updatePointsDisplay(totalPoints)
        updateStreakDisplay(streak)

        setTimeout(() => {
          currentIdx++
          showQuestion()
        }, 600)
      })
    })
  }

  showQuestion()
}

// ══════════════════════════════════════════════════════════
// GAME 4: BUILD THE ANSWER
// ══════════════════════════════════════════════════════════
function startBuildAnswer(gameBody: HTMLElement, questions: BuildQuestion[], container: HTMLElement) {
  let currentIdx = 0
  let totalPoints = 0
  let streak = 0
  let maxStreak = 0
  let correctAnswers = 0

  function showBuild() {
    if (currentIdx >= questions.length) {
      showEndScreen(gameBody, 'build', questions.length, correctAnswers, totalPoints, container, maxStreak)
      return
    }

    const q = questions[currentIdx]
    let userOrder: string[] = []
    let availableSteps = [...q.shuffledSteps]

    renderBuildUI()

    function renderBuildUI() {
      gameBody.innerHTML = `
        <div class="build-phase">
          <div class="build-progress">
            <div class="build-progress-text">Challenge ${currentIdx + 1} of ${questions.length}</div>
            <div class="build-progress-bar">
              <div class="build-progress-fill" style="width: ${((currentIdx) / questions.length) * 100}%"></div>
            </div>
          </div>
          <div class="build-prompt">${q.prompt}</div>
          
          <div class="build-zones">
            <div class="build-answer-zone" id="buildAnswerZone">
              <div class="build-zone-label">
                <span class="material-symbols-outlined">format_list_numbered</span>
                Your Answer (click steps in order)
              </div>
              <div class="build-answer-list" id="buildAnswerList">
                ${userOrder.length === 0 ? '<div class="build-empty-hint">Click steps below to add them here in order</div>' : ''}
                ${userOrder.map((step, i) => `
                  <div class="build-answer-item" data-step="${step}">
                    <span class="build-step-num">${i + 1}</span>
                    <span class="build-step-text">${step}</span>
                    <button class="build-remove-btn" data-remove="${step}">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="build-source-zone" id="buildSourceZone">
              <div class="build-zone-label">
                <span class="material-symbols-outlined">inventory_2</span>
                Available Steps
              </div>
              <div class="build-source-list" id="buildSourceList">
                ${availableSteps.map(step => `
                  <button class="build-source-item" data-step="${step}">${step}</button>
                `).join('')}
                ${availableSteps.length === 0 ? '<div class="build-all-placed">All steps placed! ✓</div>' : ''}
              </div>
            </div>
          </div>

          <div class="build-actions">
            <button class="build-reset-btn" id="buildResetBtn">
              <span class="material-symbols-outlined">restart_alt</span>
              Reset
            </button>
            <button class="build-submit-btn" id="buildSubmitBtn" ${userOrder.length !== q.steps.length ? 'disabled' : ''}>
              <span class="material-symbols-outlined">check</span>
              Check Answer
            </button>
          </div>
        </div>
      `

      // Wire source items
      gameBody.querySelectorAll('.build-source-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const step = (btn as HTMLElement).dataset.step!
          userOrder.push(step)
          availableSteps = availableSteps.filter(s => s !== step)
          renderBuildUI()
        })
      })

      // Wire remove buttons
      gameBody.querySelectorAll('.build-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const step = (btn as HTMLElement).dataset.remove!
          userOrder = userOrder.filter(s => s !== step)
          availableSteps.push(step)
          renderBuildUI()
        })
      })

      // Wire reset
      document.getElementById('buildResetBtn')?.addEventListener('click', () => {
        userOrder = []
        availableSteps = [...q.shuffledSteps]
        renderBuildUI()
      })

      // Wire submit
      document.getElementById('buildSubmitBtn')?.addEventListener('click', () => {
        checkBuildAnswer()
      })
    }

    function checkBuildAnswer() {
      const isCorrect = JSON.stringify(userOrder) === JSON.stringify(q.steps)
      let matchCount = 0
      for (let i = 0; i < q.steps.length; i++) {
        if (userOrder[i] === q.steps[i]) matchCount++
      }
      const matchRatio = matchCount / q.steps.length

      let resultType: 'perfect' | 'almost' | 'incorrect'
      if (isCorrect) {
        resultType = 'perfect'
        correctAnswers++
        streak++
        if (streak > maxStreak) maxStreak = streak
        totalPoints += POINTS.PERFECT_BUILD
      } else if (matchRatio >= 0.5) {
        resultType = 'almost'
        correctAnswers += 0.5 // partial credit for stats
        totalPoints += Math.round(POINTS.CORRECT * matchRatio)
        streak = 0
      } else {
        resultType = 'incorrect'
        streak = 0
      }

      updatePointsDisplay(totalPoints)
      updateStreakDisplay(streak)

      // Show result
      const resultLabels = {
        perfect: { text: 'Perfect! 🎉', class: 'build-perfect' },
        almost: { text: 'Almost Correct! 🤔', class: 'build-almost' },
        incorrect: { text: 'Incorrect ❌', class: 'build-incorrect' },
      }

      gameBody.innerHTML = `
        <div class="build-result">
          <div class="build-result-badge ${resultLabels[resultType].class}">
            ${resultLabels[resultType].text}
          </div>

          <div class="build-result-comparison">
            <div class="build-result-col">
              <h4>Your Order</h4>
              ${userOrder.map((step, i) => {
                const isStepCorrect = step === q.steps[i]
                return `<div class="build-result-step ${isStepCorrect ? 'step-correct' : 'step-wrong'}">
                  <span class="build-step-num">${i + 1}</span>
                  <span>${step}</span>
                  <span class="material-symbols-outlined">${isStepCorrect ? 'check' : 'close'}</span>
                </div>`
              }).join('')}
            </div>
            <div class="build-result-col correct-col">
              <h4>Correct Order</h4>
              ${q.steps.map((step, i) => `
                <div class="build-result-step step-correct">
                  <span class="build-step-num">${i + 1}</span>
                  <span>${step}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <button class="build-next-btn" id="buildNextBtn">
            ${currentIdx + 1 < questions.length ? 'Next Challenge →' : 'See Results'}
          </button>
        </div>
      `

      document.getElementById('buildNextBtn')?.addEventListener('click', () => {
        currentIdx++
        showBuild()
      })
    }
  }

  showBuild()
}

// ── Bind Hub Events ────────────────────────────────────────
async function showGameConfigDialog(gameType: string, onConfirm: (chapterId: number | null) => void) {
  document.getElementById('gameConfigOverlay')?.remove()

  const overlay = document.createElement('div')
  overlay.id = 'gameConfigOverlay'
  overlay.className = 'modal-overlay visible'

  const { data: subjects } = await supabase.from('subjects').select('*, chapters(*)')
  if (!subjects || subjects.length === 0) return

  const subjectOptions = subjects.map(s => `<option value="${s.id}">${s.title}</option>`).join('')

  // Human readable title
  const typeDisplay = gameType === 'memory' ? 'Memory Sprint' : 
                      gameType === 'case' ? 'Case Cracker' : 
                      gameType === 'rapid' ? '60-Second Challenge' : 'Build the Answer'

  overlay.innerHTML = `
    <div class="modal-content game-config-modal" style="max-width: 450px; padding: 24px;">
      <div class="modal-header" style="margin-bottom: 20px;">
        <h2>Select Topic</h2>
        <button class="modal-close" id="closeConfigDialog">&times;</button>
      </div>
      <div class="game-config-body">
        <p style="margin-bottom: 24px; color: var(--on-surface-variant);">Choose what you want to be tested on for <strong>${typeDisplay}</strong>:</p>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 700; margin-bottom: 8px; font-size: 0.95rem;">Subject</label>
          <select id="gameSubjectSelect" style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--surface-container-high); background: var(--surface-container-lowest); color: var(--on-surface); font-family: inherit; font-size: 0.95rem; cursor: pointer;">
            ${subjectOptions}
          </select>
        </div>

        <div style="margin-bottom: 28px;">
          <label style="display: block; font-weight: 700; margin-bottom: 8px; font-size: 0.95rem;">Chapter</label>
          <select id="gameChapterSelect" style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--surface-container-high); background: var(--surface-container-lowest); color: var(--on-surface); font-family: inherit; font-size: 0.95rem; cursor: pointer;">
            <!-- Populated via JS -->
          </select>
        </div>

        <div style="text-align: right;">
          <button class="game-play-again-btn" id="confirmConfigBtn" style="width:100%; font-size: 1rem;">
            <span class="material-symbols-outlined">play_arrow</span> Play Now
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const subjectSelect = document.getElementById('gameSubjectSelect') as HTMLSelectElement
  const chapterSelect = document.getElementById('gameChapterSelect') as HTMLSelectElement
  const confirmBtn = document.getElementById('confirmConfigBtn') as HTMLButtonElement

  function populateChapters(subjectId: string) {
    const subject = subjects!.find(s => s.id === subjectId)
    if (!subject) return

    let chapterOptions = `<option value="all">Entire Syllabus (All Chapters)</option>`
    const chapters = (subject.chapters as any[]).sort((a,b) => a.chapter_number - b.chapter_number)
    
    chapters.forEach(c => {
      chapterOptions += `<option value="${c.id}">Ch ${c.chapter_number}: ${c.title}</option>`
    })
    chapterSelect.innerHTML = chapterOptions
  }

  populateChapters(subjectSelect.value)

  subjectSelect.addEventListener('change', (e) => populateChapters((e.target as HTMLSelectElement).value))

  document.getElementById('closeConfigDialog')?.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

  confirmBtn.addEventListener('click', () => {
    const chapId = chapterSelect.value
    const selectedChapterId = chapId === 'all' ? null : parseInt(chapId, 10)
    overlay.remove()
    onConfirm(selectedChapterId)
  })
}

export function bindGamesHubEvents(container: HTMLElement, onBack: () => void, onGameStart: (gameType: GameType) => void) {
  document.getElementById('gamesBackBtn')?.addEventListener('click', onBack)

  container.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const gameType = (card as HTMLElement).dataset.game as GameType
      if (gameType) {
        showGameConfigDialog(gameType, (chapId) => {
          activeChapterId = chapId
          onGameStart(gameType)
        })
      }
    })
  })
}
