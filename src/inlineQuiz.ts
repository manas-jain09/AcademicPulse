import { GoogleGenAI } from '@google/genai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL_QUIZ || 'gemini-2.5-flash'

if (!API_KEY) {
    console.error('VITE_GEMINI_API_KEY is missing from environment variables.')
}

const ai = new GoogleGenAI({ apiKey: API_KEY })

export interface InlineQuizQuestion {
    question: string
    options: string[]
    correctIndex: number
}

// Patterns that indicate the AI gave a substantive explanation (not just a greeting or short reply)
const EXPLANATION_INDICATORS = [
    /\*\*.+\*\*/,                      // Has bold terms (key concepts)
    /^\s*[-•]\s/m,                     // Has bullet points
    /^\s*\d+\.\s/m,                    // Has numbered lists
    /\[FIGURE:\d+\.\d+\]/,            // Has figures
    /properties|reaction|formula|equation|process|method|extraction|corrosion|ionic|metal|non-metal|reactivity/i,
]

const SKIP_PATTERNS = [
    /^(hi|hello|hey|namaste)/i,
    /^(thanks|thank you|cool|nice|great|okay|got it)/i,
    /^(bye|goodbye|see you)/i,
    /politely redirect/i,
    /I'm your.*tutor/i,
    /let's continue with this chapter/i,
]

/**
 * Determines if the AI response is a substantive explanation that warrants MCQ questions.
 * Returns true if the response looks like a topic explanation (not a greeting or short reply).
 */
export function shouldGenerateInlineQuiz(aiResponse: string): boolean {
    // Skip if the response is too short (likely a greeting or acknowledgment)
    if (aiResponse.length < 300) return false

    // Skip if it matches known non-explanation patterns
    if (SKIP_PATTERNS.some(p => p.test(aiResponse))) return false

    // Check if it has enough explanation indicators
    const matchCount = EXPLANATION_INDICATORS.filter(p => p.test(aiResponse)).length
    return matchCount >= 2
}

/**
 * Generates 3-5 MCQ questions based on the AI's explanation.
 */
export async function generateInlineMCQ(aiExplanation: string): Promise<InlineQuizQuestion[]> {
    const prompt = `You are a quiz generator for CBSE Class 10 Science — Metals and Non-Metals.

Based ONLY on the following AI tutor explanation, generate 3-5 multiple-choice questions to test the student's understanding of what was just taught. The number of questions should match the depth of the explanation:
- Short explanations (1-2 concepts): 3 questions
- Medium explanations (3-4 concepts): 4 questions
- Detailed explanations (5+ concepts): 5 questions

Each question must have exactly 4 options with only 1 correct answer.

EXPLANATION:
${aiExplanation}

Respond in ONLY valid JSON array format, no extra text, no markdown code blocks:
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctIndex": 0
  }
]

Rules:
- Questions must be directly related to the explanation above
- Keep questions clear and concise
- Make options plausible but only one correct
- Cover different points from the explanation`

    try {
        const response = await ai.models.generateContent({
            model: LLM_MODEL,
            contents: prompt,
            config: { temperature: 0.2 },
        })

        const text = (response.text ?? '').trim()
        const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
        const parsed = JSON.parse(jsonStr) as InlineQuizQuestion[]
        return parsed.slice(0, 5)
    } catch (err) {
        console.error('Failed to generate inline MCQ:', err)
        return []
    }
}

/**
 * Renders inline MCQ cards as a horizontally scrollable strip below the AI message.
 * Returns the container element to be appended to the chat.
 */
export function renderInlineMCQCards(questions: InlineQuizQuestion[]): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'inline-mcq-container'

    // Header label
    const header = document.createElement('div')
    header.className = 'inline-mcq-header'
    header.innerHTML = `
        <div class="inline-mcq-header-icon">
            <span class="material-symbols-outlined">quiz</span>
        </div>
        <div class="inline-mcq-header-text">
            <span class="inline-mcq-title">Quick Check</span>
            <span class="inline-mcq-subtitle">Test your understanding — ${questions.length} questions</span>
        </div>
    `
    container.appendChild(header)

    // Scrollable card strip
    const strip = document.createElement('div')
    strip.className = 'inline-mcq-strip hide-scrollbar'

    questions.forEach((q, index) => {
        const card = createMCQCard(q, index, questions.length)
        strip.appendChild(card)
    })

    container.appendChild(strip)

    // Scroll indicators
    const scrollHint = document.createElement('div')
    scrollHint.className = 'inline-mcq-scroll-hint'
    scrollHint.innerHTML = `
        <span class="material-symbols-outlined">swipe_left</span>
        <span>Swipe to see more questions</span>
    `
    if (questions.length > 1) {
        container.appendChild(scrollHint)
    }

    return container
}

