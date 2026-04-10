import { generateQuiz, evaluateQuiz } from './gemini'
import type { QuizQuestion } from './gemini'
import { getAllChunks } from './rag'

let currentQuestions: QuizQuestion[] = []
let selectedAnswers: number[] = []

function getModalContainer(): HTMLDivElement {
  let modal = document.getElementById('quizModal') as HTMLDivElement | null
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'quizModal'
    modal.className = 'modal-overlay'
    document.body.appendChild(modal)
  }
  return modal
}

function renderLoading(modal: HTMLDivElement) {
  modal.innerHTML = `
    <div class="modal-content quiz-modal">
      <div class="modal-loading">
        <div class="spinner"></div>
        <p>Generating quiz from Chapter 3...</p>
        <p class="loading-sub">Creating 5 MCQ questions</p>
      </div>
    </div>
  `
  modal.classList.add('visible')
}

function renderQuiz(modal: HTMLDivElement) {
  const questionsHTML = currentQuestions
    .map(
      (q, i) => `
    <div class="quiz-question" id="quizQ${i}">
      <div class="quiz-q-number">Question ${i + 1} of ${currentQuestions.length}</div>
      <div class="quiz-q-text">${q.question}</div>
      <div class="quiz-options">
        ${q.options
          .map(
            (opt, j) => `
          <button class="quiz-option" data-qi="${i}" data-oi="${j}">
            <span class="quiz-option-radio"></span>
            <span class="quiz-option-text">${opt}</span>
          </button>
        `
          )
          .join('')}
      </div>
    </div>
  `
    )
    .join('')

  modal.innerHTML = `
    <div class="modal-content quiz-modal">
      <div class="modal-header">
        <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">quiz</span> Chapter Quiz — Metals and Non-Metals</h2>
        <button class="modal-close" id="quizClose"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="quiz-body">
        ${questionsHTML}
      </div>
      <div class="quiz-footer">
        <div class="quiz-progress">
          <span id="quizAnswered">0</span> of ${currentQuestions.length} answered
        </div>
        <button class="quiz-submit-btn" id="quizSubmit" disabled>Submit Quiz</button>
      </div>
    </div>
  `

  // Bind events
  modal.querySelectorAll('.quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qi = parseInt((btn as HTMLElement).dataset.qi!)
      const oi = parseInt((btn as HTMLElement).dataset.oi!)
      selectOption(qi, oi, modal)
    })
  })

  document.getElementById('quizClose')!.addEventListener('click', () => closeModal(modal))
  document.getElementById('quizSubmit')!.addEventListener('click', () => submitQuiz(modal))
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal)
  })
}

function selectOption(qi: number, oi: number, modal: HTMLDivElement) {
  selectedAnswers[qi] = oi

  // Update visual selection
  const questionEl = modal.querySelector(`#quizQ${qi}`)!
  questionEl.querySelectorAll('.quiz-option').forEach((btn, j) => {
    btn.classList.toggle('selected', j === oi)
  })

  // Update progress
  const answered = selectedAnswers.filter((a) => a !== -1).length
  const answeredEl = document.getElementById('quizAnswered')
  if (answeredEl) answeredEl.textContent = String(answered)

  const submitBtn = document.getElementById('quizSubmit') as HTMLButtonElement
  if (submitBtn) submitBtn.disabled = answered < currentQuestions.length
}

async function submitQuiz(modal: HTMLDivElement) {
  const submitBtn = document.getElementById('quizSubmit') as HTMLButtonElement
  submitBtn.textContent = 'Evaluating...'
  submitBtn.disabled = true

  const result = await evaluateQuiz(currentQuestions, selectedAnswers)

  // Render results
  const scorePercent = Math.round((result.score / result.total) * 100)
  let scoreClass = 'score-low'
  if (scorePercent >= 80) scoreClass = 'score-high'
  else if (scorePercent >= 50) scoreClass = 'score-mid'

  const resultHTML = currentQuestions
    .map(
      (q, i) => `
    <div class="quiz-result-item ${selectedAnswers[i] === q.correctIndex ? 'correct' : 'incorrect'}">
      <div class="quiz-q-text">${q.question}</div>
      <div class="quiz-result-answer">
        Your answer: <strong>${q.options[selectedAnswers[i]] ?? 'Not answered'}</strong>
      </div>
      <div class="quiz-result-feedback">${result.feedback[i]}</div>
    </div>
  `
    )
    .join('')

  modal.innerHTML = `
    <div class="modal-content quiz-modal">
      <div class="modal-header">
        <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">analytics</span> Quiz Results</h2>
        <button class="modal-close" id="quizCloseResult"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="quiz-body">
        <div class="quiz-score ${scoreClass}">
          <div class="quiz-score-number">${result.score}/${result.total}</div>
          <div class="quiz-score-label">${scorePercent}% — ${scorePercent >= 80 ? 'Excellent!' : scorePercent >= 50 ? 'Good effort!' : 'Keep studying!'
    }</div>
        </div>
        ${resultHTML}
      </div>
      <div class="quiz-footer">
        <button class="quiz-submit-btn" id="quizRetry">Try Again</button>
        <button class="quiz-submit-btn secondary" id="quizCloseBtn">Close</button>
      </div>
    </div>
  `

  document.getElementById('quizCloseResult')!.addEventListener('click', () => closeModal(modal))
  document.getElementById('quizCloseBtn')!.addEventListener('click', () => closeModal(modal))
  document.getElementById('quizRetry')!.addEventListener('click', () => openQuiz())
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal)
  })
}

function closeModal(modal: HTMLDivElement) {
  modal.classList.remove('visible')
  setTimeout(() => {
    modal.innerHTML = ''
  }, 300)
}

export async function openQuiz(topics?: string[]) {
  const modal = getModalContainer()
  renderLoading(modal)

  currentQuestions = []
  selectedAnswers = []

  try {
    const chunks = getAllChunks()
    currentQuestions = await generateQuiz(chunks, topics)

    if (currentQuestions.length === 0) {
      modal.innerHTML = `
        <div class="modal-content quiz-modal">
          <div class="modal-header">
            <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">error</span> Quiz Error</h2>
            <button class="modal-close" id="quizCloseErr"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="quiz-body" style="text-align:center;padding:40px;">
            <p>Failed to generate quiz questions. Please try again.</p>
          </div>
        </div>
      `
      document.getElementById('quizCloseErr')!.addEventListener('click', () => closeModal(modal))
      return
    }

    selectedAnswers = new Array(currentQuestions.length).fill(-1)
    renderQuiz(modal)
  } catch (err) {
    console.error('Quiz generation error:', err)
    modal.innerHTML = `
      <div class="modal-content quiz-modal">
        <div class="modal-header">
          <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">error</span> Quiz Error</h2>
          <button class="modal-close" id="quizCloseErr2"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="quiz-body" style="text-align:center;padding:40px;">
          <p>An error occurred while generating the quiz. Please try again.</p>
        </div>
      </div>
    `
    document.getElementById('quizCloseErr2')!.addEventListener('click', () => closeModal(modal))
  }
}
