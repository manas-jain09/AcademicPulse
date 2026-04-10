import { supabase } from './supabaseClient'
import { generateBoardPaper, evaluateBoardPaper } from './gemini'


// ── Types ──────────────────────────────────────────────────
export interface BoardPaper {
  id: number
  user_id: string
  subject_id: string
  subject_name: string
  paper_name: string
  difficulty: string
  status: string
  question_paper_json: any
  answer_sheet_storage_path: string | null
  evaluation_results: any
  score_obtained: number | null
  total_score: number | null
  created_at: string
}

interface Subject {
  id: string
  title: string
  icon_name: string
  color_hex: string
}

// ── State ──────────────────────────────────────────────────
let papers: BoardPaper[] = []
let subjects: Subject[] = []
let currentUserId: string | null = null

// ── Subject Colors/Icons ───────────────────────────────────
const SUBJECT_META: Record<string, { color: string; icon: string; gradient: string }> = {
  math: { color: '#2563eb', icon: 'functions', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)' },
  science: { color: '#9333ea', icon: 'science', gradient: 'linear-gradient(135deg, #9333ea, #a855f7)' },
  sst: { color: '#059669', icon: 'public', gradient: 'linear-gradient(135deg, #059669, #10b981)' },
  english: { color: '#ea580c', icon: 'menu_book', gradient: 'linear-gradient(135deg, #ea580c, #f97316)' },
  hindi: { color: '#e11d48', icon: 'language', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
}

// ── Get current user ───────────────────────────────────────
async function getUserId(): Promise<string> {
  if (currentUserId) return currentUserId
  const stored = localStorage.getItem('pulse_user_id')
  if (stored) {
    currentUserId = stored
    return stored
  }
  // Fallback: get first profile
  const { data } = await supabase.from('profiles').select('id').limit(1).single()
  const id = data?.id ?? ''
  currentUserId = id
  return id
}

// ── Load subjects from DB ──────────────────────────────────
export async function loadSubjects(): Promise<Subject[]> {
  if (subjects.length > 0) return subjects
  const { data } = await supabase.from('subjects').select('*')
  subjects = data || []
  return subjects
}

// ── Load papers from DB ────────────────────────────────────
export async function loadPapers(): Promise<BoardPaper[]> {
  const userId = await getUserId()
  const { data } = await supabase
    .from('user_papers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  papers = (data as BoardPaper[]) || []
  return papers
}

// ── Render papers view ─────────────────────────────────────
export function renderPapersTable(papersData: BoardPaper[]): string {
  if (papersData.length === 0) {
    return `
      <div class="bp-empty-state">
        <div class="bp-empty-icon"><span class="material-symbols-outlined">description</span></div>
        <h3>No Board Papers Yet</h3>
        <p>Create your first CBSE board paper and start practicing for your exams!</p>
      </div>
    `
  }

  // Check if any papers are in progress
  const inProgress = papersData.filter(p => p.status === 'generating' || p.status === 'evaluating')
  const completed = papersData.filter(p => p.status !== 'generating' && p.status !== 'evaluating')

  let html = ''

  // ── In-progress banner ──
  if (inProgress.length > 0) {
    const bannerCards = inProgress.map(p => {
      const meta = SUBJECT_META[p.subject_id] || SUBJECT_META.math
      const isGenerating = p.status === 'generating'
      return `
        <div class="bp-progress-card">
          <div class="bp-progress-pulse"></div>
          <div class="bp-progress-icon" style="background: ${meta.gradient}">
            <span class="material-symbols-outlined">${meta.icon}</span>
          </div>
          <div class="bp-progress-info">
            <div class="bp-progress-title">${p.paper_name}</div>
            <div class="bp-progress-status">
              <span class="material-symbols-outlined bp-spin" style="font-size:14px">sync</span>
              ${isGenerating ? 'Generating paper with AI — this may take up to 2 minutes...' : 'Evaluating your answers with CBSE marking scheme...'}
            </div>
          </div>
        </div>
      `
    }).join('')

    html += `<div class="bp-progress-section">${bannerCards}</div>`
  }

  // ── Completed papers table ──
  if (completed.length > 0 || inProgress.length > 0) {
    const allPapers = papersData
    const rows = allPapers.map((p, i) => {
      const meta = SUBJECT_META[p.subject_id] || SUBJECT_META.math
      const statusHtml = getStatusBadge(p.status)
      const date = new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const diffBadge = getDifficultyBadge(p.difficulty)
      const isInProgress = p.status === 'generating' || p.status === 'evaluating'

      return `
        <tr class="bp-table-row ${isInProgress ? 'bp-row-loading' : ''}" data-paper-id="${p.id}">
          <td class="bp-td-num">${i + 1}</td>
          <td class="bp-td-paper">
            <div class="bp-paper-info">
              <div class="bp-paper-icon" style="background: ${meta.gradient}">
                <span class="material-symbols-outlined">${meta.icon}</span>
              </div>
              <div>
                <div class="bp-paper-name">${p.paper_name}</div>
                <div class="bp-paper-meta">${p.subject_name || p.subject_id} · ${date}</div>
              </div>
            </div>
          </td>
          <td>${diffBadge}</td>
          <td>${statusHtml}</td>
          <td class="bp-td-score">${p.score_obtained !== null ? `<span class="bp-score">${p.score_obtained}<span class="bp-score-divider">/</span>${p.total_score}</span>` : '<span class="bp-score-na">—</span>'}</td>
          <td>
            <div class="bp-actions">
              <button class="bp-action-btn bp-open-btn" data-paper-id="${p.id}" title="Open Paper" ${p.status === 'generating' ? 'disabled' : ''}>
                <span class="material-symbols-outlined">picture_as_pdf</span>
              </button>
              <button class="bp-action-btn bp-upload-btn" data-paper-id="${p.id}" title="Upload Answer Sheet" ${p.status !== 'ready' && p.status !== 'evaluated' ? 'disabled' : ''}>
                <span class="material-symbols-outlined">upload_file</span>
              </button>
              <button class="bp-action-btn bp-results-btn" data-paper-id="${p.id}" title="View Results" ${p.status !== 'evaluated' ? 'disabled' : ''}>
                <span class="material-symbols-outlined">analytics</span>
              </button>
            </div>
          </td>
        </tr>
      `
    }).join('')

    html += `
      <div class="bp-table-wrapper">
        <table class="bp-table">
          <thead>
            <tr>
              <th style="width:50px">#</th>
              <th>Paper</th>
              <th style="width:100px">Difficulty</th>
              <th style="width:130px">Status</th>
              <th style="width:100px">Score</th>
              <th style="width:140px">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
  }

  return html
}

function getStatusBadge(status: string): string {
  const configs: Record<string, { label: string; class: string; icon: string }> = {
    generating: { label: 'Generating', class: 'bp-status-generating', icon: 'sync' },
    ready: { label: 'Ready', class: 'bp-status-ready', icon: 'check_circle' },
    evaluating: { label: 'Evaluating', class: 'bp-status-evaluating', icon: 'sync' },
    evaluated: { label: 'Evaluated', class: 'bp-status-evaluated', icon: 'verified' },
    error: { label: 'Error', class: 'bp-status-error', icon: 'error' },
  }
  const c = configs[status] || configs.error
  const spinning = status === 'generating' || status === 'evaluating' ? 'bp-spin' : ''
  return `<span class="bp-status-badge ${c.class}"><span class="material-symbols-outlined ${spinning}" style="font-size:14px">${c.icon}</span> ${c.label}</span>`
}

function getDifficultyBadge(diff: string): string {
  const configs: Record<string, { label: string; class: string }> = {
    easy: { label: 'Easy', class: 'bp-diff-easy' },
    medium: { label: 'Medium', class: 'bp-diff-medium' },
    hard: { label: 'Hard', class: 'bp-diff-hard' },
    mixed: { label: 'Mixed', class: 'bp-diff-mixed' },
  }
  const c = configs[diff] || configs.medium
  return `<span class="bp-diff-badge ${c.class}">${c.label}</span>`
}

// ── Create Paper Dialog ────────────────────────────────────
export function showCreatePaperDialog(subjectsList: Subject[], onCreated: () => void): void {
  // Remove existing overlay
  document.getElementById('createPaperOverlay')?.remove()

  const overlay = document.createElement('div')
  overlay.id = 'createPaperOverlay'
  overlay.className = 'modal-overlay visible'

  const subjectCards = subjectsList.map(s => {
    const meta = SUBJECT_META[s.id] || { color: '#6366f1', icon: 'school', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' }
    return `
      <button class="bp-subject-card" data-subject-id="${s.id}" data-subject-title="${s.title}">
        <div class="bp-subject-card-icon" style="background: ${meta.gradient}">
          <span class="material-symbols-outlined">${meta.icon}</span>
        </div>
        <span>${s.title}</span>
      </button>
    `
  }).join('')

  overlay.innerHTML = `
    <div class="modal-content bp-create-modal">
      <div class="modal-header">
        <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px;color:var(--primary)">add_circle</span>Create Board Paper</h2>
        <button class="modal-close" id="closeCreateDialog">&times;</button>
      </div>
      <div class="bp-create-body">
        <div class="bp-create-section">
          <label class="bp-create-label">Select Subject</label>
          <div class="bp-subject-grid">${subjectCards}</div>
        </div>
        <div class="bp-create-section">
          <label class="bp-create-label">Difficulty Level</label>
          <div class="bp-difficulty-grid">
            <button class="bp-diff-option" data-diff="easy">
              <span class="material-symbols-outlined">sentiment_satisfied</span>
              <span>Easy</span>
              <small>Direct NCERT questions</small>
            </button>
            <button class="bp-diff-option selected" data-diff="medium">
              <span class="material-symbols-outlined">balance</span>
              <span>Medium</span>
              <small>Standard board level</small>
            </button>
            <button class="bp-diff-option" data-diff="hard">
              <span class="material-symbols-outlined">local_fire_department</span>
              <span>Hard</span>
              <small>HOTS & competitive</small>
            </button>
            <button class="bp-diff-option" data-diff="mixed">
              <span class="material-symbols-outlined">tune</span>
              <span>Mixed</span>
              <small>Realistic distribution</small>
            </button>
          </div>
        </div>
        <button class="bp-generate-btn" id="generatePaperBtn" disabled>
          <span class="material-symbols-outlined">auto_awesome</span>
          Generate Paper
        </button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  let selectedSubject: { id: string; title: string } | null = null
  let selectedDifficulty = 'medium'

  // Subject selection
  overlay.querySelectorAll('.bp-subject-card').forEach(card => {
    card.addEventListener('click', () => {
      overlay.querySelectorAll('.bp-subject-card').forEach(c => c.classList.remove('selected'))
      card.classList.add('selected')
      selectedSubject = {
        id: (card as HTMLElement).dataset.subjectId!,
        title: (card as HTMLElement).dataset.subjectTitle!
      }
      updateGenerateBtn()
    })
  })

  // Difficulty selection
  overlay.querySelectorAll('.bp-diff-option').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.bp-diff-option').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      selectedDifficulty = (btn as HTMLElement).dataset.diff!
      updateGenerateBtn()
    })
  })

  function updateGenerateBtn() {
    const btn = document.getElementById('generatePaperBtn') as HTMLButtonElement
    btn.disabled = !selectedSubject
  }

  // Close dialog
  document.getElementById('closeCreateDialog')?.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

  // Generate paper
  document.getElementById('generatePaperBtn')?.addEventListener('click', async () => {
    if (!selectedSubject) return

    // Transform modal into a loading state
    const modalContent = overlay.querySelector('.modal-content')
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="bp-loading-dialog">
          <div class="bp-loading-animation">
            <div class="bp-loading-circle"></div>
            <span class="material-symbols-outlined bp-loading-icon">auto_awesome</span>
          </div>
          <h3>Generating your Board Paper...</h3>
          <p>Academic Pulse AI is crafting a high-quality ${selectedDifficulty} difficulty paper for ${selectedSubject.title}. This usually takes 15-30 seconds.</p>
          <div class="bp-loading-bar-container">
            <div class="bp-loading-bar"></div>
          </div>
        </div>
      `
    }

    try {
      const userId = await getUserId()
      
      // 1. Fetch some context chunks for the subject to ground the paper
      const { data: chunks } = await supabase
        .from('chapter_document_chunks')
        .select('content')
        .limit(20) // Get a good spread of content
      
      const contextStrings = chunks?.map(c => c.content) || []
      
      // 2. Generate paper via Gemini direct
      const paperJson = await generateBoardPaper(selectedSubject.title, selectedDifficulty, contextStrings)
      
      // 3. Save to database
      const { error: insertErr } = await supabase
        .from('user_papers')
        .insert({
          user_id: userId,
          subject_id: selectedSubject.id,
          subject_name: selectedSubject.title,
          paper_name: paperJson.title || `${selectedSubject.title} ${selectedDifficulty} Paper`,
          difficulty: selectedDifficulty,
          status: 'ready',
          question_paper_json: paperJson
        })

      if (insertErr) throw insertErr
    } catch (err) {
      console.error('Failed to generate paper:', err)
      alert('Failed to generate paper. Please try again.')
    }
    
    // Close modal and refresh table
    overlay.remove()
    onCreated() 
  })
}

// ── Open Paper in New Tab ──────────────────────────────────
export function openPaperView(paper: BoardPaper): void {
  if (!paper.question_paper_json) {
    alert('Paper is still being generated. Please wait.')
    return
  }

  const pj = paper.question_paper_json
  const meta = SUBJECT_META[paper.subject_id] || SUBJECT_META.math

  const sectionsHtml = (pj.sections || []).map((section: any) => {
    const questionsHtml = (section.questions || []).map((q: any) => {
      let questionBody = ''

      // ── Case-based question with passage ──
      if (q.passage || q.type === 'case') {
        questionBody += `<div class="pv-q-num">Q.${q.number} <span class="pv-marks">[${q.marks} Marks]</span></div>`
        if (q.text && q.text !== q.passage) {
          questionBody += `<div class="pv-q-title">${q.text}</div>`
        }
        if (q.passage) {
          questionBody += `<div class="pv-passage">${q.passage}</div>`
        }
        if (q.subQuestions && q.subQuestions.length > 0) {
          questionBody += `<div class="pv-subquestions">`
          q.subQuestions.forEach((sq: any) => {
            questionBody += `<div class="pv-subq"><span class="pv-subq-label">${escapeHtml(sq.label)}</span> ${escapeHtml(sq.text)} <span class="pv-marks-sm">[${sq.marks} Mark${sq.marks > 1 ? 's' : ''}]</span></div>`
          })
          questionBody += `</div>`
        }
      }
      // ── Multi-part question with parts array ──
      else if (q.parts && q.parts.length > 0) {
        questionBody += `<div class="pv-q-num">Q.${q.number} <span class="pv-marks">[${q.marks} Marks]</span></div>`
        if (q.text) {
          questionBody += `<div class="pv-q-text">${escapeHtml(q.text)}</div>`
        }
        questionBody += `<div class="pv-parts">`
        q.parts.forEach((part: any) => {
          questionBody += `<div class="pv-part"><span class="pv-part-label">${part.partLabel}</span> ${part.text} <span class="pv-marks-sm">[${part.marks} Mark${part.marks > 1 ? 's' : ''}]</span></div>`
        })
        questionBody += `</div>`
      }
      // ── MCQ ──
      else if (q.type === 'mcq' && q.options && q.options.length > 0) {
        questionBody += `<div class="pv-q-num">Q.${q.number} <span class="pv-marks">[${q.marks} Mark${q.marks > 1 ? 's' : ''}]</span></div>`
        questionBody += `<div class="pv-q-text">${q.text}</div>`
        questionBody += `<div class="pv-options">${q.options.map((o: string) => `<div class="pv-option">${o}</div>`).join('')}</div>`
      }
      // ── Standard question ──
      else {
        questionBody += `<div class="pv-q-num">Q.${q.number} <span class="pv-marks">[${q.marks} Mark${q.marks > 1 ? 's' : ''}]</span></div>`
        questionBody += `<div class="pv-q-text">${q.text}</div>`
      }

      // ── OR alternative ──
      if (q.orQuestion || q.hasOR) {
        questionBody += `<div class="pv-or-divider">OR</div>`
        const orQ = q.orQuestion || {}
        if (orQ.text) {
          questionBody += `<div class="pv-q-text">${orQ.text}</div>`
        }
        if (orQ.parts && orQ.parts.length > 0) {
          questionBody += `<div class="pv-parts">`
          orQ.parts.forEach((part: any) => {
            questionBody += `<div class="pv-part"><span class="pv-part-label">${part.partLabel}</span> ${part.text} <span class="pv-marks-sm">[${part.marks} Mark${part.marks > 1 ? 's' : ''}]</span></div>`
          })
          questionBody += `</div>`
        }
        if (orQ.subQuestions && orQ.subQuestions.length > 0) {
          if (orQ.passage) {
            questionBody += `<div class="pv-passage">${orQ.passage}</div>`
          }
          questionBody += `<div class="pv-subquestions">`
          orQ.subQuestions.forEach((sq: any) => {
            questionBody += `<div class="pv-subq"><span class="pv-subq-label">${sq.label}</span> ${sq.text} <span class="pv-marks-sm">[${sq.marks} Mark${sq.marks > 1 ? 's' : ''}]</span></div>`
          })
          questionBody += `</div>`
        }
      }

      return `<div class="pv-question">${questionBody}</div>`
    }).join('')

    return `
      <div class="pv-section">
        <div class="pv-section-header">
          <h3>${section.title || section.name}</h3>
          <span class="pv-section-meta">${section.type} · ${section.totalMarks || section.questions?.length * (section.questions?.[0]?.marks || 1)} Marks</span>
        </div>
        <p class="pv-section-instructions">${section.instructions || section.type}</p>
        <div class="pv-questions">${questionsHtml}</div>
      </div>
    `
  }).join('')

  const instructionsHtml = (pj.generalInstructions || []).map((inst: string) =>
    `<li>${inst}</li>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pj.title || paper.paper_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Be Vietnam Pro', sans-serif; background: #f5f5f5; color: #1a1b35; }
    .pv-container { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .pv-paper { background: #fff; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); overflow: hidden; }
    .pv-header { background: ${meta.gradient}; padding: 40px 48px; color: #fff; text-align: center; position: relative; }
    .pv-header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:4px; background: rgba(255,255,255,0.3); }
    .pv-cbse-badge { display:inline-block; background:rgba(255,255,255,0.2); padding:6px 16px; border-radius:20px; font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:16px; }
    .pv-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; }
    .pv-subtitle { font-size: 1rem; opacity: 0.9; }
    .pv-meta-row { display:flex; justify-content:center; gap:32px; margin-top:20px; font-size:0.85rem; font-weight:600; }
    .pv-meta-item { display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.15); padding:8px 16px; border-radius:12px; }

    .pv-instructions { padding: 32px 48px; border-bottom: 2px solid #f0f0f5; }
    .pv-instructions h3 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; color: #1a1b35; }
    .pv-instructions ol { padding-left: 20px; }
    .pv-instructions li { font-size: 0.88rem; line-height: 1.8; color: #4a4b6a; margin-bottom: 4px; }

    .pv-body { padding: 0 48px 48px; }
    .pv-section { margin-top: 36px; }
    .pv-section-header { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; background:linear-gradient(135deg, #f8f9ff, #eef2ff); border-radius:12px; margin-bottom:8px; }
    .pv-section-header h3 { font-family: 'Plus Jakarta Sans', sans-serif; font-size:1.05rem; font-weight:700; color:#1a1b35; }
    .pv-section-meta { font-size:0.78rem; font-weight:600; color:#6366f1; background:rgba(99,102,241,0.08); padding:4px 12px; border-radius:8px; }
    .pv-section-instructions { font-size:0.82rem; color:#6e7090; padding:8px 0 16px; font-style:italic; }

    .pv-question { padding: 20px 0; border-bottom: 1px solid #f0f0f5; }
    .pv-question:last-child { border-bottom: none; }
    .pv-q-num { font-size: 0.82rem; font-weight: 800; color: ${meta.color}; margin-bottom: 6px; letter-spacing: 0.02em; }
    .pv-q-title { font-size: 0.95rem; font-weight: 700; color: #1a1b35; margin-bottom: 10px; }
    .pv-q-text { font-size: 0.92rem; line-height: 1.7; color: #1a1b35; margin-bottom: 4px; }
    .pv-marks { font-weight: 700; font-size: 0.75rem; margin-left: 4px; }
    .pv-marks-sm { color: ${meta.color}; font-weight: 600; font-size: 0.72rem; opacity: 0.8; }

    .pv-passage { background: #f8f9ff; border-left: 3px solid ${meta.color}; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 10px 0 16px; font-size: 0.88rem; line-height: 1.8; color: #3a3b5a; font-style: italic; }

    .pv-subquestions { display: flex; flex-direction: column; gap: 10px; padding-left: 8px; }
    .pv-subq { font-size: 0.9rem; line-height: 1.6; color: #1a1b35; padding: 8px 12px; background: #fafbff; border-radius: 8px; border: 1px solid #e8e9f0; }
    .pv-subq-label { font-weight: 700; color: ${meta.color}; margin-right: 6px; }

    .pv-parts { display: flex; flex-direction: column; gap: 8px; padding-left: 8px; margin-top: 8px; }
    .pv-part { font-size: 0.9rem; line-height: 1.6; color: #1a1b35; padding: 6px 0; }
    .pv-part-label { font-weight: 700; color: #4a4b6a; margin-right: 6px; }

    .pv-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 0 0 8px; }
    .pv-option { font-size: 0.88rem; color: #4a4b6a; padding: 10px 16px; background: #fafbff; border-radius: 10px; border: 1px solid #e8e9f0; }
    .pv-or-divider { text-align:center; font-weight:800; color:${meta.color}; padding:16px 0; font-size:0.9rem; letter-spacing:0.1em; position: relative; }
    .pv-or-divider::before, .pv-or-divider::after { content:''; position:absolute; top:50%; width:calc(50% - 30px); height:1px; background:#e8e9f0; }
    .pv-or-divider::before { left:0; }
    .pv-or-divider::after { right:0; }

    .pv-footer { text-align:center; padding:24px; color:#8c8ea7; font-size:0.8rem; }
    .pv-print-bar { position:fixed; bottom:24px; right:24px; z-index:100; }
    .pv-print-btn { background:${meta.gradient}; color:#fff; border:none; padding:14px 28px; border-radius:16px; font-family:'Plus Jakarta Sans',sans-serif; font-weight:700; font-size:0.9rem; cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,0.15); display:flex; align-items:center; gap:8px; transition:transform 0.2s; }
    .pv-print-btn:hover { transform:scale(1.05); }
    @media print { .pv-print-bar { display:none; } .pv-container { padding:0; } .pv-paper { box-shadow:none; border-radius:0; } }
  </style>
</head>
<body>
  <div class="pv-container">
    <div class="pv-paper">
      <div class="pv-header">
        <div class="pv-cbse-badge">CBSE Board Examination 2025-26</div>
        <h1 class="pv-title">${escapeHtml(pj.title || paper.paper_name)}</h1>
        <p class="pv-subtitle">Subject Code: ${escapeHtml(pj.code || paper.subject_id?.toUpperCase())}</p>
        <div class="pv-meta-row">
          <div class="pv-meta-item"><span class="material-symbols-outlined" style="font-size:16px">timer</span> ${pj.duration || '3 hours'}</div>
          <div class="pv-meta-item"><span class="material-symbols-outlined" style="font-size:16px">grade</span> ${pj.totalMarks || 80} Marks</div>
          <div class="pv-meta-item"><span class="material-symbols-outlined" style="font-size:16px">calendar_today</span> ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
        </div>
      </div>

      <div class="pv-instructions">
        <h3>General Instructions</h3>
        <ol>${instructionsHtml || '<li>Read all questions carefully before answering.</li><li>All questions are compulsory.</li><li>Marks for each question are indicated against it.</li>'}</ol>
      </div>

      <div class="pv-body">
        ${sectionsHtml}
      </div>

      <div class="pv-footer">
        Generated by Academic Pulse AI · ${new Date().toLocaleString('en-IN')}
      </div>
    </div>
  </div>

  <div class="pv-print-bar">
    <button class="pv-print-btn" onclick="window.print()">
      <span class="material-symbols-outlined">print</span> Print Paper
    </button>
  </div>
</body>
</html>`

  const newTab = window.open('', '_blank')
  if (newTab) {
    newTab.document.write(html)
    newTab.document.close()
  }
}

// ── Upload Answer Sheet Dialog ─────────────────────────────
export function showUploadDialog(paper: BoardPaper, onUploaded: () => void): void {
  document.getElementById('uploadOverlay')?.remove()

  const overlay = document.createElement('div')
  overlay.id = 'uploadOverlay'
  overlay.className = 'modal-overlay visible'

  overlay.innerHTML = `
    <div class="modal-content bp-upload-modal">
      <div class="modal-header">
        <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px;color:var(--secondary)">upload_file</span>Upload Answer Sheet</h2>
        <button class="modal-close" id="closeUploadDialog">&times;</button>
      </div>
      <div class="bp-upload-body">
        <div class="bp-upload-info">
          <span class="material-symbols-outlined">info</span>
          <span>Upload your scanned answer sheet for <strong>${paper.paper_name}</strong>. Supported: PDF, JPG, PNG.</span>
        </div>
        <div class="bp-dropzone" id="dropzone">
          <div class="bp-dropzone-content">
            <span class="material-symbols-outlined bp-dropzone-icon">cloud_upload</span>
            <p class="bp-dropzone-text">Drag & drop your answer sheet here</p>
            <p class="bp-dropzone-sub">or click to browse files</p>
            <input type="file" id="answerFileInput" accept="image/jpeg,image/png,application/pdf,image/webp" style="display:none">
          </div>
          <div class="bp-file-preview hidden" id="filePreview">
            <span class="material-symbols-outlined">description</span>
            <div class="bp-file-info">
              <span id="fileName">—</span>
              <span id="fileSize">—</span>
            </div>
            <button class="bp-remove-file" id="removeFile">&times;</button>
          </div>
        </div>
        <button class="bp-upload-submit-btn" id="submitUploadBtn" disabled>
          <span class="material-symbols-outlined">cloud_upload</span>
          Upload & Evaluate
        </button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  let selectedFile: File | null = null
  const dropzone = document.getElementById('dropzone')!
  const fileInput = document.getElementById('answerFileInput') as HTMLInputElement
  const preview = document.getElementById('filePreview')!
  const dropContent = dropzone.querySelector('.bp-dropzone-content')!

  // Click to browse
  dropzone.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id !== 'removeFile') fileInput.click()
  })

  // Drag & drop
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('bp-dragover') })
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('bp-dragover'))
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropzone.classList.remove('bp-dragover')
    const files = e.dataTransfer?.files
    if (files && files.length > 0) selectFile(files[0])
  })

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) selectFile(fileInput.files[0])
  })

  function selectFile(file: File) {
    selectedFile = file
    document.getElementById('fileName')!.textContent = file.name
    document.getElementById('fileSize')!.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB'
    preview.classList.remove('hidden');
    (dropContent as HTMLElement).classList.add('hidden')
    const btn = document.getElementById('submitUploadBtn') as HTMLButtonElement
    btn.disabled = false
  }

  document.getElementById('removeFile')?.addEventListener('click', (e) => {
    e.stopPropagation()
    selectedFile = null
    preview.classList.add('hidden');
    (dropContent as HTMLElement).classList.remove('hidden')
    const btn = document.getElementById('submitUploadBtn') as HTMLButtonElement
    btn.disabled = true
  })

  // Close
  document.getElementById('closeUploadDialog')?.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

  // Submit
  document.getElementById('submitUploadBtn')?.addEventListener('click', async () => {
    if (!selectedFile) return

    const btn = document.getElementById('submitUploadBtn') as HTMLButtonElement
    btn.disabled = true
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin-right:8px"></div> Evaluating with AI...'

    try {
      // 1. Convert file to base64 for Gemini vision
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const res = reader.result as string
          resolve(res.split(',')[1]) // Remove data:mime/type;base64,
        }
        reader.readAsDataURL(selectedFile!)
      })
      
      const base64 = await base64Promise
      
      // 2. Direct Evaluation via Gemini Vision
      const results = await evaluateBoardPaper(paper.question_paper_json, base64, selectedFile.type)
      
      // 3. Save results to DB
      const { error: updateErr } = await supabase
        .from('user_papers')
        .update({
          evaluation_results: results,
          status: 'evaluated',
          score_obtained: results.totalMarksObtained,
          total_score: results.totalMarks || 80
        })
        .eq('id', paper.id)

      if (updateErr) throw updateErr

      overlay.remove()
      onUploaded()
    } catch (err: any) {
      console.error('Upload/evaluation error:', err)
      
      // REVERT STATUS TO READY (or error) so user can retry
      try {
        await supabase
          .from('user_papers')
          .update({ status: 'ready' })
          .eq('id', paper.id)
      } catch (dbErr) {
        console.error('Failed to revert status:', dbErr)
      }

      alert('Evaluation failed: ' + (err.message || 'Check your file and try again.'))
      btn.disabled = false
      btn.innerHTML = '<span class="material-symbols-outlined">cloud_upload</span> Upload & Evaluate'
      
      onUploaded() 
    }
  })
}

// ── Open Results in New Tab ────────────────────────────────
export function openResultsView(paper: BoardPaper): void {
  if (!paper.evaluation_results) {
    alert('Results are not available yet.')
    return
  }

  const results = paper.evaluation_results
  const meta = SUBJECT_META[paper.subject_id] || SUBJECT_META.math
  const percentage = results.percentage || (results.totalMarksObtained / results.totalMarks * 100)

  // Grade color
  const gradeColors: Record<string, string> = {
    A1: '#059669', A2: '#10b981', B1: '#3b82f6', B2: '#6366f1',
    C1: '#f59e0b', C2: '#f97316', D: '#ef4444', E: '#dc2626'
  }
  const gradeColor = gradeColors[results.grade] || '#6366f1'

  // Question-wise rows
  const qRows = (results.questionWise || []).map((q: any) => {
    const statusIcon = q.status === 'correct' ? '✅' : q.status === 'partial' ? '⚠️' : '❌'
    const statusClass = q.status === 'correct' ? 'rv-correct' : q.status === 'partial' ? 'rv-partial' : 'rv-incorrect'
    return `
      <tr class="${statusClass}">
        <td class="rv-td-center">${q.questionNumber}</td>
        <td class="rv-td-center">${statusIcon}</td>
        <td class="rv-td-center"><strong>${q.marksObtained}</strong>/${q.maxMarks}</td>
        <td>${q.feedback || '—'}</td>
      </tr>
    `
  }).join('')

  // Section-wise cards
  const sectionCards = (results.sectionWise || []).map((s: any) => {
    const pct = s.percentage || (s.marksObtained / s.totalMarks * 100)
    return `
      <div class="rv-section-card">
        <div class="rv-section-name">${s.title || 'Section ' + s.section}</div>
        <div class="rv-section-score">${s.marksObtained}/${s.totalMarks}</div>
        <div class="rv-section-bar"><div class="rv-section-fill" style="width:${pct}%;background:${meta.color}"></div></div>
        <div class="rv-section-pct">${Math.round(pct)}%</div>
      </div>
    `
  }).join('')

  // Topic-wise
  const topicCards = (results.topicWise || []).map((t: any) => {
    const statusEmoji = t.status === 'strong' ? '💪' : t.status === 'average' ? '📊' : '⚠️'
    return `
      <div class="rv-topic-card rv-topic-${t.status}">
        <span class="rv-topic-emoji">${statusEmoji}</span>
        <div>
          <div class="rv-topic-name">${t.topic}</div>
          <div class="rv-topic-score">${t.marksObtained}/${t.totalMarks}</div>
        </div>
      </div>
    `
  }).join('')

  const strengthsList = (results.strengths || []).map((s: string) => `<li>${s}</li>`).join('')
  const improvementsList = (results.areasForImprovement || []).map((a: string) => `<li>${a}</li>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Results — ${paper.paper_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Be Vietnam Pro', sans-serif; background: #f0f2f8; color: #1a1b35; }
    .rv-container { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }

    .rv-hero { background: ${meta.gradient}; border-radius: 24px; padding: 48px; color: #fff; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 12px 40px rgba(0,0,0,0.12); margin-bottom: 32px; }
    .rv-hero-left h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.8rem; font-weight: 800; margin-bottom: 6px; }
    .rv-hero-left p { opacity: 0.85; font-size: 0.95rem; }
    .rv-grade-badge { display:inline-block; background:rgba(255,255,255,0.2); padding:6px 16px; border-radius:12px; font-size:0.85rem; font-weight:700; margin-top:12px; }

    .rv-hero-right { text-align: center; }
    .rv-score-circle { width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid rgba(255,255,255,0.4); }
    .rv-score-big { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 2.5rem; font-weight: 800; }
    .rv-score-total { font-size: 0.85rem; opacity: 0.8; }
    .rv-score-pct { margin-top: 8px; font-size: 1.1rem; font-weight: 700; background:rgba(255,255,255,0.2); padding:4px 16px; border-radius:12px; }

    .rv-feedback-card { background:#fff; border-radius:20px; padding:32px; margin-bottom:24px; box-shadow:0 4px 16px rgba(0,0,0,0.04); }
    .rv-feedback-card h3 { font-family:'Plus Jakarta Sans',sans-serif; font-size:1.2rem; font-weight:700; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .rv-feedback-text { font-size:0.95rem; line-height:1.7; color:#4a4b6a; }

    .rv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .rv-strengths, .rv-improvements { background:#fff; border-radius:20px; padding:28px; box-shadow:0 4px 16px rgba(0,0,0,0.04); }
    .rv-strengths h3 { color:#059669; display:flex; align-items:center; gap:8px; font-family:'Plus Jakarta Sans',sans-serif; font-size:1.05rem; margin-bottom:14px; }
    .rv-improvements h3 { color:#f59e0b; display:flex; align-items:center; gap:8px; font-family:'Plus Jakarta Sans',sans-serif; font-size:1.05rem; margin-bottom:14px; }
    .rv-strengths ul, .rv-improvements ul { padding-left:20px; }
    .rv-strengths li, .rv-improvements li { font-size:0.9rem; line-height:1.7; color:#4a4b6a; margin-bottom:6px; }

    .rv-sections-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:16px; margin-bottom:24px; }
    .rv-section-card { background:#fff; border-radius:16px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.04); text-align:center; }
    .rv-section-name { font-weight:700; font-size:0.85rem; color:#6e7090; margin-bottom:8px; }
    .rv-section-score { font-family:'Plus Jakarta Sans',sans-serif; font-size:1.5rem; font-weight:800; color:#1a1b35; }
    .rv-section-bar { height:4px; background:#f0f0f5; border-radius:2px; margin:12px 0 6px; overflow:hidden; }
    .rv-section-fill { height:100%; border-radius:2px; transition:width 1s ease; }
    .rv-section-pct { font-size:0.78rem; font-weight:700; color:${meta.color}; }

    .rv-topics-grid { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; }
    .rv-topic-card { display:flex; align-items:center; gap:12px; background:#fff; border-radius:14px; padding:14px 18px; box-shadow:0 2px 8px rgba(0,0,0,0.04); border-left:4px solid #ccc; }
    .rv-topic-strong { border-left-color:#059669; }
    .rv-topic-average { border-left-color:#f59e0b; }
    .rv-topic-weak { border-left-color:#ef4444; }
    .rv-topic-emoji { font-size:1.5rem; }
    .rv-topic-name { font-weight:600; font-size:0.88rem; color:#1a1b35; }
    .rv-topic-score { font-size:0.78rem; color:#6e7090; }

    .rv-detail-card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.04); margin-bottom:24px; }
    .rv-detail-header { padding:24px 28px; border-bottom:1px solid #f0f0f5; }
    .rv-detail-header h3 { font-family:'Plus Jakarta Sans',sans-serif; font-size:1.15rem; font-weight:700; }
    .rv-detail-table { width:100%; border-collapse:collapse; }
    .rv-detail-table th { text-align:left; padding:12px 16px; background:#fafbff; font-size:0.78rem; font-weight:700; color:#6e7090; text-transform:uppercase; letter-spacing:0.05em; }
    .rv-detail-table td { padding:14px 16px; border-bottom:1px solid #f5f5fa; font-size:0.88rem; }
    .rv-td-center { text-align:center; }
    .rv-correct { background:rgba(5,150,105,0.03); }
    .rv-partial { background:rgba(245,158,11,0.03); }
    .rv-incorrect { background:rgba(239,68,68,0.03); }

    .rv-footer { text-align:center; padding:24px; color:#8c8ea7; font-size:0.8rem; }
    @media print { body { background:#fff; } .rv-container { padding:0; } }
    @media (max-width:768px) { .rv-hero { flex-direction:column; text-align:center; gap:24px; } .rv-grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <div class="rv-container">
    <div class="rv-hero">
      <div class="rv-hero-left">
        <h1>${paper.paper_name}</h1>
        <p>${paper.subject_name || paper.subject_id} · ${paper.difficulty} difficulty</p>
        <div class="rv-grade-badge" style="background:${gradeColor}40;color:${gradeColor}">Grade: ${results.grade || 'N/A'}</div>
      </div>
      <div class="rv-hero-right">
        <div class="rv-score-circle">
          <div class="rv-score-big">${results.totalMarksObtained}</div>
          <div class="rv-score-total">out of ${results.totalMarks}</div>
        </div>
        <div class="rv-score-pct">${Math.round(percentage)}%</div>
      </div>
    </div>

    <div class="rv-feedback-card">
      <h3><span class="material-symbols-outlined" style="color:${meta.color}">rate_review</span> Overall Evaluation</h3>
      <p class="rv-feedback-text">${results.overallFeedback || 'No overall feedback available.'}</p>
    </div>

    <div class="rv-grid">
      <div class="rv-strengths">
        <h3><span class="material-symbols-outlined">thumb_up</span> Strengths</h3>
        <ul>${strengthsList || '<li>N/A</li>'}</ul>
      </div>
      <div class="rv-improvements">
        <h3><span class="material-symbols-outlined">trending_up</span> Areas for Improvement</h3>
        <ul>${improvementsList || '<li>N/A</li>'}</ul>
      </div>
    </div>

    ${sectionCards ? `
    <div class="rv-feedback-card">
      <h3><span class="material-symbols-outlined" style="color:${meta.color}">bar_chart</span> Section-wise Performance</h3>
      <div class="rv-sections-grid">${sectionCards}</div>
    </div>` : ''}

    ${topicCards ? `
    <div class="rv-feedback-card">
      <h3><span class="material-symbols-outlined" style="color:${meta.color}">category</span> Topic-wise Analysis</h3>
      <div class="rv-topics-grid">${topicCards}</div>
    </div>` : ''}

    <div class="rv-detail-card">
      <div class="rv-detail-header">
        <h3><span class="material-symbols-outlined" style="color:${meta.color};vertical-align:middle;margin-right:8px">checklist</span> Question-by-Question Breakdown</h3>
      </div>
      <table class="rv-detail-table">
        <thead>
          <tr>
            <th style="width:60px">Q.No</th>
            <th style="width:60px">Status</th>
            <th style="width:80px">Marks</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>${qRows || '<tr><td colspan="4" style="text-align:center;color:#8c8ea7">No detailed breakdown available</td></tr>'}</tbody>
      </table>
    </div>

    <div class="rv-footer">
      Evaluated by Academic Pulse AI using CBSE Board Marking Guidelines · ${new Date().toLocaleString('en-IN')}
    </div>
  </div>
</body>
</html>`

  const newTab = window.open('', '_blank')
  if (newTab) {
    newTab.document.write(html)
    newTab.document.close()
  }
}function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
