import './style.css'
import { renderLandingPage, initLandingEvents } from './landing'
import { renderLoginPage, initLoginEvents } from './login'
import { initRAG, retrieveChunks, isRAGReady } from './rag'
import { chatWithContextStream } from './gemini'
import type { ChatMessage } from './gemini'
import { openFlashcards } from './flashcards'
import { openQuiz } from './quiz'
import { openMindMap } from './mindmap'
import { shouldGenerateInlineQuiz, generateInlineMCQ, renderInlineMCQCards, renderMCQLoadingSkeleton } from './inlineQuiz'
import { runMultiAgent } from './mentorAgents'
import { supabase } from './supabaseClient'
import { loadSubjects, loadPapers, renderPapersTable, showCreatePaperDialog, openPaperView, showUploadDialog, openResultsView } from './boardPapers'
import type { BoardPaper } from './boardPapers'
import { generateAudioOverview } from './audioOverview'
import type { AudioOverviewInput, PodcastTheme, PodcastLanguage } from './audioOverview'
import { renderGamesHub, renderGameScreen, bindGamesHubEvents } from './games'
import type { GameType } from './games'
import { renderExperimentForm, bindExperimentFormEvents, renderExperimentCanvas, initExperiment } from './experientialLearning'

let syllabi: Record<string, any[]> = {}

// ── SVG Icons ──────────────────────────────────────────────
// @ts-ignore
const ICON_LOGO = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="5" width="18" height="22" rx="3" fill="#1a73e8"/>
  <rect x="8" y="9" width="10" height="2" rx="1" fill="#fff"/>
  <rect x="8" y="13" width="8" height="2" rx="1" fill="#fff"/>
  <rect x="8" y="17" width="10" height="2" rx="1" fill="#fff"/>
  <path d="M24 8l4-3v7l-4-3z" fill="#fbbc04"/>
  <circle cx="26" cy="7" r="2" fill="#fbbc04"/>
  <path d="M25.5 5.5l1.5-2.5" stroke="#fbbc04" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M28.5 6l2.5-0.5" stroke="#fbbc04" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M28 9l2 1.5" stroke="#fbbc04" stroke-width="1.2" stroke-linecap="round"/>