function createMCQCard(question: InlineQuizQuestion, index: number, total: number): HTMLDivElement {
    const card = document.createElement('div')
    card.className = 'inline-mcq-card'
    card.dataset.cardIndex = String(index)

    // Front face (question + options + submit)
    const front = document.createElement('div')
    front.className = 'inline-mcq-face inline-mcq-front'

    const questionNum = document.createElement('div')
    questionNum.className = 'inline-mcq-q-number'
    questionNum.textContent = `Question ${index + 1} of ${total}`
    front.appendChild(questionNum)

    const questionText = document.createElement('div')
    questionText.className = 'inline-mcq-q-text'
    questionText.textContent = question.question
    front.appendChild(questionText)

    const optionsContainer = document.createElement('div')
    optionsContainer.className = 'inline-mcq-options'

    let selectedOption: number = -1

    question.options.forEach((opt, optIdx) => {
        const optBtn = document.createElement('button')
        optBtn.className = 'inline-mcq-option'
        optBtn.dataset.optionIndex = String(optIdx)
        optBtn.innerHTML = `
            <span class="inline-mcq-option-indicator">${String.fromCharCode(65 + optIdx)}</span>
            <span class="inline-mcq-option-label">${opt.replace(/^[A-D]\)\s*/, '')}</span>
        `
        optBtn.addEventListener('click', () => {
            // Deselect all options in this card
            optionsContainer.querySelectorAll('.inline-mcq-option').forEach(b => b.classList.remove('selected'))
            optBtn.classList.add('selected')
            selectedOption = optIdx
            // Enable submit button
            const submitBtn = front.querySelector('.inline-mcq-submit') as HTMLButtonElement
            if (submitBtn) submitBtn.disabled = false
        })
        optionsContainer.appendChild(optBtn)
    })
    front.appendChild(optionsContainer)

    const submitBtn = document.createElement('button')
    submitBtn.className = 'inline-mcq-submit'
    submitBtn.disabled = true
    submitBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Submit Answer`
    front.appendChild(submitBtn)

    // Back face (result)
    const back = document.createElement('div')
    back.className = 'inline-mcq-face inline-mcq-back'

    // Submit handler
    submitBtn.addEventListener('click', () => {
        if (selectedOption === -1) return

        const isCorrect = selectedOption === question.correctIndex
        card.classList.add('flipped')
        card.classList.add(isCorrect ? 'correct' : 'incorrect')

        // Build the back face content
        const resultIcon = isCorrect ? 'check_circle' : 'cancel'
        const resultText = isCorrect ? 'Correct!' : 'Incorrect'
        const resultClass = isCorrect ? 'result-correct' : 'result-incorrect'

        back.innerHTML = `
            <div class="inline-mcq-result ${resultClass}">
                <span class="material-symbols-outlined inline-mcq-result-icon">${resultIcon}</span>
                <span class="inline-mcq-result-text">${resultText}</span>
            </div>
            <div class="inline-mcq-answer-section">
                <div class="inline-mcq-answer-label">Correct Answer</div>
                <div class="inline-mcq-answer-value">${question.options[question.correctIndex]}</div>
            </div>
            ${!isCorrect ? `
                <div class="inline-mcq-your-answer">
                    <div class="inline-mcq-answer-label">Your Answer</div>
                    <div class="inline-mcq-answer-value wrong">${question.options[selectedOption]}</div>
                </div>
                <button class="inline-mcq-retry">
                    <span class="material-symbols-outlined">refresh</span> Try Again
                </button>
            ` : `
                <div class="inline-mcq-congrats">
                    <span class="material-symbols-outlined">emoji_events</span>
                    Great job! You understood this concept.
                </div>
            `}
        `

        // Try again handler
        if (!isCorrect) {
            const retryBtn = back.querySelector('.inline-mcq-retry') as HTMLButtonElement
            retryBtn?.addEventListener('click', () => {
                card.classList.remove('flipped', 'correct', 'incorrect')
                selectedOption = -1
                // Reset option selections on the front
                optionsContainer.querySelectorAll('.inline-mcq-option').forEach(b => b.classList.remove('selected'))
                submitBtn.disabled = true
            })
        }
    })

    card.appendChild(front)
    card.appendChild(back)

    return card
}

/**
 * Renders a loading skeleton for the MCQ cards while questions are being generated.
 */
export function renderMCQLoadingSkeleton(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'inline-mcq-container inline-mcq-loading'

    container.innerHTML = `
        <div class="inline-mcq-header">
            <div class="inline-mcq-header-icon loading-pulse">
                <span class="material-symbols-outlined">quiz</span>
            </div>
            <div class="inline-mcq-header-text">
                <span class="inline-mcq-title">Generating Quick Check Questions...</span>
                <span class="inline-mcq-subtitle">Analyzing the explanation to create quiz questions</span>
            </div>
        </div>
        <div class="inline-mcq-strip hide-scrollbar">
            <div class="inline-mcq-card skeleton">
                <div class="inline-mcq-face inline-mcq-front">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                </div>
            </div>
            <div class="inline-mcq-card skeleton">
                <div class="inline-mcq-face inline-mcq-front">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                </div>
            </div>
            <div class="inline-mcq-card skeleton">
                <div class="inline-mcq-face inline-mcq-front">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                    <div class="skeleton-option"></div>
                </div>
            </div>
        </div>
    `
    return container
}
