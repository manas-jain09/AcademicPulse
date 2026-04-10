import './style.css'

type Author = 'user' | 'ai'

interface Message {
  id: number
  author: Author
  text: string
  timestamp: string
}

const synopsis =
  'Millions of Class 10 students across India face their board examinations under immense pressure, often without access to personalised guidance or resources that adapt to their unique learning needs. Our AI-powered education platform is built to change that. By ingesting prescribed textbooks through RAG (Retrieval-Augmented Generation), the platform delivers interactive, curriculum-aligned lessons and instant doubt resolution. A dedicated conversational AI tutor serves as an additional learning mode — enabling students to explore complex concepts through natural dialogue and get their doubts addressed in real time. Adaptive revision tools including AI-generated flashcards and MCQs ensure concepts are retained, not just covered. At its core, the platform features a fine-tuned model trained on previous year board papers and official marking schemes — generating realistic practice exams and providing detailed, automated answer evaluations that mirror the actual board assessment experience. Predictive algorithms then estimate each student\'s expected performance in actual board exams, helping students and educators identify gaps early and course-correct before it\'s too late. The result: every Class 10 student, regardless of their background or access to coaching, gets a personal AI tutor that prepares them not just to pass — but to excel. Because here, the platform adapts to the student — not the other way around. Learn at your own pace, in your own style, on your own terms.'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="layout">
    <main class="main">
      <section class="conversation-column">
        <header class="conversation-header">
          <div class="conversation-title">Computer Science 101</div>
          <div class="conversation-subtitle">ACTIVE SESSION</div>
        </header>

        <div class="notebook">
          <div class="notebook-header">
            <div class="ai-logo">
              <span class="ai-logo-mark">AI</span>
            </div>
            <div class="notebook-header-text">
              <div class="notebook-title">Class 10 Board Prep Tutor</div>
              <div class="notebook-subtitle">StudyMind · Powered by your exam textbooks</div>
            </div>
          </div>

          <div class="chat-card chat-scroll" id="chat-scroll"></div>
        </div>

        <footer class="composer">
          <input
            id="composer-input"
            class="composer-input"
            placeholder="Ask anything about Class 10 board prep..."
          />
          <button class="composer-send" id="composer-send" aria-label="Send message"></button>
        </footer>
      </section>

      <aside class="sidebar">
        <section class="sidebar-section">
          <h2 class="sidebar-heading">STUDY RESOURCES</h2>
          <button class="sidebar-card primary" type="button">
            <div class="sidebar-card-header">
              <div class="sidebar-icon flashcards-icon"></div>
              <span>Flashcards</span>
            </div>
            <span>Review key concepts</span>
          </button>
          <button class="sidebar-card" type="button">
            <div class="sidebar-card-header">
              <div class="sidebar-icon quiz-icon"></div>
              <span>Quiz</span>
            </div>
            <span>Test your knowledge</span>
          </button>
          <button class="sidebar-card" type="button">
            <div class="sidebar-card-header">
              <div class="sidebar-icon maps-icon"></div>
              <span>Memory Maps</span>
            </div>
            <span>Visualize connections</span>
          </button>
          <button class="sidebar-card" type="button">
            <div class="sidebar-card-header">
              <div class="sidebar-icon converse-icon"></div>
              <span>Converse</span>
            </div>
            <span>Have a focused discussion</span>
          </button>
        </section>

        <section class="sidebar-section upgrade-section">
          <div class="upgrade-card">
            <div class="upgrade-title">Upgrade to Pro</div>
            <div class="upgrade-text">Get unlimited AI responses and personalised study plans.</div>
            <button class="upgrade-button">Learn More</button>
          </div>
        </section>
      </aside>
    </main>
  </div>
`

const chatScroll = document.querySelector<HTMLDivElement>('#chat-scroll')!
const composerInput = document.querySelector<HTMLInputElement>('#composer-input')!
const composerSend = document.querySelector<HTMLButtonElement>('#composer-send')!

let nextId = 1
const messages: Message[] = [
  {
    id: nextId++,
    author: 'ai',
    text:
      'Hello! I’m your StudyMind assistant for Class 10 board prep. What topic should we focus on today?',
    timestamp: '09:41 AM',
  },
]

function renderMessages() {
  chatScroll.innerHTML = ''

  messages.forEach((message) => {
    const row = document.createElement('div')
    row.classList.add('chat-message-row')
    row.classList.add(message.author === 'user' ? 'user' : 'assistant')

    if (message.author === 'ai') {
      const logo = document.createElement('div')
      logo.classList.add('chat-assistant-icon', 'small')
      logo.innerHTML = '<span class="ai-logo-mark">AI</span>'
      row.appendChild(logo)
    }

    const bubble = document.createElement('div')
    bubble.classList.add('chat-bubble')
    bubble.classList.add(message.author === 'user' ? 'user-bubble' : 'ai-bubble')

    if (message.author === 'ai') {
      const strong = document.createElement('span')
      strong.classList.add('strong')
      strong.textContent = 'StudyMind AI • '
      bubble.appendChild(strong)
    }

    const textNode = document.createElement('span')
    textNode.textContent = message.text
    bubble.appendChild(textNode)

    row.appendChild(bubble)
    chatScroll.appendChild(row)
  })

  chatScroll.scrollTop = chatScroll.scrollHeight
}

function nowLabel() {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())
}

function getAiReply(userText: string): string {
  if (userText.toLowerCase().includes('big o')) {
    return (
      'Big O notation is a way to describe how the time or space needs of an algorithm grow as the input size increases. In our platform, it helps us reason about how personalised tutoring, practice paper generation and evaluation will scale as more students and questions are added. ' +
      synopsis
    )
  }

  return (
    'Great question. Let’s reason it through step by step in the context of your Class 10 board prep. ' +
    synopsis
  )
}

function sendMessage() {
  const raw = composerInput.value.trim()
  if (!raw) return

  messages.push({
    id: nextId++,
    author: 'user',
    text: raw,
    timestamp: nowLabel(),
  })
  composerInput.value = ''
  renderMessages()

  const aiText = getAiReply(raw)
  messages.push({
    id: nextId++,
    author: 'ai',
    text: aiText,
    timestamp: nowLabel(),
  })
  renderMessages()
}

composerSend.addEventListener('click', sendMessage)
composerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
})

renderMessages()