</svg>`



// ── State ──────────────────────────────────────────────────
const userTopics: string[] = []  // Track what the student asks about
const chatHistory: ChatMessage[] = []  // Maintain conversation history
var activeRAGChapterId: number | null = null;

// ── Build App ──────────────────────────────────────────────
const app = document.querySelector<HTMLDivElement>('#app')!

// Normalize root to /landing for initial load
if (window.location.pathname === '/') {
  history.replaceState(null, '', '/landing')
}

// Check route
if (
  window.location.pathname === '/landing' ||
  window.location.pathname === '/landingpage'
) {
  app.style.height = 'auto'
  app.style.overflow = 'auto'
  app.innerHTML = renderLandingPage()
  initLandingEvents(() => {
    history.pushState(null, '', '/login')
    location.reload()
  })
} else if (window.location.pathname === '/login') {
  app.style.height = 'auto'
  app.style.overflow = 'auto'
  app.innerHTML = renderLoginPage()
  initLoginEvents(() => {
    history.pushState(null, '', '/dashboard')
    location.reload()
  })
} else {
  startApp()
}

async function startApp() {
  // Reset app container for study mode
  app.style.height = '100vh'
  app.style.overflow = 'hidden'
  app.style.display = 'flex'

  const { data } = await supabase.from('subjects').select('*, chapters(*)')
  if (data) {
    data.forEach(sub => {
      syllabi[sub.id] = sub.chapters.sort((a: any, b: any) => a.chapter_number - b.chapter_number)
    })
  }

  // Fetch and update user profile name
  async function loadUserProfile() {
    const userId = localStorage.getItem('pulse_user_id')
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, total_pulse_points')
        .eq('id', userId)
        .single()

      if (data && !error) {
        const greetingEl = document.getElementById('userGreeting')
        if (greetingEl) {
          greetingEl.textContent = `Hey ${data.full_name}, ready to master your subjects?`
        }

        const pointsEl = document.getElementById('userPoints')
        const pointsValEl = document.getElementById('pulsePointsVal')
        if (pointsEl && pointsValEl) {
          pointsValEl.textContent = data.total_pulse_points?.toString() || '0'
          pointsEl.classList.remove('hidden')
        }
      }
    } catch (err) {
      console.error('Failed to load user profile:', err)
    }
  }

  async function loadUserStreak() {
    const userId = localStorage.getItem('pulse_user_id')
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('points, played_at')
        .eq('user_id', userId)

      if (error || !data) return

      // Group points by local date (YYYY-MM-DD)
      const dailyPoints: Record<string, number> = {}
      data.forEach(score => {
        const date = new Date(score.played_at).toLocaleDateString('en-CA')
        dailyPoints[date] = (dailyPoints[date] || 0) + score.points
      })

      // Calculate Current Streak
      let streak = 0
      const todayStr = new Date().toLocaleDateString('en-CA')
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toLocaleDateString('en-CA')

      if ((dailyPoints[todayStr] || 0) > 10) {
        streak = 0
        let d = new Date()
        while (true) {
          const dStr = d.toLocaleDateString('en-CA')
          if ((dailyPoints[dStr] || 0) > 10) {
            streak++
            d.setDate(d.getDate() - 1)
          } else {
            break
          }
        }
      } else if ((dailyPoints[yesterdayStr] || 0) > 10) {
        streak = 0
        let d = new Date(yesterday)
        while (true) {
          const dStr = d.toLocaleDateString('en-CA')
          if ((dailyPoints[dStr] || 0) > 10) {
            streak++
            d.setDate(d.getDate() - 1)
          } else {
            break
          }
        }
      }

      // Update UI
      const streakDaysEl = document.querySelector('.streak-days-val')
      if (streakDaysEl) streakDaysEl.textContent = `${streak} Day${streak !== 1 ? 's' : ''}`

      const navStreakEl = document.getElementById('userStreakNav')
      const navStreakValEl = document.getElementById('navStreakVal')
      if (navStreakEl && navStreakValEl) {
        navStreakValEl.textContent = streak.toString()
        navStreakEl.classList.remove('hidden')
      }

      // Update Week Indicators (M T W T F S S)
      const now = new Date()
      const dayOfWeek = now.getDay() // 0 (Sun) to 6 (Sat)

      // Calculate start of week (Monday)
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(now)
      monday.setDate(diff)

      const weekSpans = document.querySelectorAll('.streak-week span')
      weekSpans.forEach((span, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dStr = d.toLocaleDateString('en-CA')
        if ((dailyPoints[dStr] || 0) > 10) {
          span.classList.add('active')
        } else {
          span.classList.remove('active')
        }
      })
    } catch (err) {
      console.error('Failed to load streak:', err)
    }
  }

  loadUserProfile()
  loadUserStreak()



  function renderSubjectChapters(subjectKey: string, subjectTitle: string) {
    const chapters = syllabi[subjectKey] || []

    const titleEl = document.getElementById('chaptersTitle')
    if (titleEl) titleEl.textContent = subjectTitle + " Chapters"

    const chaptersHtml = chapters.map((chap: any) => {
      const chapterNum = chap.chapter_number
      let extraTag = chap.tag || ''
      const tagHtml = extraTag ? `<span class="chapter-tag" style="background: var(--tertiary); color: #fff; margin-left: 8px;">${extraTag}</span>` : ''

      return `
      <div class="chapter-item">
        <div class="chapter-status">
          <span class="material-symbols-outlined">menu_book</span>
        </div>
        <div class="chapter-info">
          <div style="margin-bottom: 4px;">
            <span class="chapter-tag">Chapter ${chapterNum}</span>
            ${tagHtml}
          </div>
          <h3 style="margin-top: 0;">${chap.title}</h3>
        </div>
        <div>
          <button class="chapter-action-btn primary-btn" data-chapid="${chap.id}" data-subjectkey="${subjectKey}">View Chapter</button>
        </div>
      </div>
    `
    }).join('')

    const listContainer = document.getElementById('chapterListContainer')
    if (listContainer) {
      listContainer.innerHTML = chaptersHtml

      listContainer.querySelectorAll('.chapter-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLButtonElement
          const cId = target.getAttribute('data-chapid')
          const sKey = target.getAttribute('data-subjectkey')
          routeTo(`/study/${sKey}/${cId}`)
        })
      })
    }
  }

  app.innerHTML = `
  <div class="sidebar">
    <div class="sidebar-brand" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
      <img src="/Pulse.jpeg" alt="Logo" style="height: 32px; width: auto; border-radius: 8px;" />
      <span style="color: var(--primary); font-size: 1.2rem; font-weight: 800;">Academic Pulse</span>
    </div>
    <div class="sidebar-nav">
      <button class="nav-item active" id="navDashboard">
        <span class="material-symbols-outlined" style="margin-right: 12px;">grid_view</span>
        <span>Dashboard</span>
      </button>
      <button class="nav-item" id="navPapers">
        <span class="material-symbols-outlined" style="margin-right: 12px;">description</span>
        <span>Board Papers</span>
      </button>
      <button class="nav-item" id="navStudyTools">
        <span class="material-symbols-outlined" style="margin-right: 12px;">menu_book</span>
        <span>Study Tools</span>
      </button>
      
      <div style="margin: 12px 0; border-top: 1px solid #eef2ff;"></div>
      
      <button class="nav-item sidebar-profile-btn" id="sidebarProfileBtn">
        <span class="material-symbols-outlined" style="margin-right: 12px;">account_circle</span>
        <span>Profile</span>
      </button>
      <button class="nav-item sidebar-logout-btn" id="sidebarLogoutBtn">
        <span class="material-symbols-outlined" style="margin-right: 12px;">logout</span>
        <span>Logout</span>
      </button>
    </div>
    <div style="flex-grow: 1;"></div>
  </div>

  <div class="main-content">
    <div class="topbar">
      <div class="topbar-left">
        <button class="back-btn hidden" id="notebookBackBtnTop" style="width: 32px; height: 32px; background: transparent; border: 1px solid #eef2ff;"><span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span></button>
        <h1 class="topbar-title" id="topbarTitle">Dashboard</h1>
      </div>
      <div class="topbar-center">
        <div id="topbarStudyInfo" class="hidden" style="display: flex; align-items: center; gap: 24px;">
          <span id="topbarChapterTitle" style="font-size: 0.95rem; font-weight: 700; color: var(--on-surface-variant); white-space: nowrap;">Chapter 3: Metals and Non-Metals</span>
          <select id="languageSelect" class="language-select" style="padding: 4px 12px; font-size: 0.8rem; border-radius: 8px;">
            <option value="English">English</option>
            <option value="Hindi">Hindi (हिंदी)</option>
            <option value="Marathi">Marathi (मराठी)</option>
            <option value="Gujarati">Gujarati (ગુજરાતી)</option>
            <option value="Tamil">Tamil (தமிழ்)</option>
            <option value="Telugu">Telugu (తెలుగు)</option>
            <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
            <option value="Malayalam">Malayalam (മലയാളം)</option>
            <option value="Bengali">Bengali (বাংলা)</option>
            <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
            <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
            <option value="Assamese">Assamese (অসমীয়া)</option>
          </select>
        </div>
      </div>
      <div class="topbar-right">
        <div id="userStreakNav" class="pulse-streak-badge hidden">
          <span class="material-symbols-outlined filled" style="color: #f59e0b;">local_fire_department</span>
          <strong id="navStreakVal">0</strong>
          <span class="label">Streak</span>
        </div>
        <div id="userPoints" class="pulse-points-badge hidden">
          <span class="material-symbols-outlined filled">bolt</span>
          <strong id="pulsePointsVal">0</strong>
          <span class="label">Pulse Points</span>
        </div>
      </div>
    </div>
    <div class="content-area" id="contentArea">
      <!-- STUDY TOOLS VIEW -->
      <div id="studyToolsView" class="hidden">
        <div class="st-header">
          <h1 class="st-title">Study Tools</h1>
          <p class="st-subtitle">Interactive AI-powered tools to accelerate your learning</p>
        </div>
        <div class="st-grid">
          <div class="st-card ai-mentor-card">
            <div class="st-card-icon mentor">
              <img src="/Pulse.jpeg" alt="Logo" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;" />
            </div>
            <div class="st-card-content">
              <h3>AI Mentor</h3>
              <p>Chat with Academic Pulse, your personal AI tutor, to solve doubts and explore concepts.</p>
            </div>
            <button class="st-card-btn" id="stMentorBtn">Launch Mentor</button>
          </div>
          <div class="st-card audio-overview-card">
            <div class="st-card-icon audio"><span class="material-symbols-outlined">headphones</span></div>
            <div class="st-card-content">
              <h3>Audio Overview</h3>
              <p>Convert your chapters into engaging audio summaries and podcasts.</p>
            </div>
            <button class="st-card-btn" id="stAudioBtn">Listen Now</button>
          </div>
          <div class="st-card games-card">
            <div class="st-card-icon games"><span class="material-symbols-outlined">sports_esports</span></div>
            <div class="st-card-content">
              <h3>Games</h3>
              <p>Reinforce your knowledge through interactive quizzes and study games.</p>
            </div>
            <button class="st-card-btn" id="stGamesBtn">Play Now</button>
          </div>
          <div class="st-card experiment-card">
            <div class="st-card-icon experiment"><span class="material-symbols-outlined">science</span></div>
            <div class="st-card-content">
              <h3>Experiential Learning</h3>
              <p>Build real circuits, test metal properties, and learn science through hands-on virtual experiments.</p>
            </div>
            <button class="st-card-btn" id="stExperimentBtn">Start Experiment</button>
          </div>
        </div>
      </div>

      <!-- AI MENTOR VIEW -->
      <div id="mentorView" class="chat-layout hidden">
        <div class="chat-panel">
          
          <div class="chat-area hide-scrollbar" id="mentorChatArea">
            <div class="chat-welcome">

              <p>Get guidance, career advice, and general study support to help you achieve your goals.</p>
              <div class="chat-suggestions">
                <button class="mentor-suggestion-chip" data-q="How can I improve my focus?">Improve Focus</button>
                <button class="mentor-suggestion-chip" data-q="What are some effective study techniques?">Study Techniques</button>
                <button class="mentor-suggestion-chip" data-q="Give me a general tip for board exams.">Exam Tips</button>
              </div>
            </div>
          </div>

          <div class="chat-composer">
            <div class="gemini-composer-box">
              <textarea class="gemini-input" id="mentorComposerInput" placeholder="Ask your mentor anything..." autocomplete="off" rows="1"></textarea>
              <div class="gemini-footer">
                <div class="gemini-footer-left">
                </div>
                <div class="gemini-footer-right">
                  <button class="gemini-icon-btn disabled" id="mentorSendBtn" disabled><span class="material-symbols-outlined">arrow_upward</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- BOARD PAPERS VIEW -->
      <div id="papersView" class="hidden">
        <div class="bp-view-header">
          <div>
            <h1 class="bp-view-title">Board Papers</h1>
            <p class="bp-view-subtitle">Generate CBSE board-style question papers and get AI evaluation</p>
          </div>
          <button class="bp-create-btn" id="createPaperBtn">
            <span class="material-symbols-outlined">add_circle</span>
            Create Paper
          </button>
        </div>
        <div class="bp-table-container" id="papersTableContainer">
          <div class="bp-loading-state">
            <div class="spinner"></div>
            <p>Loading papers...</p>
          </div>
        </div>
      </div>

      <!-- AI PREDICTOR VIEW -->
      <div id="aiPredictorView" class="hidden predictor-view-wrap">
        <div class="px-hero">
          <div class="px-hero-left">
            <span class="px-badge">Board Exam 2024 Forecast</span>
            <h1 class="px-hero-title">Predicted Score:<br/>96/100</h1>
            <p class="px-hero-sub">Performance Grade: <span class="px-green-txt">A1 Excellent</span></p>
          </div>
          <div class="px-hero-right">
            <div class="px-confidence-glass">
              <p>CONFIDENCE<br/>SCORE</p>
              <h2>98.4%</h2>
              <div class="px-c-track"><div class="px-c-fill"></div></div>
            </div>
          </div>
        </div>

        <div class="px-middle-row">
          <div class="px-trends-card">
            <div class="px-tc-head">
              <div>
                <h3>Mark Trends</h3>
                <p>Performance over last 5 mock exams</p>
              </div>
              <span class="px-mock-badge">Mock 1-5</span>
            </div>
            <div class="px-trends-chart"></div>
            <div class="px-trends-x">
              <span>M1</span><span>M2</span><span>M3</span><span>M4</span><span class="px-active">Predict</span>
            </div>
          </div>
          <div class="px-boost-card">
            <h3><span class="material-symbols-outlined">auto_awesome</span> AI Boost Tips</h3>
            <ul>
              <li>Focus on Organic Chemistry equations to gain <span class="px-gain">+2 marks</span></li>
              <li>Review 'Trigonometric Identities' derivations for <span class="px-gain">+3 marks</span></li>
              <li>Practice map-work for History to secure <span class="px-gain">+5 marks</span></li>
            </ul>
          </div>
        </div>

        <div class="px-forecast-section">
          <div class="px-fs-head">
            <h3>Subject-wise Forecast</h3>
            <a href="#">View Details <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">arrow_forward</span></a>
          </div>
          
          <div class="px-fs-grid">
            <div class="px-f-card">
              <div class="px-fc-head">
                <div class="px-icpx math"><span class="material-symbols-outlined">functions</span></div>
                <h4>Mathematics</h4>
              </div>
              <div class="px-fc-score">98<span>/100</span></div>
              <div class="px-fc-bar-row">
                <div class="px-fc-bar"><div class="px-fc-fill" style="width:98%; background:#004be2;"></div></div>
                <span style="color:#004be2;">Top 1%</span>
              </div>
            </div>

            <div class="px-f-card">
              <div class="px-fc-head">
                <div class="px-icpx sci"><span class="material-symbols-outlined">science</span></div>
                <h4>Science</h4>
              </div>
              <div class="px-fc-score">94<span>/100</span></div>
              <div class="px-fc-bar-row">
                <div class="px-fc-bar"><div class="px-fc-fill" style="width:94%; background:#9720ab;"></div></div>
                <span style="color:#9720ab;">A1</span>
              </div>
            </div>

            <div class="px-f-card">
              <div class="px-fc-head">
                <div class="px-icpx sst"><span class="material-symbols-outlined">public</span></div>
                <h4>Social Science</h4>
              </div>
              <div class="px-fc-score">97<span>/100</span></div>
              <div class="px-fc-bar-row">
                <div class="px-fc-bar"><div class="px-fc-fill" style="width:97%; background:#006a33;"></div></div>
                <span style="color:#006a33;">Consistent</span>
              </div>
            </div>

            <div class="px-f-card">
              <div class="px-fc-head">
                <div class="px-icpx eng"><span class="material-symbols-outlined">menu_book</span></div>
                <h4>English</h4>
              </div>
              <div class="px-fc-score">95<span>/100</span></div>
              <div class="px-fc-bar-row">
                <div class="px-fc-bar"><div class="px-fc-fill" style="width:95%; background:#d95b00;"></div></div>
                <span style="color:#d95b00;">Stable</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="px-actions">
          <button class="px-primary-btn">Try another Mock</button>
          <button class="px-secondary-btn">Review Lessons</button>
        </div>
      </div>

      <!-- DASHBOARD VIEW -->
      <div id="dashboardView">
        <div class="dashboard-hero">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
            <h2 id="userGreeting" style="margin-bottom: 0;">Hey there, ready to master your subjects?</h2>
          </div>
        </div>

        <div class="section-header">
          <div>
            <h3 class="section-title">Subject Tracker</h3>
            <p class="section-subtitle">Manage your focus areas for CBSE Class 10</p>
          </div>
        </div>

        <div class="subject-grid">
          <div class="subject-card">
            <div class="subject-icon math"><span class="material-symbols-outlined">architecture</span></div>
            <div>
              <h4>Mathematics</h4>
            </div>
            <button class="subject-btn math">Start Learning</button>
          </div>
          <div class="subject-card" id="scienceBtn">
            <div class="subject-icon science"><span class="material-symbols-outlined">science</span></div>
            <div>
              <h4>Science</h4>
            </div>
            <button class="subject-btn science">Start Learning</button>
          </div>
          <div class="subject-card">
            <div class="subject-icon sst"><span class="material-symbols-outlined">public</span></div>
            <div>
              <h4>Social Science</h4>
            </div>
            <button class="subject-btn sst">Start Learning</button>
          </div>
          <div class="subject-card">
            <div class="subject-icon english"><span class="material-symbols-outlined">menu_book</span></div>
            <div>
              <h4>English</h4>
            </div>
            <button class="subject-btn english">Start Learning</button>
          </div>
          <div class="subject-card">
            <div class="subject-icon hindi"><span style="font-size: 28px; font-weight: 800; font-family: var(--font-headline);">अ</span></div>
            <div>
              <h4>Hindi</h4>
            </div>
            <button class="subject-btn hindi">Start Learning</button>
          </div>
        </div>

        <div class="streak-section">
          <div class="streak-card-wide">
            <div class="streak-info">
              <div class="streak-icon-wrap">
                <span class="material-symbols-outlined">local_fire_department</span>
              </div>
              <div>
                <div class="streak-days-val">0 Days</div>
                <div class="streak-label-text">Active Study Streak</div>
              </div>
            </div>
            <div class="streak-week-wrap">
              <div class="week-label">Current Week Progress</div>
              <div class="streak-week">
                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- CHAPTERS VIEW -->
      <div id="chaptersView" class="hidden">
        <div class="chapters-header">
          <button class="back-btn" id="backToSubjectsBtn"><span class="material-symbols-outlined">arrow_back</span></button>
          <h1 id="chaptersTitle">Science Chapters</h1>
        </div>
        <p class="section-subtitle" style="padding-left: 88px; margin-top: -12px;">Select a chapter to study</p>
        <div class="chapter-list" id="chapterListContainer">
        </div>
      </div>

      <!-- NOTEBOOK VIEW (Chat) -->
      <div id="notebookView" class="chat-layout hidden">
        <div class="chat-panel">
          
          <div class="chat-area hide-scrollbar" id="chatArea">
            <div class="chat-welcome" id="chatWelcome">

              <p>Ask questions, solve doubts, or generate study materials for Metals and Non-Metals.</p>
              <div class="chat-suggestions">
                <button class="chat-suggestion-chip" data-q="What are the physical properties of metals?">Properties of Metals</button>
                <button class="chat-suggestion-chip" data-q="Explain the reactivity series">Reactivity Series</button>
                <button class="chat-suggestion-chip" data-q="What is corrosion?">Corrosion</button>
              </div>
            </div>
          </div>

          <div class="chat-composer">
            <div class="gemini-composer-box">
              <textarea class="gemini-input" id="composerInput" placeholder="Ask Academic Pulse" autocomplete="off" rows="1"></textarea>
              <div class="gemini-footer">
                <div class="gemini-footer-left study-toolbar" style="margin-bottom: 0;">
                  <button class="toolbar-btn quiz-tb" id="quizBtn"><span class="material-symbols-outlined">quiz</span> Generate Quiz</button>
                  <button class="toolbar-btn flash-tb" id="flashcardsBtn"><span class="material-symbols-outlined">style</span> Flashcards</button>
                  <button class="toolbar-btn mind-tb" id="mindmapBtn"><span class="material-symbols-outlined">account_tree</span> Mind Map</button>
                  <button class="toolbar-btn converse-tb" id="converseBtn"><span class="material-symbols-outlined">record_voice_over</span> Live Session</button>
                </div>
                <div class="gemini-footer-right">
                  <button class="gemini-icon-btn disabled" id="sendBtn" disabled><span class="material-symbols-outlined">arrow_upward</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="topic-panel">
          <div class="topic-card">
            <div class="topic-card-title"><span class="material-symbols-outlined">psychology</span> Current Topic</div>
            <div class="topic-insight">
              <div class="topic-insight-dot"></div>
              <p><strong>Reactivity Series:</strong> Metals arranged in order of decreasing activities.</p>
            </div>
            <div class="topic-insight">
              <div class="topic-insight-dot"></div>
              <p>Highly reactive metals: K, Na, Ca, Mg</p>
            </div>
          </div>
          <div class="expert-cta">
            <span class="material-symbols-outlined bg-icon">bolt</span>
            <h3>Need more help?</h3>
            <p>Can't solve a complex concept? Try our interactive voice viva to test your knowledge.</p>
            <a href="https://interview.shaurya.ikshvaku-innovations.in/?session=77d734ab-22cc-4482-8f68-ab5bc6724db2" target="_blank" style="text-decoration:none;"><button class="expert-cta-btn" id="expertVivaBtn" style="color:var(--secondary)">Start Voice Viva</button></a>
          </div>
        </div>
      </div>

      <!-- AUDIO OVERVIEW VIEW -->
      <div id="audioOverviewView" class="hidden">
        <div class="ao-container">
          <div class="ao-back-row">
            <button class="ao-back-btn" id="aoBackBtn">
              <span class="material-symbols-outlined">arrow_back</span>
              Study Tools
            </button>
          </div>
          <div id="aoContent" style="width: 100%;">
            <!-- Form / Loading / Player will be rendered here dynamically -->
          </div>
        </div>
      </div>

      <!-- GAMES VIEW -->
      <div id="gamesView" class="hidden">
        <div id="gamesContent"></div>
      </div>

      <!-- EXPERIENTIAL LEARNING VIEW -->
      <div id="experimentView" class="hidden">
        <div class="el-back-row">
          <button class="el-back-btn" id="elBackBtn">
            <span class="material-symbols-outlined">arrow_back</span>
            Study Tools
          </button>
        </div>
        <div id="elContent" style="display: flex; flex-direction: column; width: 100%; flex: 1; overflow: hidden;"></div>
      </div>

      <!-- PROFILE VIEW -->
      <div id="profileView" class="hidden">
        <div class="profile-view" id="profileContent">
          <!-- Profile content will be rendered here -->
        </div>
      </div>
    </div>
  </div>
