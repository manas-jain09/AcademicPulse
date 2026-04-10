import { generateMindMap } from './gemini'
import { getAllChunks } from './rag'
import mermaid from 'mermaid'

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  mindmap: {
    padding: 20,
    useMaxWidth: true,
  },
  securityLevel: 'loose',
})

function getModalContainer(): HTMLDivElement {
  let modal = document.getElementById('mindmapModal') as HTMLDivElement | null
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'mindmapModal'
    modal.className = 'modal-overlay'
    document.body.appendChild(modal)
  }
  return modal
}

function renderLoading(modal: HTMLDivElement) {
  modal.innerHTML = `
    <div class="modal-content mindmap-modal">
      <div class="modal-loading">
        <div class="spinner"></div>
        <p>Generating mind map from Chapter 3...</p>
        <p class="loading-sub">Creating visual overview</p>
      </div>
    </div>
  `
  modal.classList.add('visible')
}

function closeModal(modal: HTMLDivElement) {
  modal.classList.remove('visible')
  setTimeout(() => {
    modal.innerHTML = ''
  }, 300)
}

async function renderMindMap(modal: HTMLDivElement, mermaidCode: string) {
  modal.innerHTML = `
    <div class="modal-content mindmap-modal">
      <div class="modal-header">
        <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">account_tree</span> Memory Map — Metals and Non-Metals</h2>
        <button class="modal-close" id="mmClose"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="mindmap-body">
        <div class="mindmap-container" id="mindmapContainer">
          <div class="mindmap-rendering">
            <div class="spinner"></div>
            <p>Rendering diagram...</p>
          </div>
        </div>
      </div>
      <div class="mindmap-footer">
        <button class="quiz-submit-btn secondary" id="mmRegenerate"><span class="material-symbols-outlined" style="vertical-align:middle;font-size:16px;margin-right:4px">sync</span> Regenerate</button>
        <button class="quiz-submit-btn secondary" id="mmCloseBtn">Close</button>
      </div>
    </div>
  `

  document.getElementById('mmClose')!.addEventListener('click', () => closeModal(modal))
  document.getElementById('mmCloseBtn')!.addEventListener('click', () => closeModal(modal))
  document.getElementById('mmRegenerate')!.addEventListener('click', () => openMindMap())
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal)
  })

  // Render mermaid diagram
  const container = document.getElementById('mindmapContainer')!
  try {
    const { svg } = await mermaid.render('mindmap-svg', mermaidCode)
    container.innerHTML = svg

    // Make SVG responsive
    const svgEl = container.querySelector('svg')
    if (svgEl) {
      svgEl.style.maxWidth = '100%'
      svgEl.style.height = 'auto'
    }
  } catch (err) {
    console.error('Mermaid render error:', err)
    // Try a simplified fallback
    container.innerHTML = `
      <div class="mindmap-error">
        <p>⚠️ Could not render the mind map diagram.</p>
        <pre class="mindmap-code">${mermaidCode}</pre>
        <p class="loading-sub">Try clicking "Regenerate" for a new diagram.</p>
      </div>
    `
  }
}

export async function openMindMap() {
  const modal = getModalContainer()
  renderLoading(modal)

  try {
    const chunks = getAllChunks()
    const mermaidCode = await generateMindMap(chunks)

    if (!mermaidCode) {
      modal.innerHTML = `
        <div class="modal-content mindmap-modal">
          <div class="modal-header">
            <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">error</span> Mind Map Error</h2>
            <button class="modal-close" id="mmCloseErr"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="mindmap-body" style="text-align:center;padding:40px;">
            <p>Failed to generate mind map. Please try again.</p>
          </div>
        </div>
      `
      document.getElementById('mmCloseErr')!.addEventListener('click', () => closeModal(modal))
      return
    }

    await renderMindMap(modal, mermaidCode)
  } catch (err) {
    console.error('Mind map generation error:', err)
    modal.innerHTML = `
      <div class="modal-content mindmap-modal">
        <div class="modal-header">
          <h2><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">error</span> Mind Map Error</h2>
          <button class="modal-close" id="mmCloseErr2"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="mindmap-body" style="text-align:center;padding:40px;">
          <p>An error occurred while generating the mind map. Please try again.</p>
        </div>
      </div>
    `
    document.getElementById('mmCloseErr2')!.addEventListener('click', () => closeModal(modal))
  }
}
