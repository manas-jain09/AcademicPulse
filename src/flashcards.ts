import { generateFlashcards } from './gemini'
import type { Flashcard } from './gemini'
import { getAllChunks } from './rag'

let cards: Flashcard[] = []
let currentIndex = 0
let isFlipped = false

function getModalContainer(): HTMLDivElement {
  let modal = document.getElementById('flashcardModal') as HTMLDivElement | null
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'flashcardModal'
    modal.className = 'modal-overlay'
    document.body.appendChild(modal)
  }
  return modal
}

function renderLoading(modal: HTMLDivElement) {
  modal.innerHTML = `
    <div class="modal-content flashcard-modal">
      <div class="modal-loading">
        <div class="spinner"></div>
        <p>Generating flashcards from Chapter 3...</p>
        <p class="loading-sub">Creating study cards</p>
      </div>
    </div>
  `
  modal.classList.add('visible')
}

function renderFlashcards(modal: HTMLDivElement) {
  const card = cards[currentIndex]

  modal.innerHTML = `
    <div class="modal-content flashcard-modal">
      <div class="modal-header">
        <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">style</span> Flashcards — Metals and Non-Metals</h2>
        <button class="modal-close" id="fcClose"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="flashcard-body">
        <div class="flashcard-counter">${currentIndex + 1} / ${cards.length}</div>
        <div class="flashcard-container" id="flashcardContainer">
          <div class="flashcard ${isFlipped ? 'flipped' : ''}" id="flashcard">
            <div class="flashcard-face flashcard-front">
              <div class="flashcard-label">Question</div>
              <div class="flashcard-text">${card.front}</div>
              <div class="flashcard-hint">Click to reveal answer</div>
            </div>
            <div class="flashcard-face flashcard-back">
              <div class="flashcard-label">Answer</div>
              <div class="flashcard-text">${card.back}</div>
              <div class="flashcard-hint">Click to see question</div>
            </div>
          </div>
        </div>
        <div class="flashcard-nav">
          <button class="fc-nav-btn" id="fcPrev" ${currentIndex === 0 ? 'disabled' : ''}>
            ← Previous
          </button>
          <button class="fc-nav-btn fc-flip-btn" id="fcFlip">
            Flip Card
          </button>
          <button class="fc-nav-btn" id="fcNext" ${currentIndex === cards.length - 1 ? 'disabled' : ''}>
            Next →
          </button>
        </div>
      </div>
    </div>
  `

  // Bind events
  document.getElementById('fcClose')!.addEventListener('click', () => closeModal(modal))
  document.getElementById('flashcard')!.addEventListener('click', () => {
    isFlipped = !isFlipped
    renderFlashcards(modal)
  })
  document.getElementById('fcFlip')!.addEventListener('click', () => {
    isFlipped = !isFlipped
    renderFlashcards(modal)
  })
  document.getElementById('fcPrev')!.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--
      isFlipped = false
      renderFlashcards(modal)
    }
  })
  document.getElementById('fcNext')!.addEventListener('click', () => {
    if (currentIndex < cards.length - 1) {
      currentIndex++
      isFlipped = false
      renderFlashcards(modal)
    }
  })
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

export async function openFlashcards() {
  const modal = getModalContainer()
  renderLoading(modal)

  currentIndex = 0
  isFlipped = false

  try {
    const chunks = getAllChunks()
    cards = await generateFlashcards(chunks)

    if (cards.length === 0) {
      modal.innerHTML = `
        <div class="modal-content flashcard-modal">
          <div class="modal-header">
            <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">error</span> Flashcard Error</h2>
            <button class="modal-close" id="fcCloseErr"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="flashcard-body" style="text-align:center;padding:40px;">
            <p>Failed to generate flashcards. Please try again.</p>
          </div>
        </div>
      `
      document.getElementById('fcCloseErr')!.addEventListener('click', () => closeModal(modal))
      return
    }

    renderFlashcards(modal)
  } catch (err) {
    console.error('Flashcard generation error:', err)
    modal.innerHTML = `
      <div class="modal-content flashcard-modal">
        <div class="modal-header">
          <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">error</span> Flashcard Error</h2>
          <button class="modal-close" id="fcCloseErr2"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="flashcard-body" style="text-align:center;padding:40px;">
          <p>An error occurred. Please try again.</p>
        </div>
      </div>
    `
    document.getElementById('fcCloseErr2')!.addEventListener('click', () => closeModal(modal))
  }
}