`

  // ── DOM References ─────────────────────────────────────────
  const chatArea = document.getElementById('chatArea')!
  const chatWelcome = document.getElementById('chatWelcome')!
  const composerInput = document.getElementById('composerInput') as HTMLTextAreaElement
  const sendBtn = document.getElementById('sendBtn')!
  const flashcardsBtn = document.getElementById('flashcardsBtn')!
  const quizBtn = document.getElementById('quizBtn')!
  const mindmapBtn = document.getElementById('mindmapBtn')!
  const converseBtn = document.getElementById('converseBtn')!

  const dashboardView = document.getElementById('dashboardView')!
  const chaptersView = document.getElementById('chaptersView')!
  const notebookView = document.getElementById('notebookView')!
  const papersView = document.getElementById('papersView')!
  const navPapers = document.getElementById('navPapers')!
  const createPaperBtn = document.getElementById('createPaperBtn')!
  const backToSubjectsBtn = document.getElementById('backToSubjectsBtn')!
  const navStudyTools = document.getElementById('navStudyTools')!
  const studyToolsView = document.getElementById('studyToolsView')!
  const audioOverviewView = document.getElementById('audioOverviewView')!
  const gamesView = document.getElementById('gamesView')!
  const experimentView = document.getElementById('experimentView')!
  const sidebarProfileBtn = document.getElementById('sidebarProfileBtn')!
  const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn')!

  const mentorView = document.getElementById('mentorView')!
  const mentorChatArea = document.getElementById('mentorChatArea')!
  const mentorComposerInput = document.getElementById('mentorComposerInput') as HTMLTextAreaElement
  const mentorSendBtn = document.getElementById('mentorSendBtn')!

  let mentorChatHistory: ChatMessage[] = []
  let isMentorSending = false

  sidebarLogoutBtn?.addEventListener('click', () => {
    showLogoutConfirmation()
  })

  function showLogoutConfirmation() {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay logout-dialog visible'
    modal.innerHTML = `
      <div class="modal-content logout-confirm-card">
        <div class="logout-icon-wrap">
          <span class="material-symbols-outlined">logout</span>
        </div>
        <h2>Ready to leave?</h2>
        <p>Your current streak is safe, but we'll be here whenever you're ready to master the next chapter!</p>
        <div class="logout-actions">
          <button class="logout-btn-cancel" id="cancelLogout">Keep Learning</button>
          <button class="logout-btn-confirm" id="confirmLogout">Logout</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)

    document.getElementById('cancelLogout')?.addEventListener('click', () => {
      modal.classList.remove('visible')
      setTimeout(() => modal.remove(), 300)
    })

    document.getElementById('confirmLogout')?.addEventListener('click', () => {
      localStorage.removeItem('pulse_user_id')
      window.location.href = '/login'
    })
  }

  sidebarProfileBtn?.addEventListener('click', () => {
    routeTo('/profile')
  })

  function routeTo(path: string) {
    history.pushState(null, '', path)
    applyRoute()
  }

  function applyRoute() {
    const path = window.location.pathname
    if (path === '/' || path === '/landing' || path === '/landingpage' || path === '/login') {
      window.location.href = path
      return
    }

    dashboardView.classList.add('hidden')
    chaptersView.classList.add('hidden')
    notebookView.classList.add('hidden')
    papersView.classList.add('hidden')
    studyToolsView.classList.add('hidden')
    mentorView.classList.add('hidden')
    audioOverviewView.classList.add('hidden')
    gamesView.classList.add('hidden')
    experimentView.classList.add('hidden')
    document.getElementById('profileView')?.classList.add('hidden')
    document.getElementById('aiPredictorView')?.classList.add('hidden')
    document.getElementById('topbarStudyInfo')?.classList.add('hidden')
    document.getElementById('notebookBackBtnTop')?.classList.add('hidden')

    // Clear all active classes from sidebar nav items
    const navItems = document.querySelectorAll('.sidebar .nav-item')
    navItems.forEach(item => item.classList.remove('active'))

    const topbarTitleEl = document.getElementById('topbarTitle')
    const topbarChapterTitleEl = document.getElementById('topbarChapterTitle')
    const topbarStudyInfoEl = document.getElementById('topbarStudyInfo')
    const notebookBackBtnTopEl = document.getElementById('notebookBackBtnTop')

    if (path.startsWith('/chapter')) {
      chaptersView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Subject Chapters'
    } else if (path.startsWith('/study-tools')) {
      studyToolsView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Study Tools'
    } else if (path.startsWith('/study')) {
      notebookView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Study Session'
      if (topbarStudyInfoEl) topbarStudyInfoEl.classList.remove('hidden')
      if (notebookBackBtnTopEl) notebookBackBtnTopEl.classList.remove('hidden')

      // Auto load RAG for this chapter ID from DB
      const parts = path.split('/')
      if (parts.length >= 4) {
        const chapterId = parseInt(parts[3], 10)
        if (!isNaN(chapterId)) {
          // Find chapter title from syllabi
          let foundTitle = ''
          Object.values(syllabi).forEach((chapters: any) => {
            const ch = chapters.find((c: any) => c.id === chapterId)
            if (ch) foundTitle = `Chapter ${ch.chapter_number}: ${ch.title}`
          })
          if (topbarChapterTitleEl && foundTitle) topbarChapterTitleEl.textContent = foundTitle
          loadChapterRAG(chapterId)
        }
      }
    } else if (path.startsWith('/mentor')) {
      mentorView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'AI Mentor'
      if (notebookBackBtnTopEl) notebookBackBtnTopEl.classList.remove('hidden')
    } else if (path.startsWith('/audio-overview')) {
      audioOverviewView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Audio Overview'
      initAudioOverviewView()
    } else if (path.startsWith('/games/')) {
      gamesView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Games Hub'
      const gameType = path.split('/')[2] as GameType
      initGameScreen(gameType)
    } else if (path === '/games') {
      gamesView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Games Hub'
      initGamesHub()
    } else if (path.startsWith('/experiential-learning') || path.startsWith('/experiment')) {
      experimentView.classList.remove('hidden')
      navStudyTools.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Experiential Learning'
      if (path.includes('/canvas')) {
        initExperimentCanvas()
      } else {
        initExperimentForm()
      }
    } else if (path.startsWith('/papers')) {
      papersView.classList.remove('hidden')
      navPapers.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Board Papers'
      refreshPapersView()
    } else if (path.startsWith('/predictor')) {
      document.getElementById('aiPredictorView')?.classList.remove('hidden')
      if (topbarTitleEl) topbarTitleEl.textContent = 'AI Paper Predictor'
      // navPredictor is removed from sidebar
    } else if (path === '/profile') {
      document.getElementById('profileView')?.classList.remove('hidden')
      sidebarProfileBtn?.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'User Profile'
      initProfilePage()
    } else {
      dashboardView.classList.remove('hidden')
      document.getElementById('navDashboard')?.classList.add('active')
      if (topbarTitleEl) topbarTitleEl.textContent = 'Dashboard'
    }
  }

  async function initProfilePage() {
    const profileContent = document.getElementById('profileContent')
    if (!profileContent) return

    profileContent.innerHTML = `<div class="game-loading"><div class="game-loading-spinner"></div><p>Fetching your achievements...</p></div>`

    const userId = localStorage.getItem('pulse_user_id')
    if (!userId) {
      profileContent.innerHTML = `<div class="game-error"><p>Please log in to view your profile.</p></div>`
      return
    }

    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileErr) throw profileErr

      const { data: scores, error: scoresErr } = await supabase
        .from('game_scores')
        .select('points, accuracy, played_at')
        .eq('user_id', userId)

      if (scoresErr) throw scoresErr

      const dailyPoints: Record<string, number> = {}
      let totalAccuracy = 0
      scores.forEach(s => {
        const date = new Date(s.played_at).toLocaleDateString('en-CA')
        dailyPoints[date] = (dailyPoints[date] || 0) + s.points
        totalAccuracy += s.accuracy || 0
      })

      const avgAccuracy = scores.length > 0 ? Math.round(totalAccuracy / scores.length) : 0

      let streak = 0
      const todayStr = new Date().toLocaleDateString('en-CA')
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toLocaleDateString('en-CA')

      if ((dailyPoints[todayStr] || 0) > 10) {
        streak = 0
        let d = new Date()
        while (true) {
          const dStr = d.toLocaleDateString('en-CA')
          if ((dailyPoints[dStr] || 0) > 10) { streak++; d.setDate(d.getDate() - 1); } else break;
        }
      } else if ((dailyPoints[yesterdayStr] || 0) > 10) {
        streak = 0
        let d = new Date(yesterday)
        while (true) {
          const dStr = d.toLocaleDateString('en-CA')
          if ((dailyPoints[dStr] || 0) > 10) { streak++; d.setDate(d.getDate() - 1); } else break;
        }
      }

      renderProfileUI(profileContent, {
        name: profile.full_name,
        email: profile.username,
        avatarUrl: profile.avatar_url,
        points: profile.total_pulse_points,
        streak: streak,
        accuracy: avgAccuracy,
        quizzes: scores.length,
        grade: profile.grade_level,
        board: profile.board
      })

      // Animate stats
      setTimeout(() => {
        animateCount('profPoints', 0, profile.total_pulse_points, 1000)
        animateCount('profStreak', 0, streak, 1000)
        animateCount('profAccuracy', 0, avgAccuracy, 1000)
      }, 100);

    } catch (err) {
      console.error('Failed to init profile:', err)
      profileContent.innerHTML = `<div class="game-error"><p>Failed to load profile. Please try again.</p></div>`
    }
  }

  function renderProfileUI(container: HTMLElement, data: any) {
    container.innerHTML = `
    <div class="profile-container">
      <div class="profile-header-card">
        <div class="profile-avatar-large">
          <span class="material-symbols-outlined">account_circle</span>
        </div>
        <div class="profile-identity">
          <h2>${escapeHtml(data.name)}</h2>
          <p>${escapeHtml(data.email)}</p>
        </div>
      </div>

      <div class="profile-stats-row">
        <div class="profile-stat-card">
          <div class="stat-icon-box icon-points"><span class="material-symbols-outlined">emoji_events</span></div>
          <div class="stat-value" id="profPoints">0</div>
          <div class="stat-label">Pulse Points</div>
        </div>
        <div class="profile-stat-card">
          <div class="stat-icon-box icon-streak"><span class="material-symbols-outlined">local_fire_department</span></div>
          <div class="stat-value" id="profStreak">0</div>
          <div class="stat-label">Active Streak</div>
        </div>
        <div class="profile-stat-card">
          <div class="stat-icon-box icon-accuracy"><span class="material-symbols-outlined">target</span></div>
          <div class="stat-value" id="profAccuracy">0%</div>
          <div class="stat-label">Avg. Accuracy</div>
        </div>
      </div>

      <div class="profile-details-grid">
        <div class="details-section-card">
          <h3><span class="material-symbols-outlined">info</span> Academic Details</h3>
          <div class="detail-item">
            <span class="detail-label">Grade Level</span>
            <span class="detail-value">Class ${data.grade}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Board</span>
            <span class="detail-value">${data.board}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Target %</span>
            <span class="detail-value">95%</span>
          </div>
        </div>
        <div class="details-section-card">
          <h3><span class="material-symbols-outlined">analytics</span> Activity Summary</h3>
          <div class="detail-item">
            <span class="detail-label">Games Played</span>
            <span class="detail-value">${data.quizzes}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Quizzes Taken</span>
            <span class="detail-value">8</span>
          </div>
        </div>
      </div>

      </div>
    </div>
  `
  }

  function animateCount(id: string, start: number, end: number, duration: number) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentVal = Math.floor(progress * (end - start) + start);
      obj.innerHTML = currentVal + (id === 'profAccuracy' ? '%' : '');
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  window.addEventListener('popstate', applyRoute)

  navPapers.addEventListener('click', () => routeTo('/papers'))
  document.getElementById('navDashboard')?.addEventListener('click', () => routeTo('/dashboard'))
  navStudyTools.addEventListener('click', () => routeTo('/study-tools'))

  document.getElementById('stMentorBtn')?.addEventListener('click', () => routeTo('/mentor'))
  document.getElementById('stAudioBtn')?.addEventListener('click', () => routeTo('/audio-overview'))
  document.getElementById('aoBackBtn')?.addEventListener('click', () => routeTo('/study-tools'))
  document.getElementById('stExperimentBtn')?.addEventListener('click', () => routeTo('/experiential-learning'))
  document.getElementById('elBackBtn')?.addEventListener('click', () => routeTo('/study-tools'))

  function initExperimentForm() {
    const elContent = document.getElementById('elContent')!
    elContent.innerHTML = renderExperimentForm()
    bindExperimentFormEvents(() => {
      routeTo('/experiential-learning/canvas')
    })
  }

  function initExperimentCanvas() {
    const elContent = document.getElementById('elContent')!
    elContent.innerHTML = renderExperimentCanvas()
    initExperiment()
  }

  function addMentorMessage(text: string, sender: 'user' | 'ai') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const row = document.createElement('div')
    row.className = `msg-row ${sender}`

    if (sender === 'ai') {
      row.innerHTML = `
      <div class="msg-avatar-wrap">
        <div class="msg-avatar"><img src="/Pulse.jpeg" alt="Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" /></div>
      </div>
      <div class="msg-content">
        <div class="msg-bubble ai-bubble">${text}</div>
        <div class="msg-timestamp">${time}</div>
      </div>
    `
    } else {
      row.innerHTML = `
      <div class="msg-content">
        <div class="msg-bubble user-bubble">${escapeHtml(text)}</div>
        <div class="msg-timestamp">${time}</div>
      </div>
    `
    }

    mentorChatArea.appendChild(row)
    mentorChatArea.scrollTop = mentorChatArea.scrollHeight
    return row
  }

  function showMentorTypingIndicator(): HTMLDivElement {
    const row = document.createElement('div')
    row.className = 'msg-row ai'
    row.id = 'mentorTypingIndicator'
    row.innerHTML = `
    <div class="msg-avatar-wrap">
      <div class="msg-avatar"><img src="/Pulse.jpeg" alt="Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" /></div>
    </div>
    <div class="msg-content">
      <div class="msg-bubble ai-bubble" style="padding: 12px 18px; min-height: unset; min-width: unset; background: var(--surface-container-highest);">
        <div class="typing-dots-container">
          <span class="typing-dot" style="background: #888; animation-delay: 0s;"></span>
          <span class="typing-dot" style="background: #888; animation-delay: 0.2s;"></span>
          <span class="typing-dot" style="background: #888; animation-delay: 0.4s;"></span>
        </div>
      </div>
    </div>
  `
    mentorChatArea.appendChild(row)
    mentorChatArea.scrollTop = mentorChatArea.scrollHeight
    return row
  }

  async function handleMentorSend() {
    const text = mentorComposerInput.value.trim()
    if (!text || isMentorSending) return

    isMentorSending = true
    mentorComposerInput.value = ''
    mentorComposerInput.disabled = true
    mentorComposerInput.style.height = 'auto' // Reset height
    mentorSendBtn.classList.add('disabled')
    mentorSendBtn.setAttribute('disabled', 'true')

    const welcome = mentorChatArea.querySelector('.chat-welcome') as HTMLElement
    if (welcome) welcome.style.display = 'none'

    mentorChatHistory.push({ role: 'user', text })
    addMentorMessage(text, 'user')
    const aiRow = showMentorTypingIndicator()

    try {
      const bubbleEl = aiRow.querySelector('.msg-bubble')!
      const loaderEl = aiRow.querySelector('.typing-pulse-ring') as HTMLElement | null
      const streamState = { fullText: '', lastRendered: '', frame: 0, completed: false }

      const renderStreamFrame = () => {
        if (streamState.fullText !== streamState.lastRendered) {
          streamState.lastRendered = streamState.fullText
          bubbleEl.classList.remove('typing-indicator-bubble')
          bubbleEl.innerHTML = renderMarkdown(streamState.fullText) + '<span class="typing-caret" aria-hidden="true"></span>'

          // Only scroll if user is near bottom
          const isNearBottom = mentorChatArea.scrollHeight - mentorChatArea.scrollTop <= mentorChatArea.clientHeight + 200
          if (isNearBottom) {
            mentorChatArea.scrollTop = mentorChatArea.scrollHeight
          }
        }
        if (streamState.completed) {
          bubbleEl.classList.remove('typing-bubble')
          bubbleEl.innerHTML = renderMarkdown(streamState.fullText)
          if (loaderEl) loaderEl.remove()
          const statusEl = aiRow.querySelector('.ai-status')
          if (statusEl) statusEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return
        }
        streamState.frame = window.requestAnimationFrame(renderStreamFrame)
      }

      window.requestAnimationFrame(renderStreamFrame)

      const result = await runMultiAgent(
        text,
        mentorChatHistory,
        (fullText) => { streamState.fullText = fullText },
        (status) => {
          const statusEl = aiRow.querySelector('.ai-status')
          if (statusEl) {
            statusEl.textContent = status
            statusEl.classList.remove('typing-status-shimmer')
          }
        }
      )

      streamState.completed = true
      mentorChatHistory.push({ role: 'assistant', text: result.response })
      aiRow.removeAttribute('id')
    } catch (err) {
      console.error('Mentor chat error:', err)
      aiRow.remove()
      addMentorMessage('Sorry, I am having trouble connecting right now. Please try again.', 'ai')
    } finally {
      isMentorSending = false
      mentorSendBtn.classList.remove('disabled')
      mentorSendBtn.removeAttribute('disabled')
      mentorComposerInput.disabled = false
      mentorComposerInput.focus()
    }
  }

  mentorSendBtn.addEventListener('click', handleMentorSend)

  mentorComposerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      mentorSendBtn.click();
    }
  })

  mentorComposerInput.addEventListener('input', () => {
    mentorComposerInput.style.height = 'auto';
    const maxHeight = 160;
    const newHeight = Math.min(mentorComposerInput.scrollHeight, maxHeight);
    mentorComposerInput.style.height = newHeight + 'px';
    mentorComposerInput.style.overflowY = mentorComposerInput.scrollHeight > maxHeight ? 'auto' : 'hidden';

    if (mentorComposerInput.value.trim().length > 0) {
      mentorSendBtn.removeAttribute('disabled')
      mentorSendBtn.classList.remove('disabled')
    } else {
      mentorSendBtn.setAttribute('disabled', 'true')
      mentorSendBtn.classList.add('disabled')
    }
  });
  // mentorBackBtn removed
  document.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('.mentor-suggestion-chip') as HTMLElement
    if (chip) {
      mentorComposerInput.value = chip.dataset.q || ''
      handleMentorSend()
    }
  })

  document.getElementById('stGamesBtn')?.addEventListener('click', () => routeTo('/games'))

  // ── Games Module Integration ────────────────────────────
  function initGamesHub() {
    const gamesContent = document.getElementById('gamesContent')!
    gamesContent.innerHTML = renderGamesHub()
    bindGamesHubEvents(
      gamesContent,
      () => routeTo('/study-tools'),
      (gameType: GameType) => routeTo(`/games/${gameType}`)
    )
  }

  function initGameScreen(gameType: GameType) {
    const gamesContent = document.getElementById('gamesContent')!
    renderGameScreen(gameType, gamesContent, () => routeTo('/games'))
  }



  // ── Board Papers Integration ─────────────────────────────
  let cachedPapers: BoardPaper[] = []

  async function refreshPapersView() {
    const container = document.getElementById('papersTableContainer')
    if (!container) return

    container.innerHTML = '<div class="bp-loading-state"><div class="spinner"></div><p>Loading papers...</p></div>'

    try {
      cachedPapers = await loadPapers()
      container.innerHTML = renderPapersTable(cachedPapers)
      bindPaperActions()
    } catch (err) {
      console.error('Failed to load papers:', err)
      container.innerHTML = '<div class="bp-empty-state"><p>Failed to load papers. Please try again.</p></div>'
    }
  }

  function bindPaperActions() {
    // Open paper buttons
    document.querySelectorAll('.bp-open-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const paperId = parseInt((btn as HTMLElement).dataset.paperId || '0')
        const paper = cachedPapers.find(p => p.id === paperId)
        if (paper) openPaperView(paper)
      })
    })

    // Upload answer buttons
    document.querySelectorAll('.bp-upload-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const paperId = parseInt((btn as HTMLElement).dataset.paperId || '0')
        const paper = cachedPapers.find(p => p.id === paperId)
        if (paper) showUploadDialog(paper, () => refreshPapersView())
      })
    })

    // View results buttons
    document.querySelectorAll('.bp-results-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const paperId = parseInt((btn as HTMLElement).dataset.paperId || '0')
        const paper = cachedPapers.find(p => p.id === paperId)
        if (paper) openResultsView(paper)
      })
    })
  }

  createPaperBtn.addEventListener('click', async () => {
    const subjectsList = await loadSubjects()
    showCreatePaperDialog(subjectsList, () => {
      // Start polling for paper completion
      refreshPapersView()
      const pollInterval = setInterval(async () => {
        const papers = await loadPapers()
        const generating = papers.some(p => p.status === 'generating' || p.status === 'evaluating')
        cachedPapers = papers
        const container = document.getElementById('papersTableContainer')
        if (container) {
          container.innerHTML = renderPapersTable(papers)
          bindPaperActions()
        }
        if (!generating) clearInterval(pollInterval)
      }, 5000) // Poll every 5 seconds
    })
  })

  document.querySelectorAll('.subject-btn').forEach(btn => {
    if (btn.classList.contains('ai-btn')) return;

    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement
      if (target.classList.contains('math')) {
        renderSubjectChapters('math', 'Mathematics')
      } else if (target.classList.contains('science')) {
        renderSubjectChapters('science', 'Science')
      } else if (target.classList.contains('sst')) {
        renderSubjectChapters('sst', 'Social Science')
      } else if (target.classList.contains('english')) {
        renderSubjectChapters('english', 'English')
      } else if (target.classList.contains('hindi')) {
        renderSubjectChapters('hindi', 'Hindi')
      }
      routeTo('/chapter')
    })
  })

  backToSubjectsBtn.addEventListener('click', () => routeTo('/dashboard'))
  document.getElementById('notebookBackBtnTop')?.addEventListener('click', () => {
    const path = window.location.pathname
    if (path.startsWith('/mentor')) {
      routeTo('/study-tools')
    } else {
      routeTo('/chapter')
    }
  })

  // ── Audio Overview Logic ─────────────────────────────────
  let aoAudioEl: HTMLAudioElement | null = null
  let aoAnimFrame: number | null = null

  function initAudioOverviewView() {
    const aoContent = document.getElementById('aoContent')!
    renderAudioForm(aoContent)
  }

  function renderAudioForm(container: HTMLElement) {
    // Build subject options from syllabi
    const subjectEntries = Object.keys(syllabi)
    const subjectOptions = subjectEntries.map(key => {
      const titleMap: Record<string, string> = {
        'science': 'Science', 'math': 'Mathematics', 'sst': 'Social Science',
        'english': 'English', 'hindi': 'Hindi'
      }
      return `<option value="${key}">${titleMap[key] || key}</option>`
    }).join('')

    container.innerHTML = `
    <div class="ao-form-card">
      <div class="ao-header">
        <h1><span class="ao-emoji">🎧</span> Audio Overview</h1>
        <p>AI-powered podcast lessons from your study material</p>
      </div>

      <div class="ao-form-group" style="margin-top: 32px;">
        <label>Select Subject</label>
        <select id="aoSubjectSelect">
          <option value="" disabled selected>Select a subject</option>
          ${subjectOptions}
        </select>
      </div>
      <div class="ao-form-group">
        <label>Chapter</label>
        <select id="aoChapterSelect" disabled>
          <option value="" disabled selected>Select a subject first</option>
        </select>
      </div>
      <div class="ao-form-group">
        <label>Mode</label>
        <div class="ao-mode-selector">
          <div class="ao-mode-card selected" data-mode="full">
            <div class="ao-mode-icon"><span class="material-symbols-outlined">auto_stories</span></div>
            <h4>Full Chapter</h4>
            <p>Complete overview of all topics</p>
          </div>
          <div class="ao-mode-card" data-mode="topic">
            <div class="ao-mode-icon"><span class="material-symbols-outlined">target</span></div>
            <h4>Specific Topic</h4>
            <p>Focus on one concept</p>
          </div>
        </div>
      </div>
      <div class="ao-topic-group" id="aoTopicGroup">
        <div class="ao-form-group" style="margin-bottom:0">
          <label>Topic</label>
          <input type="text" id="aoTopicInput" placeholder="e.g., Reactivity Series, Corrosion..." />
        </div>
      </div>

      <div class="ao-form-group">
        <label>Choose Podcast Style</label>
        <p class="ao-form-hint">Pick how you want the explanation to feel</p>
        <div class="ao-theme-grid">
          <div class="ao-theme-card selected" data-theme="standard">
            <h4>Standard Learning</h4>
            <p>Calm, structured, teacher-like</p>
          </div>
          <div class="ao-theme-card" data-theme="story">
            <h4>Story-Based</h4>
            <p>Concepts through scenarios</p>
          </div>
          <div class="ao-theme-card" data-theme="dramatic">
            <h4>Dramatic</h4>
            <p>Intense, empathetic delivery</p>
          </div>
          <div class="ao-theme-card" data-theme="fun">
            <h4>Fun & Engaging</h4>
            <p>Light, energetic, playful</p>
          </div>
          <div class="ao-theme-card" data-theme="revision">
            <h4>Quick Revision</h4>
            <p>Fast-paced, key points only</p>
          </div>
        </div>
      </div>

      <div class="ao-form-group">
        <label>Select Language</label>
        <select id="aoLanguageSelect">
          <option value="english" selected>English</option>
          <option value="hindi">Hindi (हिंदी)</option>
        </select>
      </div>

      <button class="ao-generate-btn" id="aoGenerateBtn">
        <span class="material-symbols-outlined">podcasts</span>
        Create Podcast
      </button>
    </div>
  `

    // Wire subject → chapter cascade
    const subjectSelect = document.getElementById('aoSubjectSelect') as HTMLSelectElement
    const chapterSelect = document.getElementById('aoChapterSelect') as HTMLSelectElement

    subjectSelect.addEventListener('change', () => {
      const subjectKey = subjectSelect.value
      const chapters = syllabi[subjectKey] || []
      chapterSelect.disabled = false
      chapterSelect.innerHTML = '<option value="" disabled selected>Select a chapter</option>' +
        chapters.map((ch: any) => `<option value="${ch.id}" data-title="${ch.title}">Ch ${ch.chapter_number}: ${ch.title}</option>`).join('')
    })

    // Wire mode selector
    let selectedMode: 'full' | 'topic' = 'full'
    const modeCards = container.querySelectorAll('.ao-mode-card')
    const topicGroup = document.getElementById('aoTopicGroup')!

    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('selected'))
        card.classList.add('selected')
        selectedMode = (card as HTMLElement).dataset.mode as 'full' | 'topic'
        if (selectedMode === 'topic') {
          topicGroup.classList.add('visible')
        } else {
          topicGroup.classList.remove('visible')
        }
      })
    })

    // Wire theme selector
    let selectedTheme: PodcastTheme = 'standard'
    const themeCards = container.querySelectorAll('.ao-theme-card')
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        themeCards.forEach(c => c.classList.remove('selected'))
        card.classList.add('selected')
        selectedTheme = (card as HTMLElement).dataset.theme as PodcastTheme
      })
    })

    // Wire generate button
    const generateBtn = document.getElementById('aoGenerateBtn') as HTMLButtonElement
    generateBtn.addEventListener('click', async () => {
      const subjectId = subjectSelect.value
      const chapterOpt = chapterSelect.selectedOptions[0]
      if (!subjectId || !chapterOpt || !chapterOpt.value) {
        alert('Please select a subject and chapter.')
        return
      }

      const topicInput = document.getElementById('aoTopicInput') as HTMLInputElement
      if (selectedMode === 'topic' && !topicInput.value.trim()) {
        alert('Please enter a topic.')
        return
      }

      const titleMap: Record<string, string> = {
        'science': 'Science', 'math': 'Mathematics', 'sst': 'Social Science',
        'english': 'English', 'hindi': 'Hindi'
      }

      const input: AudioOverviewInput = {
        subjectId,
        subjectTitle: titleMap[subjectId] || subjectId,
        chapterId: parseInt(chapterOpt.value),
        chapterTitle: chapterOpt.dataset.title || 'Chapter',
        model: import.meta.env.VITE_LLM_MODEL_TTS || 'gemini-2.5-flash-preview-tts',
        mode: selectedMode,
        topic: selectedMode === 'topic' ? topicInput.value.trim() : undefined,
        theme: selectedTheme,
        language: (document.getElementById('aoLanguageSelect') as HTMLSelectElement).value as PodcastLanguage,
      }

      // Show loading
      renderAudioLoading(container)

      try {
        const result = await generateAudioOverview(input, (stage, _detail) => {
          updateLoadingStage(stage)
        })
        renderAudioPlayer(container, input, result)
      } catch (err: any) {
        if (err.message === 'NO_CONTENT') {
          renderNoContent(container)
        } else {
          console.error('Audio overview error:', err)
          renderNoContent(container, 'An error occurred while generating the audio. Please try again.')
        }
      }
    })
  }

  function renderAudioLoading(container: HTMLElement) {
    container.innerHTML = `
    <div class="ao-loading-overlay">
      <div class="ao-loading-stages">
        <div class="ao-stage active" id="aoStageFetching">
          <div class="ao-stage-icon"><span class="material-symbols-outlined">database</span></div>
          <div class="ao-stage-text">
            <h4>Fetching Content</h4>
            <p>Retrieving chapter data from database...</p>
          </div>
        </div>
        <div class="ao-stage" id="aoStageScripting">
          <div class="ao-stage-icon"><span class="material-symbols-outlined">edit_note</span></div>
          <div class="ao-stage-text">
            <h4>Writing Script</h4>
            <p>AI is crafting your podcast script...</p>
          </div>
        </div>
        <div class="ao-stage" id="aoStageConverting">
          <div class="ao-stage-icon"><span class="material-symbols-outlined">graphic_eq</span></div>
          <div class="ao-stage-text">
            <h4>Generating Audio</h4>
            <p>Converting script to speech...</p>
          </div>
        </div>
        <div class="ao-stage" id="aoStageComplete">
          <div class="ao-stage-icon"><span class="material-symbols-outlined">check_circle</span></div>
          <div class="ao-stage-text">
            <h4>Ready!</h4>
            <p>Your podcast is ready to play</p>
          </div>
        </div>
      </div>
    </div>
  `
  }

  function updateLoadingStage(currentStage: string) {
    const stages = ['fetching', 'scripting', 'converting', 'complete']
    const currentIdx = stages.indexOf(currentStage)

    stages.forEach((stage, idx) => {
      const el = document.getElementById(`aoStage${stage.charAt(0).toUpperCase() + stage.slice(1)}`)
      if (!el) return
      el.classList.remove('active', 'done')
      if (idx < currentIdx) el.classList.add('done')
      else if (idx === currentIdx) el.classList.add('active')
    })
  }

  function renderNoContent(container: HTMLElement, msg?: string) {
    container.innerHTML = `
    <div class="ao-no-content">
      <div class="ao-no-icon"><span class="material-symbols-outlined">info</span></div>
      <h3>Content Not Available Yet</h3>
      <p>${msg || 'This chapter doesn\'t have study content in the database yet. Try Science → Chapter 3 (Metals & Non-Metals) which has full content available.'}</p>
      <button class="ao-back-link" id="aoRetryBtn">
        <span class="material-symbols-outlined">arrow_back</span>
        Go back and try another chapter
      </button>
    </div>
  `
    document.getElementById('aoRetryBtn')?.addEventListener('click', () => renderAudioForm(container))
  }

  function renderAudioPlayer(container: HTMLElement, input: AudioOverviewInput, result: { audioUrl: string, script: string, durationEstimate: string }) {
    const topicLabel = input.mode === 'topic' && input.topic
      ? input.topic
      : 'Full Chapter'

    container.innerHTML = `
    <div class="ao-player-card" id="aoPlayerCard">
      <!-- Left Column: Media Information & Controls -->
      <div class="ao-player-left">
        <div class="ao-player-avatar">
          <span class="material-symbols-outlined">podcasts</span>
        </div>

        <div class="ao-player-info">
          <div class="ao-player-badge">${input.subjectTitle}</div>
          <h3>${input.chapterTitle}</h3>
          <p>${topicLabel}</p>
        </div>

        <div class="ao-progress-wrap">
          <div class="ao-progress-bar" id="aoProgressBar">
            <div class="ao-progress-fill" id="aoProgressFill"></div>
          </div>
          <div class="ao-time-row">
            <span id="aoCurrentTime">0:00</span>
            <span id="aoTotalTime">0:00</span>
          </div>
        </div>

        <div class="ao-controls">
          <button class="ao-ctrl-btn" id="aoRewindBtn" title="Rewind 10s">
            <span class="material-symbols-outlined">replay_10</span>
          </button>
          <button class="ao-ctrl-btn ao-play-btn" id="aoPlayBtn">
            <span class="material-symbols-outlined" id="aoPlayIcon">play_arrow</span>
          </button>
          <button class="ao-ctrl-btn" id="aoForwardBtn" title="Forward 10s">
            <span class="material-symbols-outlined">forward_10</span>
          </button>
        </div>

        <div class="ao-speed-wrap">
          <button class="ao-speed-pill active" data-speed="1">1x</button>
          <button class="ao-speed-pill" data-speed="1.25">1.25x</button>
          <button class="ao-speed-pill" data-speed="1.5">1.5x</button>
          <button class="ao-speed-pill" data-speed="2">2x</button>
        </div>

        <button class="ao-new-btn" id="aoNewPodcastBtn">
          <span class="material-symbols-outlined">add</span>
          Create New
        </button>
      </div>

      <!-- Right Column: Transcript -->
      <div class="ao-player-right">
        <div class="ao-transcript-header">
          <span class="material-symbols-outlined">article</span>
          Full Transcript
        </div>
        <div class="ao-transcript-content" id="aoTranscriptBody">
          <div class="ao-transcript-text">${result.script}</div>
        </div>
      </div>
    </div>

    </div>
  `

    // Create audio element
    if (aoAudioEl) {
      aoAudioEl.pause()
      aoAudioEl = null
    }
    aoAudioEl = new Audio(result.audioUrl)

    const playerCard = document.getElementById('aoPlayerCard')!
    const playBtn = document.getElementById('aoPlayBtn')!
    const rewindBtn = document.getElementById('aoRewindBtn')!
    const forwardBtn = document.getElementById('aoForwardBtn')!
    const progressBar = document.getElementById('aoProgressBar')!
    const progressFill = document.getElementById('aoProgressFill')!
    const currentTimeEl = document.getElementById('aoCurrentTime')!
    const totalTimeEl = document.getElementById('aoTotalTime')!

    function formatTime(seconds: number): string {
      const m = Math.floor(seconds / 60)
      const s = Math.floor(seconds % 60)
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    function updateProgress() {
      if (!aoAudioEl) return
      const pct = aoAudioEl.duration ? (aoAudioEl.currentTime / aoAudioEl.duration) * 100 : 0
      progressFill.style.width = `${pct}%`
      currentTimeEl.textContent = formatTime(aoAudioEl.currentTime)
      if (aoAudioEl.duration && isFinite(aoAudioEl.duration)) {
        totalTimeEl.textContent = formatTime(aoAudioEl.duration)
      }
      if (!aoAudioEl.paused) {
        aoAnimFrame = requestAnimationFrame(updateProgress)
      }
    }

    // Play / Pause
    playBtn.addEventListener('click', () => {
      if (!aoAudioEl) return
      if (aoAudioEl.paused) {
        aoAudioEl.play()
        playBtn.querySelector('.material-symbols-outlined')!.textContent = 'pause'
        playerCard.classList.add('playing')
        aoAnimFrame = requestAnimationFrame(updateProgress)
      } else {
        aoAudioEl.pause()
        playBtn.querySelector('.material-symbols-outlined')!.textContent = 'play_arrow'
        playerCard.classList.remove('playing')
        if (aoAnimFrame) cancelAnimationFrame(aoAnimFrame)
      }
    })

    // Rewind 10s
    rewindBtn.addEventListener('click', () => {
      if (!aoAudioEl) return
      aoAudioEl.currentTime = Math.max(0, aoAudioEl.currentTime - 10)
      updateProgress()
    })

    // Forward 10s
    forwardBtn.addEventListener('click', () => {
      if (!aoAudioEl) return
      aoAudioEl.currentTime = Math.min(aoAudioEl.duration || 0, aoAudioEl.currentTime + 10)
      updateProgress()
    })

    // Seek on progress bar click
    progressBar.addEventListener('click', (e) => {
      if (!aoAudioEl || !aoAudioEl.duration) return
      const rect = progressBar.getBoundingClientRect()
      const pct = (e.clientX - rect.left) / rect.width
      aoAudioEl.currentTime = pct * aoAudioEl.duration
      updateProgress()
    })

    // Audio ended
    aoAudioEl.addEventListener('ended', () => {
      playBtn.querySelector('.material-symbols-outlined')!.textContent = 'play_arrow'
      playerCard.classList.remove('playing')
      if (aoAnimFrame) cancelAnimationFrame(aoAnimFrame)
    })

    // Metadata loaded
    aoAudioEl.addEventListener('loadedmetadata', () => {
      if (aoAudioEl && isFinite(aoAudioEl.duration)) {
        totalTimeEl.textContent = formatTime(aoAudioEl.duration)
      }
    })

    // Speed pills
    const speedPills = container.querySelectorAll('.ao-speed-pill')
    speedPills.forEach(pill => {
      pill.addEventListener('click', () => {
        speedPills.forEach(p => p.classList.remove('active'))
        pill.classList.add('active')
        const speed = parseFloat((pill as HTMLElement).dataset.speed || '1')
        if (aoAudioEl) aoAudioEl.playbackRate = speed
      })
    })



    // New podcast button
    document.getElementById('aoNewPodcastBtn')?.addEventListener('click', () => {
      if (aoAudioEl) {
        aoAudioEl.pause()
        aoAudioEl = null
      }
      if (aoAnimFrame) cancelAnimationFrame(aoAnimFrame)
      renderAudioForm(container)
    })
  }

  // Initialize path-based view
  applyRoute()

  // ── Markdown → HTML Renderer ──────────────────────────────
  function renderMarkdown(md: string): string {
    let html = md

    // Escape HTML entities
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Headings (### heading)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')

    // Bold (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    // Italic (*text*)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

    // Inline code (`text`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Blockquotes (> text)
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

    // Inline Figures ([FIGURE:X.X])
    // Produce single-line HTML so the line processor doesn't split it
    html = html.replace(/\[FIGURE:(\d+\.\d+)\]/g, (_match, figNum) => {
      // Always resolve from /img/ directly — the images are stored as /public/img/3.1.png etc.
      const imgSrc = `/img/${figNum}.png`
      const caption = `Figure ${figNum}`

      return `<figure class="inline-figure"><img class="figure-img" src="${imgSrc}" onerror="this.onerror=null;this.src='/img/${figNum}.jpg'" alt="${caption}" /><figcaption>${caption}</figcaption></figure>`
    })


    // Process lines into paragraphs, lists, tables, etc.
    const lines = html.split('\n')
    const processed: string[] = []
    let inList = false
    let listType = '' // 'ul' or 'ol'
    let inTable = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // ── Table detection ──
      // A table row starts and ends with | (or just contains |)
      const isTableRow = /^\|(.+)\|$/.test(line)
      const isSeparator = /^\|[\s\-:|]+\|$/.test(line)

      if (isTableRow || isSeparator) {
        // Close any open list first
        if (inList) {
          processed.push(`</${listType}>`)
          inList = false
          listType = ''
        }

        if (isSeparator) {
          // This is the header separator line (|---|---|), skip it
          continue
        }

        // Parse cells from the row
        const cells = line
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => c.trim())

        if (!inTable) {
          // Start a new table — this first row is the header
          processed.push('<table>')
          processed.push('<thead><tr>')
          cells.forEach(cell => {
            processed.push(`<th>${cell}</th>`)
          })
          processed.push('</tr></thead>')
          processed.push('<tbody>')
          inTable = true
          continue
        }

        // Subsequent rows are body rows
        processed.push('<tr>')
        cells.forEach(cell => {
          processed.push(`<td>${cell}</td>`)
        })
        processed.push('</tr>')
        continue
      }

      // Close table if we were in one and hit a non-table line
      if (inTable) {
        processed.push('</tbody></table>')
        inTable = false
      }

      // Unordered list items
      if (line.match(/^- (.+)/)) {
        if (!inList || listType !== 'ul') {
          if (inList) processed.push(`</${listType}>`)
          processed.push('<ul>')
          inList = true
          listType = 'ul'
        }
        processed.push(`<li>${line.replace(/^- /, '')}</li>`)
        continue
      }

      // Ordered list items
      if (line.match(/^\d+\.\s(.+)/)) {
        if (!inList || listType !== 'ol') {
          if (inList) processed.push(`</${listType}>`)
          processed.push('<ol>')
          inList = true
          listType = 'ol'
        }
        processed.push(`<li>${line.replace(/^\d+\.\s/, '')}</li>`)
        continue
      }

      // Close any open list
      if (inList) {
        processed.push(`</${listType}>`)
        inList = false
        listType = ''
      }

      // Skip empty lines
      if (!line) {
        continue
      }

      // Headings, blockquotes, and figure blocks are already wrapped
      if (line.startsWith('<h') || line.startsWith('<blockquote') || line.startsWith('<figure') || line.startsWith('</figure') || line.startsWith('<img') || line.startsWith('<figcaption')) {
        processed.push(line)
        continue
      }

      // Regular paragraphs
      processed.push(`<p>${line}</p>`)
    }

    // Close any trailing open structures
    if (inTable) {
      processed.push('</tbody></table>')
    }
    if (inList) {
      processed.push(`</${listType}>`)
    }

    return processed.join('\n')
  }

  // ── RAG Initialization ────────────────────────────────────
  function showRAGStatus(msg: string) {
    console.log('RAG status:', msg)
  }

  function hideRAGStatus() {
    // Popup removed
  }

  function loadChapterRAG(chapterId: number) {
    if (activeRAGChapterId === chapterId) return; // Prevent double load

    activeRAGChapterId = chapterId;
    composerInput.placeholder = 'Loading latest study material from database...'
    composerInput.disabled = true

    initRAG(chapterId, (msg) => {
      showRAGStatus(msg)
    }).then(() => {
      hideRAGStatus()
      composerInput.disabled = false
      composerInput.placeholder = 'Ask Academic Pulse'
    }).catch((err) => {
      console.error('RAG init failed:', err)
      composerInput.placeholder = 'Error loading materials. Try refreshing.'
    })
  }

  // ── Chat Logic ─────────────────────────────────────────────
  function hideWelcome() {
    if (chatWelcome) {
      chatWelcome.style.display = 'none'
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }




  function normalizeFigureTokens(text: string): string {
    // If the model writes "Figure 3.1" / "Fig. 3.1" / "[Figure 3.1]",
    // normalize to [FIGURE:3.1]
    // so the renderer can reliably mount the matching image.
    //
    // Notes:
    // - We only normalize chapter-style decimals like 3.1, 3.12 etc.
    // - We avoid touching already-tokenized segments.
    return text.replace(
      /(?<!\[FIGURE:)\[?(?:\bFigure\b|\bFig\.?\b)\s*(\d+\.\d+)\]?/gi,
      (_m, figNum: string) => `[FIGURE:${figNum}]`
    )
  }



  function addMessage(text: string, sender: 'user' | 'ai') {
    hideWelcome()
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const row = document.createElement('div')
    row.className = `msg-row ${sender}`

    if (sender === 'ai') {
      row.innerHTML = `
      <div class="msg-avatar-wrap">
        <div class="msg-avatar"><img src="/Pulse.jpeg" alt="Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" /></div>
      </div>
      <div class="msg-content">
        <div class="msg-bubble ai-bubble">${text}</div>
        <div class="msg-timestamp">${time}</div>
      </div>
    `
    } else {
      row.innerHTML = `
      <div class="msg-content">
        <div class="msg-bubble user-bubble">${escapeHtml(text)}</div>
        <div class="msg-timestamp">${time}</div>
      </div>
    `
    }

    chatArea.appendChild(row)
    chatArea.scrollTop = chatArea.scrollHeight
    return row
  }

  function showTypingIndicator(): HTMLDivElement {
    hideWelcome()
    const row = document.createElement('div')
    row.className = 'msg-row ai'
    row.id = 'typingIndicator'
    row.innerHTML = `
    <div class="msg-avatar-wrap">
      <div class="msg-avatar"><img src="/Pulse.jpeg" alt="Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" /></div>
    </div>
    <div class="msg-content">
      <div class="msg-bubble ai-bubble" style="padding: 12px 18px; min-height: unset; min-width: unset; background: var(--surface-container-highest);">
        <div class="typing-dots-container">
          <span class="typing-dot" style="background: #888; animation-delay: 0s;"></span>
          <span class="typing-dot" style="background: #888; animation-delay: 0.2s;"></span>
          <span class="typing-dot" style="background: #888; animation-delay: 0.4s;"></span>
        </div>
      </div>
    </div>
  `
    chatArea.appendChild(row)
    chatArea.scrollTop = chatArea.scrollHeight
    return row
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator')
    if (el) el.remove()
  }

  let isSending = false

  // Detect casual/greeting queries that don't need RAG retrieval
  function isCasualQuery(text: string): boolean {
    const casualPatterns = [
      /^(hi|hello|hey|hola|namaste|good\s*(morning|afternoon|evening))\b/i,
      /^(what do you do|who are you|what are you|what can you do)/i,
      /^(thanks|thank you|thx|ok|okay|got it|understood|cool|nice|great)/i,
      /^(bye|goodbye|see you|later)\b/i,
      /^(help|how do I use|how does this work)/i,
      /^(yes|yeah|yep|sure|continue|next|let'?s go|go ahead|start|proceed)\b/i,
      /^(skip|skip this|skip this topic|next topic|move on|i already know this|i know this already)\b/i,
    ]
    return casualPatterns.some(p => p.test(text.trim()))
  }

  async function handleSend() {
    const text = composerInput.value.trim()
    if (!text || isSending) return

    if (!isRAGReady()) {
      addMessage('⏳ Study material is still loading. Please wait a moment...', 'ai')
      return
    }

    isSending = true
    composerInput.value = ''
    composerInput.disabled = true
    composerInput.style.height = 'auto'

    sendBtn.classList.add('disabled')
    sendBtn.setAttribute('disabled', 'true')

    // Track the question for quiz topic generation
    userTopics.push(text)

    // Add user message to chat history
    chatHistory.push({ role: 'user', text })

    addMessage(text, 'user')
    const aiRow = showTypingIndicator()
    let stopTypingAnimation: (() => void) | null = null

    try {
      // Skip RAG for casual queries — send directly to LLM with just history
      const isCasual = isCasualQuery(text)
      const chunks = isCasual ? [] : await retrieveChunks(text, 5)

      // Get or create the bubble for streaming
      const bubbleEl = aiRow.querySelector('.msg-bubble')!
      const loaderEl = aiRow.querySelector('.typing-pulse-ring') as HTMLElement | null
      const streamState = {
        fullText: '',
        lastRendered: '',
        frame: 0 as number | 0,
        completed: false,
      }

      // ChatGPT-style: render markdown progressively as it streams in
      const renderStreamFrame = () => {
        if (streamState.fullText !== streamState.lastRendered) {
          streamState.lastRendered = streamState.fullText
          // Remove the dots indicator class once we start getting text
          bubbleEl.classList.remove('typing-indicator-bubble')
          // Render the current markdown and append cursor
          const rendered = renderMarkdown(streamState.fullText)
          bubbleEl.innerHTML = rendered + '<span class="typing-caret" aria-hidden="true"></span>'
          // Update status text to "typing" once content starts flowing
          const statusEl = aiRow.querySelector('.ai-status')
          if (statusEl && statusEl.textContent !== 'Academic Pulse AI is typing...') {
            statusEl.textContent = 'Academic Pulse AI is typing...'
            statusEl.classList.remove('typing-status-shimmer')
            statusEl.classList.add('ai-status')
          }
        }

        const distFromBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight
        if (distFromBottom < 150) {
          chatArea.scrollTop = chatArea.scrollHeight
        }

        if (streamState.completed) {
          streamState.frame = 0
          bubbleEl.classList.remove('typing-bubble')
          bubbleEl.classList.remove('typing-indicator-bubble')
          // Final render without cursor
          bubbleEl.innerHTML = renderMarkdown(streamState.fullText)

          if (loaderEl) loaderEl.remove()
          const statusEl = aiRow.querySelector('.ai-status')
          if (statusEl) {
            statusEl.classList.remove('typing-status-shimmer')
            statusEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          return
        }
        streamState.frame = window.requestAnimationFrame(renderStreamFrame)
      }


      streamState.frame = window.requestAnimationFrame(renderStreamFrame)
      stopTypingAnimation = () => {
        if (streamState.frame) window.cancelAnimationFrame(streamState.frame)
        streamState.completed = true
        bubbleEl.classList.remove('typing-bubble')
        bubbleEl.classList.remove('typing-indicator-bubble')
      }

      const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement
      const selectedLanguage = languageSelect ? languageSelect.value : 'English'

      const fullResponse = await chatWithContextStream(text, chunks, chatHistory, selectedLanguage, (fullText) => {
        const normalized = normalizeFigureTokens(fullText)
        streamState.fullText = normalized
      })

      streamState.completed = true

      const normalizedResponse = normalizeFigureTokens(fullResponse)

      // Add AI response to chat history
      chatHistory.push({ role: 'assistant', text: normalizedResponse })

      // Remove the typing indicator id so it doesn't get removed
      aiRow.removeAttribute('id')

      // ── Inline MCQ Tool: auto-generate quiz cards after explanations ──
      if (shouldGenerateInlineQuiz(normalizedResponse)) {
        // Show loading skeleton below the AI message
        const loadingSkeleton = renderMCQLoadingSkeleton()
        const mcqWrapper = document.createElement('div')
        mcqWrapper.className = 'msg-row ai inline-mcq-row'
        mcqWrapper.innerHTML = `
        <div class="msg-avatar-wrap" style="visibility:hidden;"><div class="msg-avatar" style="width:32px;height:32px;"></div></div>
        <div class="msg-content" style="width:100%;max-width:72%;"></div>
      `
        const mcqContent = mcqWrapper.querySelector('.msg-content')!
        mcqContent.appendChild(loadingSkeleton)
        chatArea.appendChild(mcqWrapper)
        chatArea.scrollTop = chatArea.scrollHeight

        // Generate MCQ questions in the background
        generateInlineMCQ(normalizedResponse).then(questions => {
          if (questions.length > 0) {
            const mcqCards = renderInlineMCQCards(questions)
            mcqContent.innerHTML = ''
            mcqContent.appendChild(mcqCards)
          } else {
            // No questions generated, remove the skeleton
            mcqWrapper.remove()
          }
          chatArea.scrollTop = chatArea.scrollHeight
        }).catch(err => {
          console.error('Inline MCQ generation failed:', err)
          mcqWrapper.remove()
        })
      }
    } catch (err) {
      console.error('Chat error:', err)
      if (stopTypingAnimation) stopTypingAnimation()
      const rowLoader = aiRow.querySelector('.typing-pulse-ring') as HTMLElement | null
      if (rowLoader) rowLoader.remove()
      removeTypingIndicator()
      addMessage(
        '<p>Sorry, something went wrong while generating the answer. Please try again.</p>',
        'ai'
      )
    } finally {
      isSending = false
      sendBtn.classList.remove('disabled')
      sendBtn.removeAttribute('disabled')
      composerInput.disabled = false
      composerInput.focus()
    }
  }

  sendBtn.addEventListener('click', handleSend)

  composerInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendBtn.click()
    }
  })

  composerInput.addEventListener('input', () => {
    composerInput.style.height = 'auto'
    const maxHeight = 160
    const newHeight = Math.min(composerInput.scrollHeight, maxHeight)
    composerInput.style.height = newHeight + 'px'
    composerInput.style.overflowY = composerInput.scrollHeight > maxHeight ? 'auto' : 'hidden'

    if (composerInput.value.trim().length > 0) {
      sendBtn.removeAttribute('disabled')
      sendBtn.classList.remove('disabled')
    } else {
      sendBtn.setAttribute('disabled', 'true')
      sendBtn.classList.add('disabled')
    }
  })

  // Suggestion chips
  document.querySelectorAll('.chat-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = (chip as HTMLElement).dataset.q || ''
      composerInput.value = q
      handleSend()
    })
  })

  // ── Study Resources Buttons ────────────────────────────────
  flashcardsBtn.addEventListener('click', () => {
    if (!isRAGReady()) {
      alert('Study material is still loading. Please wait.')
      return
    }
    openFlashcards()
  })

  quizBtn.addEventListener('click', () => {
    if (!isRAGReady()) {
      alert('Study material is still loading. Please wait.')
      return
    }
    openQuiz(userTopics.length > 0 ? userTopics : undefined)
  })

  mindmapBtn.addEventListener('click', () => {
    if (!isRAGReady()) {
      alert('Study material is still loading. Please wait.')
      return
    }
    openMindMap()
  })

  converseBtn.addEventListener('click', () => {
    window.open('https://victorious-mud-0d979dd1e.6.azurestaticapps.net/?session=77d734ab-22cc-4482-8f68-ab5bc6724db2', '_blank')
  })

  // Right panel toggle removed.

} // end startApp

