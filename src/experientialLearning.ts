// ── Experiential Learning Module ────────────────────────────
// Interactive circuit-building experiment for Properties of Metals


export interface ExperimentConfig {
    subject: string
    chapter: string
    experiment: string
}


// ── Experiment Selection Form ──────────────────────────────
export function renderExperimentForm(): string {
    return `
   <div class="el-form-container">
     <div class="el-form-header">
       <div class="el-form-icon-wrap">
         <span class="material-symbols-outlined">science</span>
       </div>
       <div>
         <h2 class="el-form-title">Experiential Learning Lab</h2>
         <p class="el-form-subtitle">Select an experiment to begin your hands-on learning experience</p>
       </div>
     </div>


     <div class="el-form-body">
       <div class="el-form-group">
         <label class="el-form-label">
           <span class="material-symbols-outlined">menu_book</span>
           Subject
         </label>
         <div class="el-select-wrapper">
           <select id="elSubjectSelect" class="el-select">
             <option value="" disabled selected>Choose a subject</option>
             <option value="science">Science</option>
           </select>
           <span class="material-symbols-outlined el-select-arrow">expand_more</span>
         </div>
       </div>


       <div class="el-form-group">
         <label class="el-form-label">
           <span class="material-symbols-outlined">auto_stories</span>
           Chapter
         </label>
         <div class="el-select-wrapper">
           <select id="elChapterSelect" class="el-select" disabled>
             <option value="" disabled selected>Select a subject first</option>
           </select>
           <span class="material-symbols-outlined el-select-arrow">expand_more</span>
         </div>
       </div>


       <div class="el-form-group">
         <label class="el-form-label">
           <span class="material-symbols-outlined">biotech</span>
           Experiment
         </label>
         <div class="el-select-wrapper">
           <select id="elExperimentSelect" class="el-select" disabled>
             <option value="" disabled selected>Select a chapter first</option>
           </select>
           <span class="material-symbols-outlined el-select-arrow">expand_more</span>
         </div>
       </div>


       <button class="el-start-btn" id="elStartBtn" disabled>
         <span class="material-symbols-outlined">play_arrow</span>
         Start Experiment
       </button>
     </div>
   </div>
 `
}


// ── Bind form events ──────────────────────────────────────
export function bindExperimentFormEvents(onStartExperiment: (config: ExperimentConfig) => void) {
    const subjectSelect = document.getElementById('elSubjectSelect') as HTMLSelectElement
    const chapterSelect = document.getElementById('elChapterSelect') as HTMLSelectElement
    const experimentSelect = document.getElementById('elExperimentSelect') as HTMLSelectElement
    const startBtn = document.getElementById('elStartBtn') as HTMLButtonElement


    subjectSelect?.addEventListener('change', () => {
        if (subjectSelect.value === 'science') {
            chapterSelect.disabled = false
            chapterSelect.innerHTML = `
       <option value="" disabled selected>Choose a chapter</option>
       <option value="metals-nonmetals">Chapter 3: Metals and Non-Metals</option>
     `
        }
        experimentSelect.disabled = true
        experimentSelect.innerHTML = '<option value="" disabled selected>Select a chapter first</option>'
        startBtn.disabled = true
    })


    chapterSelect?.addEventListener('change', () => {
        if (chapterSelect.value === 'metals-nonmetals') {
            experimentSelect.disabled = false
            experimentSelect.innerHTML = `
       <option value="" disabled selected>Choose an experiment</option>
       <option value="properties-of-metal">Properties of Metal (Ductility & Conductivity)</option>
     `
        }
        startBtn.disabled = true
    })


    experimentSelect?.addEventListener('change', () => {
        startBtn.disabled = !experimentSelect.value
    })


    startBtn?.addEventListener('click', () => {
        onStartExperiment({
            subject: subjectSelect.value,
            chapter: chapterSelect.value,
            experiment: experimentSelect.value
        })
    })
}




// ── Render Experiment Canvas ──────────────────────────────
export function renderExperimentCanvas(): string {
    return `
    <div class="el-experiment-container" id="elExperimentContainer">
      
      <!-- Step 1 View -->
      <div class="el-step-view active" id="step1View">
         <div class="el-canvas-topbar">
           <div class="el-canvas-title-group">
             <h2>Step 1: Properties of Metal — Ductility</h2>
             <p>Metals can be drawn into thin wires without breaking.</p>
           </div>
           <div class="el-canvas-actions">
             <button class="el-action-btn primary" id="btnNextStep" style="opacity: 0; pointer-events: none; transition: opacity 0.5s ease;">
               Continue to Step 2
               <span class="material-symbols-outlined">arrow_forward</span>
             </button>
           </div>
         </div>
         <div class="el-ductility-board" id="ductilityBoard">
           <div class="ductility-instructions">
             <h3>Drag the ends of the copper cylinder outward to draw it into a wire!</h3>
           </div>
           <svg id="ductilitySvg" viewBox="0 0 900 300">
             <defs>
               <linearGradient id="copperGrad" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stop-color="#dda15e"/>
                 <stop offset="30%" stop-color="#bc6c25"/>
                 <stop offset="70%" stop-color="#9b5620"/>
                 <stop offset="100%" stop-color="#7a421a"/>
               </linearGradient>
               <linearGradient id="gripGrad" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stop-color="#666"/>
                 <stop offset="100%" stop-color="#444"/>
               </linearGradient>
             </defs>
             <!-- Copper Body -->
             <rect id="copperBody" x="350" y="110" width="200" height="80" rx="40" fill="url(#copperGrad)" />
             
             <!-- Left Grip -->
             <g id="gripLeft" class="ductility-grip" style="cursor: ew-resize;" transform="translate(350, 110)">
               <rect x="-20" y="-10" width="40" height="100" rx="5" fill="url(#gripGrad)" stroke="#222" stroke-width="2"/>
               <line x1="-5" y1="10" x2="-5" y2="70" stroke="#888" stroke-width="2"/>
               <line x1="5" y1="10" x2="5" y2="70" stroke="#888" stroke-width="2"/>
             </g>

             <!-- Right Grip -->
             <g id="gripRight" class="ductility-grip" style="cursor: ew-resize;" transform="translate(550, 110)">
               <rect x="-20" y="-10" width="40" height="100" rx="5" fill="url(#gripGrad)" stroke="#222" stroke-width="2"/>
               <line x1="-5" y1="10" x2="-5" y2="70" stroke="#888" stroke-width="2"/>
               <line x1="5" y1="10" x2="5" y2="70" stroke="#888" stroke-width="2"/>
             </g>

             <!-- Visual Progress -->
             <text id="ductilityMsg" x="450" y="260" text-anchor="middle" font-size="16" fill="#555" font-weight="bold">Length: 0% stretched</text>
           </svg>
         </div>
      </div>
      
      <!-- Step 2 View -->
      <div class="el-step-view" id="step2View" style="display: none;">
        <div class="el-experiment-layout">
     <!-- Side Panel -->
     <div class="el-side-panel">
       <div class="el-panel-header">
         <span class="material-symbols-outlined">build_circle</span>
         <h3>Components</h3>
       </div>
       <p class="el-panel-desc">Drag components to the circuit board to build your experiment</p>
      
       <div class="el-components-list" id="elComponentsList">
         <div class="el-component-item" data-component="battery" draggable="true" id="comp-battery">
           <div class="el-comp-preview">
             <svg viewBox="0 0 100 60" class="el-comp-svg">
               <!-- Battery body -->
               <rect x="10" y="10" width="65" height="40" rx="4" fill="#d4a574" stroke="#8B6914" stroke-width="2"/>
               <rect x="15" y="14" width="55" height="32" rx="2" fill="url(#battGrad)"/>
               <!-- Terminal positive -->
               <rect x="75" y="20" width="15" height="8" rx="2" fill="#cc0000" stroke="#990000" stroke-width="1"/>
               <text x="80" y="27" font-size="7" fill="#fff" font-weight="bold">+</text>
               <!-- Terminal negative -->
               <rect x="75" y="32" width="15" height="8" rx="2" fill="#333" stroke="#111" stroke-width="1"/>
               <text x="80" y="39" font-size="7" fill="#fff" font-weight="bold">−</text>
               <!-- Label -->
               <text x="42" y="33" font-size="8" fill="#fff" font-weight="bold" text-anchor="middle">1.5V</text>
               <defs>
                 <linearGradient id="battGrad" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stop-color="#c4956a"/>
                   <stop offset="100%" stop-color="#a07040"/>
                 </linearGradient>
               </defs>
             </svg>
           </div>
           <span class="el-comp-label">Battery (1.5V)</span>
           <span class="el-comp-status" id="status-battery">Not placed</span>
         </div>


         <div class="el-component-item" data-component="bulb" draggable="true" id="comp-bulb">
           <div class="el-comp-preview">
             <svg viewBox="0 0 80 80" class="el-comp-svg">
               <!-- Bulb glass -->
               <ellipse cx="40" cy="30" rx="20" ry="22" fill="#fcf3d9" stroke="#dbb849" stroke-width="2" class="bulb-glass"/>
               <!-- Filament -->
               <path d="M35 28 Q38 18 40 28 Q42 18 45 28" fill="none" stroke="#c0a030" stroke-width="1.5" class="bulb-filament"/>
               <!-- Base -->
               <rect x="32" y="50" width="16" height="12" rx="2" fill="#888" stroke="#666" stroke-width="1.5"/>
               <line x1="32" y1="54" x2="48" y2="54" stroke="#999" stroke-width="1"/>
               <line x1="32" y1="58" x2="48" y2="58" stroke="#999" stroke-width="1"/>
               <!-- Contact points -->
               <circle cx="36" cy="64" r="3" fill="#c0a030" stroke="#9a8020" stroke-width="1"/>
               <circle cx="44" cy="64" r="3" fill="#c0a030" stroke="#9a8020" stroke-width="1"/>
             </svg>
           </div>
           <span class="el-comp-label">Light Bulb</span>
           <span class="el-comp-status" id="status-bulb">Not placed</span>
         </div>


         <div class="el-component-item" data-component="switch" draggable="true" id="comp-switch">
           <div class="el-comp-preview">
             <svg viewBox="0 0 100 50" class="el-comp-svg">
               <!-- Base plate -->
               <rect x="10" y="25" width="80" height="14" rx="7" fill="#e8e8e8" stroke="#bbb" stroke-width="1.5"/>
               <!-- Contact left -->
               <circle cx="25" cy="32" r="5" fill="#c0a030" stroke="#9a8020" stroke-width="1.5"/>
               <!-- Contact right -->
               <circle cx="75" cy="32" r="5" fill="#c0a030" stroke="#9a8020" stroke-width="1.5"/>
               <!-- Lever (open) -->
               <line x1="25" y1="32" x2="60" y2="12" stroke="#555" stroke-width="3" stroke-linecap="round" class="switch-lever"/>
               <!-- Pivot -->
               <circle cx="25" cy="32" r="3" fill="#888"/>
             </svg>
           </div>
           <span class="el-comp-label">Switch</span>
           <span class="el-comp-status" id="status-switch">Not placed</span>
         </div>


       </div>


       <div class="el-instructions-card">
         <span class="material-symbols-outlined">lightbulb</span>
         <div>
           <h4>Instructions</h4>
           <ol>
             <li>Drag each component to its slot on the board</li>
             <li>Click and drag to connect the wires</li>
             <li>Toggle the switch to complete the circuit</li>
           </ol>
         </div>
       </div>
     </div>


     <!-- Experiment Canvas -->
     <div class="el-canvas-area">
       <div class="el-canvas-topbar">
         <div class="el-canvas-title-group">
           <h2>Step 2: Properties of Metal — Conductivity</h2>
           <p>Chapter 3: Metals and Non-Metals</p>
         </div>
         <div class="el-canvas-actions">
           <button class="el-reset-btn" id="elResetBtn">
             <span class="material-symbols-outlined">refresh</span>
             Reset
           </button>
         </div>
       </div>
      
       <div class="el-canvas-board" id="elCanvasBoard">
         <svg id="elCircuitSVG" class="el-circuit-svg" viewBox="0 0 900 520">
           <defs>
             <linearGradient id="wireGrad" x1="0" y1="0" x2="1" y2="0">
               <stop offset="0%" stop-color="#555"/>
               <stop offset="100%" stop-color="#777"/>
             </linearGradient>
             <linearGradient id="wireActiveGrad" x1="0" y1="0" x2="1" y2="0">
               <stop offset="0%" stop-color="#f59e0b"/>
               <stop offset="100%" stop-color="#fbbf24"/>
             </linearGradient>
             <filter id="glow">
               <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
               <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
               </feMerge>
             </filter>
             <filter id="strongGlow">
               <feGaussianBlur stdDeviation="12" result="coloredBlur"/>
               <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
               </feMerge>
             </filter>
             <linearGradient id="battBodyGrad" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stop-color="#ddb88a"/>
               <stop offset="100%" stop-color="#b07840"/>
             </linearGradient>
             <linearGradient id="metalSampleGrad" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stop-color="#e0e0e0"/>
               <stop offset="50%" stop-color="#c0c0c0"/>
               <stop offset="100%" stop-color="#a0a0a0"/>
             </linearGradient>
           </defs>


           <!-- Background grid -->
           <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
             <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.03)" stroke-width="0.5"/>
           </pattern>
           <rect width="900" height="520" fill="url(#smallGrid)"/>


           <!-- Drop zones (these glow when dragging) -->
           <g id="dropZones">
             <!-- Battery drop zone -->
             <rect id="dropzone-battery" class="el-dropzone" x="60" y="80" width="180" height="110" rx="16"
                   fill="rgba(0,75,226,0.04)" stroke="rgba(0,75,226,0.15)" stroke-width="2" stroke-dasharray="8 4"/>
             <text x="150" y="140" text-anchor="middle" font-size="13" fill="rgba(0,75,226,0.3)" font-weight="600">Battery</text>
            
             <!-- Bulb drop zone -->
             <rect id="dropzone-bulb" class="el-dropzone" x="650" y="60" width="150" height="140" rx="16"
                   fill="rgba(0,75,226,0.04)" stroke="rgba(0,75,226,0.15)" stroke-width="2" stroke-dasharray="8 4"/>
             <text x="725" y="135" text-anchor="middle" font-size="13" fill="rgba(0,75,226,0.3)" font-weight="600">Bulb</text>
            
             <!-- Switch drop zone -->
             <rect id="dropzone-switch" class="el-dropzone" x="560" y="340" width="180" height="90" rx="16"
                   fill="rgba(0,75,226,0.04)" stroke="rgba(0,75,226,0.15)" stroke-width="2" stroke-dasharray="8 4"/>
             <text x="650" y="390" text-anchor="middle" font-size="13" fill="rgba(0,75,226,0.3)" font-weight="600">Switch</text>


            </g>


           <!-- Wires group (drawn after components placed) -->
           <g id="wiresGroup">
             <!-- Wire: Battery(+) → Bulb top -->
             <path id="wire-1" class="el-wire" d="M 240,112 L 500,112 L 500,175 L 705,175"
                   fill="none" stroke="#888" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
             <!-- Wire: Bulb bottom → Switch right -->
             <path id="wire-2" class="el-wire" d="M 725,200 L 725,385 L 700,385"
                   fill="none" stroke="#888" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
             <!-- Wire: Switch left → Battery(-) -->
             <path id="wire-3" class="el-wire" d="M 600,385 L 300,385 L 300,147 L 240,147"
                   fill="none" stroke="#888" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
           </g>

           <!-- Temp Drag Wire -->
           <line id="tempWire" x1="0" y1="0" x2="0" y2="0" stroke="#888" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="6,4" opacity="0" pointer-events="none" />


           <!-- Placed components group -->
           <g id="placedComponents">
             <!-- Battery (placed) -->
             <g id="placed-battery" class="el-placed-component" opacity="0">
               <!-- Battery cylinder body -->
               <rect x="80" y="90" width="140" height="80" rx="8" fill="url(#battBodyGrad)" stroke="#8B6914" stroke-width="2.5"/>
               <!-- Inner label area -->
               <rect x="90" y="100" width="120" height="60" rx="4" fill="rgba(0,0,0,0.15)"/>
               <text x="150" y="137" text-anchor="middle" font-size="18" fill="#fff" font-weight="bold">1.5V DC</text>
               <!-- Positive terminal -->
               <rect x="220" y="105" width="20" height="15" rx="3" fill="#cc0000" stroke="#990000" stroke-width="1.5"/>
               <text x="230" y="117" text-anchor="middle" font-size="12" fill="#fff" font-weight="bold">+</text>
               <!-- Negative terminal -->
               <rect x="220" y="140" width="20" height="15" rx="3" fill="#444" stroke="#222" stroke-width="1.5"/>
               <text x="230" y="152" text-anchor="middle" font-size="12" fill="#fff" font-weight="bold">−</text>
               <!-- Connection points -->
               <circle cx="240" cy="112" r="8" fill="transparent" class="conn-point" data-port="battery-pos" style="cursor:crosshair"/>
               <circle cx="240" cy="112" r="4" fill="#c0a030" stroke="#9a8020" stroke-width="1.5" pointer-events="none"/>
               <circle cx="240" cy="147" r="8" fill="transparent" class="conn-point" data-port="battery-neg" style="cursor:crosshair"/>
               <circle cx="240" cy="147" r="4" fill="#c0a030" stroke="#9a8020" stroke-width="1.5" pointer-events="none"/>
             </g>


             <!-- Bulb (placed) -->
             <g id="placed-bulb" class="el-placed-component" opacity="0">
               <!-- Bulb holder base -->
               <rect x="705" y="150" width="40" height="50" rx="4" fill="#777" stroke="#555" stroke-width="2"/>
               <line x1="705" y1="162" x2="745" y2="162" stroke="#888" stroke-width="1.5"/>
               <line x1="705" y1="174" x2="745" y2="174" stroke="#888" stroke-width="1.5"/>
               <line x1="705" y1="186" x2="745" y2="186" stroke="#888" stroke-width="1.5"/>
               <!-- Glass bulb -->
               <ellipse id="bulbGlass" cx="725" cy="110" rx="40" ry="45" fill="#fcf3d9" stroke="#dbb849" stroke-width="2.5" opacity="0.9"/>
               <!-- Filament -->
               <path id="bulbFilament" d="M715 110 Q720 85 725 110 Q730 85 735 110" fill="none" stroke="#c0a030" stroke-width="2"/>
               <!-- Glow overlay (hidden by default) -->
               <ellipse id="bulbGlow" cx="725" cy="110" rx="50" ry="55" fill="#fef08a" opacity="0" filter="url(#strongGlow)"/>
               <!-- Connection points -->
               <circle cx="725" cy="200" r="8" fill="transparent" class="conn-point" data-port="bulb-bottom" style="cursor:crosshair"/>
               <circle cx="725" cy="200" r="4" fill="#c0a030" stroke="#9a8020" stroke-width="1.5" pointer-events="none"/>
               <circle cx="705" cy="175" r="8" fill="transparent" class="conn-point" data-port="bulb-left" style="cursor:crosshair"/>
               <circle cx="705" cy="175" r="4" fill="#c0a030" stroke="#9a8020" stroke-width="1.5" pointer-events="none"/>
             </g>


             <!-- Switch (placed) -->
             <g id="placed-switch" class="el-placed-component" opacity="0" style="cursor: pointer;">
               <!-- Base plate -->
               <rect x="570" y="360" width="160" height="50" rx="10" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
               <!-- Left contact -->
               <circle cx="600" cy="385" r="8" fill="#c0a030" stroke="#9a8020" stroke-width="2"/>
               <circle cx="600" cy="385" r="4" fill="#dbb849"/>
               <!-- Right contact -->
               <circle cx="700" cy="385" r="8" fill="#c0a030" stroke="#9a8020" stroke-width="2"/>
               <circle cx="700" cy="385" r="4" fill="#dbb849"/>
               <!-- Switch lever -->
               <line id="switchLever" x1="600" y1="385" x2="670" y2="350" stroke="#555" stroke-width="5" stroke-linecap="round"/>
               <!-- Pivot -->
               <circle cx="600" cy="385" r="5" fill="#888" stroke="#666" stroke-width="1.5"/>
               <!-- Interactive Overlays -->
               <circle cx="600" cy="385" r="10" fill="transparent" class="conn-point" data-port="switch-left" style="cursor:crosshair"/>
               <circle cx="700" cy="385" r="10" fill="transparent" class="conn-point" data-port="switch-right" style="cursor:crosshair"/>
               <!-- Label -->
               <text id="switchLabel" x="650" y="425" text-anchor="middle" font-size="11" fill="#888" font-weight="600">Click to toggle</text>
             </g>

           </g>

           <!-- Current flow animation (hidden by default) -->
           <g id="currentFlow" opacity="0">
             <circle class="el-electron" r="4" fill="#fbbf24">
               <animateMotion dur="3s" repeatCount="indefinite"
                 path="M 240,147 L 300,147 L 300,385 L 600,385 L 700,385 L 725,385 L 725,200 L 725,110 L 705,175 L 500,175 L 500,112 L 240,112"/>
             </circle>
             <circle class="el-electron" r="4" fill="#fbbf24" opacity="0.7">
               <animateMotion dur="3s" repeatCount="indefinite" begin="0.75s"
                 path="M 240,147 L 300,147 L 300,385 L 600,385 L 700,385 L 725,385 L 725,200 L 725,110 L 705,175 L 500,175 L 500,112 L 240,112"/>
             </circle>
             <circle class="el-electron" r="4" fill="#fbbf24" opacity="0.5">
               <animateMotion dur="3s" repeatCount="indefinite" begin="1.5s"
                 path="M 240,147 L 300,147 L 300,385 L 600,385 L 700,385 L 725,385 L 725,200 L 725,110 L 705,175 L 500,175 L 500,112 L 240,112"/>
             </circle>
             <circle class="el-electron" r="3" fill="#fbbf24" opacity="0.4">
               <animateMotion dur="3s" repeatCount="indefinite" begin="2.25s"
                 path="M 240,147 L 300,147 L 300,385 L 600,385 L 700,385 L 725,385 L 725,200 L 725,110 L 705,175 L 500,175 L 500,112 L 240,112"/>
             </circle>
           </g>
         </svg>


         <!-- Status/Result Panel -->
         <div class="el-status-bar" id="elStatusBar">
           <div class="el-status-indicator" id="elStatusIndicator">
             <span class="material-symbols-outlined">info</span>
             <span id="elStatusText">Place all components on the board to build the circuit</span>
           </div>
           <div class="el-progress-dots" id="elProgressDots">
             <div class="el-progress-dot" id="dot-battery" title="Battery"></div>
             <div class="el-progress-dot" id="dot-bulb" title="Bulb"></div>
             <div class="el-progress-dot" id="dot-switch" title="Switch"></div>

           </div>
         </div>
       </div>


       <!-- Knowledge cards (shown after experiment) -->
       <div class="el-knowledge-cards hidden" id="elKnowledgeCards">
         <div class="el-knowledge-card ductility">
           <div class="el-kc-icon">
             <span class="material-symbols-outlined">straighten</span>
           </div>
           <div class="el-kc-body">
             <h3>Ductility</h3>
             <p>The metal wire you used to connect the circuit demonstrates <strong>ductility</strong> — the ability of metals to be drawn into thin wires without breaking. This property makes metals ideal for electrical wiring.</p>
             <div class="el-kc-fact">
               <span class="material-symbols-outlined">auto_awesome</span>
               <span>Gold is the most ductile metal — 1g can be drawn into a wire 2km long!</span>
             </div>
           </div>
         </div>
         <div class="el-knowledge-card conductivity">
           <div class="el-kc-icon">
             <span class="material-symbols-outlined">bolt</span>
           </div>
           <div class="el-kc-body">
             <h3>Electrical Conductivity</h3>
             <p>The bulb glowing shows that metals are good <strong>conductors of electricity</strong>. Free electrons in the metal lattice allow electric current to flow through them easily.</p>
             <div class="el-kc-fact">
               <span class="material-symbols-outlined">auto_awesome</span>
               <span>Silver is the best conductor, followed by copper and aluminium!</span>
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 </div>
</div>
 `
}


// ── Experiment Logic ──────────────────────────────────────
export function initExperiment() {
    const components: Record<string, boolean> = {
        battery: false,
        bulb: false,
        switch: false
    }

    const connectedWires: Record<string, boolean> = {
        'wire-1': false,
        'wire-2': false,
        'wire-3': false
    }

    let switchClosed = false
    let isWiring = false
    let startPort: string | null = null

    const componentItems = document.querySelectorAll('.el-component-item')
    const canvasBoard = document.getElementById('elCanvasBoard')!
    const elCircuitSVG = document.getElementById('elCircuitSVG') as SVGSVGElement | null
    const tempWire = document.getElementById('tempWire') as SVGLineElement | null
    
    function getSVGPoint(e: MouseEvent, svgNode?: SVGSVGElement | null) {
        const svg = svgNode || elCircuitSVG
        if (!svg) return {x: 0, y: 0}
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const ctm = svg.getScreenCTM()
        if (ctm) return pt.matrixTransform(ctm.inverse())
        return {x: 0, y: 0}
    }

    // Step 1: Ductility Logic
    const gripLeft = document.getElementById('gripLeft')
    const gripRight = document.getElementById('gripRight')
    const copperBody = document.getElementById('copperBody')
    const ductilityMsg = document.getElementById('ductilityMsg')
    const btnNextStep = document.getElementById('btnNextStep')
    const ductilitySvg = document.getElementById('ductilitySvg') as SVGSVGElement | null
    
    let isStretchingLeft = false
    let isStretchingRight = false
    let leftX = 350
    let rightX = 550
    const initialWidth = 200
    const initialHeight = 80
    const maxStretch = 400

    function updateCopper() {
        const width = rightX - leftX
        const stretchRatio = Math.min((width - initialWidth) / maxStretch, 1)
        const newHeight = initialHeight - (stretchRatio * 70) // drops down to 10
        const newY = 110 + (initialHeight - newHeight) / 2
        const newRadius = newHeight / 2
        
        copperBody?.setAttribute('x', leftX.toString())
        copperBody?.setAttribute('width', width.toString())
        copperBody?.setAttribute('y', newY.toString())
        copperBody?.setAttribute('height', newHeight.toString())
        copperBody?.setAttribute('rx', newRadius.toString())
        
        gripLeft?.setAttribute('transform', `translate(${leftX}, 110)`)
        gripRight?.setAttribute('transform', `translate(${rightX}, 110)`)
        
        if (ductilityMsg) {
            ductilityMsg.innerHTML = `Length: ${Math.round(stretchRatio * 100)}% stretched`
            if (stretchRatio >= 0.98) {
                ductilityMsg.innerHTML = `Excellent! The copper has been drawn into a wire.`
                ductilityMsg.setAttribute('fill', '#10b981')
                if (btnNextStep) {
                    btnNextStep.style.opacity = '1'
                    btnNextStep.style.pointerEvents = 'auto'
                }
            } else {
                ductilityMsg.setAttribute('fill', '#555')
            }
        }
    }

    if (gripLeft && gripRight && ductilitySvg) {
        let offsetX = 0
        gripLeft.addEventListener('mousedown', (e) => {
            isStretchingLeft = true
            offsetX = getSVGPoint(e, ductilitySvg).x - leftX
        })
        gripRight.addEventListener('mousedown', (e) => {
            isStretchingRight = true
            offsetX = getSVGPoint(e, ductilitySvg).x - rightX
        })

        window.addEventListener('mousemove', (e) => {
            if (!isStretchingLeft && !isStretchingRight) return
            const pt = getSVGPoint(e, ductilitySvg)
            
            if (isStretchingLeft) {
                const newX = pt.x - offsetX
                leftX = Math.max(100, Math.min(newX, rightX - 50))
            }
            if (isStretchingRight) {
                const newX = pt.x - offsetX
                rightX = Math.min(800, Math.max(newX, leftX + 50))
            }
            updateCopper()
        })

        window.addEventListener('mouseup', () => {
            isStretchingLeft = false
            isStretchingRight = false
        })
    }

    btnNextStep?.addEventListener('click', () => {
        document.getElementById('step1View')!.style.display = 'none'
        document.getElementById('step2View')!.style.display = 'flex'
        
        // Ensure SVG calculates boxes properly after display change
        window.dispatchEvent(new Event('resize'))
    })

    // Step 2: Wiring Logic
    if (elCircuitSVG && tempWire) {
        elCircuitSVG.addEventListener('mousedown', (e) => {
            const target = e.target as SVGElement
            if (target.classList.contains('conn-point')) {
                const allComponentsPlaced = Object.values(components).every(v => v)
                if (!allComponentsPlaced) return

                e.preventDefault()
                const port = target.getAttribute('data-port')
                const pt = getSVGPoint(e)
                const cx = parseFloat(target.getAttribute('cx') || pt.x.toString())
                const cy = parseFloat(target.getAttribute('cy') || pt.y.toString())

                isWiring = true
                startPort = port

                tempWire.setAttribute('x1', cx.toString())
                tempWire.setAttribute('y1', cy.toString())
                tempWire.setAttribute('x2', cx.toString())
                tempWire.setAttribute('y2', cy.toString())
                tempWire.setAttribute('opacity', '1')
            }
        })

        elCircuitSVG.addEventListener('mousemove', (e) => {
            if (!isWiring) return
            const pt = getSVGPoint(e)
            tempWire.setAttribute('x2', pt.x.toString())
            tempWire.setAttribute('y2', pt.y.toString())
        })

        document.addEventListener('mouseup', (e) => {
            if (!isWiring) return
            const target = e.target as SVGElement
            let droppedOnValidPort = false

            if (target?.classList?.contains('conn-point')) {
                const endPort = target.getAttribute('data-port')

                const tryWire = (start: string | null, end: string | null, id: string, valid1: string, valid2: string) => {
                    if ((start === valid1 && end === valid2) || (start === valid2 && end === valid1)) {
                        if (!connectedWires[id]) {
                            connectedWires[id] = true
                            showSpecificWire(id)
                            droppedOnValidPort = true
                        }
                    }
                }

                tryWire(startPort, endPort, 'wire-1', 'battery-pos', 'bulb-left')
                tryWire(startPort, endPort, 'wire-2', 'bulb-bottom', 'switch-right')
                tryWire(startPort, endPort, 'wire-3', 'switch-left', 'battery-neg')

                if (droppedOnValidPort) {
                    const allWiresPlaced = Object.values(connectedWires).every(v => v)
                    if (allWiresPlaced) {
                        const statusText = document.getElementById('elStatusText')
                        if (statusText) statusText.textContent = 'Circuit wired! Now toggle the switch.'
                        
                        const switchGroup = document.getElementById('placed-switch')
                        if (switchGroup) {
                            switchGroup.style.cursor = 'pointer'
                            switchGroup.addEventListener('click', toggleSwitch)
                        }
                    }
                }
            }

            isWiring = false
            startPort = null
            tempWire.setAttribute('opacity', '0')
        })
    }


    // ── Drag & Drop ──
    componentItems.forEach(item => {
        const el = item as HTMLElement


        el.addEventListener('dragstart', (e: DragEvent) => {
            const compType = el.getAttribute('data-component')!
            if (components[compType]) return // Already placed
            e.dataTransfer!.setData('text/plain', compType)
            el.classList.add('dragging')
        })


        el.addEventListener('dragend', () => {
            el.classList.remove('dragging')
        })
    })


    // Enable drop on canvas
    canvasBoard.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault()
        e.dataTransfer!.dropEffect = 'move'
        // Highlight dropzones
        document.querySelectorAll('.el-dropzone').forEach(dz => {
            (dz as SVGElement).style.fill = 'rgba(0,75,226,0.08)'
        })
    })


    canvasBoard.addEventListener('dragleave', () => {
        document.querySelectorAll('.el-dropzone').forEach(dz => {
            (dz as SVGElement).style.fill = 'rgba(0,75,226,0.04)'
        })
    })


    canvasBoard.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault()
        const compType = e.dataTransfer!.getData('text/plain')
        if (!compType || components[compType]) return


        placeComponent(compType)

        document.querySelectorAll('.el-dropzone').forEach(dz => {
            (dz as SVGElement).style.fill = 'rgba(0,75,226,0.04)'
        })
    })


    function placeComponent(compType: string) {
        components[compType] = true


        // Animate the placed component appearing
        const placedEl = document.getElementById(`placed-${compType}`)
        if (placedEl) {
            placedEl.style.opacity = '0'
            placedEl.style.transform = 'scale(0.8)'
            placedEl.setAttribute('opacity', '1')

            // Force reflow
            placedEl.getBoundingClientRect()

            // Animate in
            requestAnimationFrame(() => {
                placedEl.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                placedEl.style.opacity = '1'
                placedEl.style.transform = 'scale(1)'
            })
        }


        // Hide the respective dropzone
        const dropzone = document.getElementById(`dropzone-${compType}`)
        if (dropzone) {
            dropzone.style.transition = 'opacity 0.3s ease'
            dropzone.style.opacity = '0'
            // Also hide the text label
            const textEl = dropzone.nextElementSibling as SVGElement
            if (textEl && textEl.tagName === 'text') {
                textEl.style.transition = 'opacity 0.3s ease'
                textEl.style.opacity = '0'
            }
        }


        // Update component item in sidebar
        const compItem = document.getElementById(`comp-${compType}`)
        if (compItem) {
            compItem.classList.add('placed')
            compItem.setAttribute('draggable', 'false')
        }


        // Update status indicator
        const statusEl = document.getElementById(`status-${compType}`)
        if (statusEl) {
            statusEl.textContent = 'Placed ✓'
            statusEl.classList.add('placed')
        }


        // Update progress dot
        const dot = document.getElementById(`dot-${compType}`)
        if (dot) {
            dot.classList.add('active')
        }


        // Check if all components placed
        const allPlaced = Object.values(components).every(v => v)
        if (allPlaced) {
            const statusText = document.getElementById('elStatusText')
            if (statusText) statusText.textContent = 'All components placed. Now click and drag between connection dots to wire the circuit!'
            const statusIcon = document.getElementById('elStatusIndicator')?.querySelector('.material-symbols-outlined')
            if (statusIcon) statusIcon.textContent = 'settings_ethernet'
        } else {
            updateStatusText()
        }
    }


    function showSpecificWire(wireId: string) {
        const wireEl = document.getElementById(wireId)
        if (wireEl) {
            wireEl.style.transition = 'opacity 0.6s ease'
            wireEl.setAttribute('opacity', '1')

            // Animate wire drawing
            const length = (wireEl as unknown as SVGPathElement).getTotalLength?.() || 500
            wireEl.style.strokeDasharray = `${length}`
            wireEl.style.strokeDashoffset = `${length}`

            requestAnimationFrame(() => {
                wireEl.style.transition = 'stroke-dashoffset 1s ease-in-out, opacity 0.3s ease'
                wireEl.style.strokeDashoffset = '0'
            })
        }
    }


    function toggleSwitch() {
        switchClosed = !switchClosed


        const lever = document.getElementById('switchLever')
        const switchLabel = document.getElementById('switchLabel')


        if (switchClosed) {
            // Close the switch
            lever?.setAttribute('x2', '700')
            lever?.setAttribute('y2', '385')
            if (switchLabel) switchLabel.textContent = 'Switch: ON'


            // Activate circuit
            activateCircuit()
        } else {
            // Open the switch
            lever?.setAttribute('x2', '670')
            lever?.setAttribute('y2', '350')
            if (switchLabel) switchLabel.textContent = 'Click to toggle'


            // Deactivate circuit
            deactivateCircuit()
        }
    }


    function activateCircuit() {
        // Make wires glow
        document.querySelectorAll('.el-wire').forEach(wire => {
            (wire as SVGElement).style.stroke = '#f59e0b';
            (wire as SVGElement).style.filter = 'url(#glow)';
            (wire as SVGElement).style.transition = 'stroke 0.5s ease, filter 0.5s ease'
        })


        // Light up the bulb
        const bulbGlow = document.getElementById('bulbGlow')
        const bulbGlass = document.getElementById('bulbGlass')
        const bulbFilament = document.getElementById('bulbFilament')


        if (bulbGlow) {
            bulbGlow.style.transition = 'opacity 0.8s ease'
            bulbGlow.setAttribute('opacity', '0.7')
        }
        if (bulbGlass) {
            bulbGlass.style.transition = 'fill 0.5s ease'
            bulbGlass.setAttribute('fill', '#fef9c3')
        }
        if (bulbFilament) {
            bulbFilament.style.transition = 'stroke 0.3s ease'
            bulbFilament.setAttribute('stroke', '#f59e0b')
            bulbFilament.setAttribute('stroke-width', '3')
        }


        // Show electron flow animation
        const currentFlow = document.getElementById('currentFlow')
        if (currentFlow) {
            currentFlow.style.transition = 'opacity 0.5s ease'
            currentFlow.setAttribute('opacity', '1')
        }


        // Update status
        const statusIndicator = document.getElementById('elStatusIndicator')
        const statusText = document.getElementById('elStatusText')
        const statusIcon = statusIndicator?.querySelector('.material-symbols-outlined')
        if (statusIndicator) statusIndicator.classList.add('success')
        if (statusText) statusText.textContent = '🎉 Circuit complete! The bulb is glowing — the metal conducts electricity!'
        if (statusIcon) statusIcon.textContent = 'check_circle'


        // Show knowledge cards
        setTimeout(() => {
            const knowledgeCards = document.getElementById('elKnowledgeCards')
            if (knowledgeCards) {
                knowledgeCards.classList.remove('hidden')
                knowledgeCards.style.animation = 'slideUpFade 0.6s ease forwards'
            }
        }, 800)
    }


    function deactivateCircuit() {
        // Remove wire glow
        document.querySelectorAll('.el-wire').forEach(wire => {
            (wire as SVGElement).style.stroke = '#888';
            (wire as SVGElement).style.filter = 'none'
        })


        // Turn off bulb
        const bulbGlow = document.getElementById('bulbGlow')
        const bulbGlass = document.getElementById('bulbGlass')
        const bulbFilament = document.getElementById('bulbFilament')


        if (bulbGlow) bulbGlow.setAttribute('opacity', '0')
        if (bulbGlass) bulbGlass.setAttribute('fill', '#fcf3d9')
        if (bulbFilament) {
            bulbFilament.setAttribute('stroke', '#c0a030')
            bulbFilament.setAttribute('stroke-width', '2')
        }


        // Hide electron flow
        const currentFlow = document.getElementById('currentFlow')
        if (currentFlow) currentFlow.setAttribute('opacity', '0')


        // Update status
        const statusIndicator = document.getElementById('elStatusIndicator')
        const statusText = document.getElementById('elStatusText')
        const statusIcon = statusIndicator?.querySelector('.material-symbols-outlined')
        if (statusIndicator) statusIndicator.classList.remove('success')
        if (statusText) statusText.textContent = 'Switch is OFF. Toggle the switch to complete the circuit.'
        if (statusIcon) statusIcon.textContent = 'toggle_off'


        // Hide knowledge cards
        const knowledgeCards = document.getElementById('elKnowledgeCards')
        if (knowledgeCards) knowledgeCards.classList.add('hidden')
    }


    function updateStatusText() {
        const placedCount = Object.values(components).filter(v => v).length
        const total = Object.keys(components).length
        const statusText = document.getElementById('elStatusText')


        if (placedCount < total) {
            const remaining = total - placedCount
            if (statusText) statusText.textContent = `${placedCount}/${total} components placed — ${remaining} more to go!`
        } else {
            if (statusText) statusText.textContent = 'All components placed. Now click and drag between connection dots to wire the circuit!'
            const statusIcon = document.getElementById('elStatusIndicator')?.querySelector('.material-symbols-outlined')
            if (statusIcon) statusIcon.textContent = 'settings_ethernet'
        }
    }


    // ── Reset button ──
    document.getElementById('elResetBtn')?.addEventListener('click', () => {
        // Reset state
        Object.keys(components).forEach(k => components[k] = false)
        Object.keys(connectedWires).forEach(k => connectedWires[k] = false)
        switchClosed = false

        // Hide placed components
        document.querySelectorAll('.el-placed-component').forEach(el => {
            (el as SVGElement).setAttribute('opacity', '0');
            (el as SVGElement).style.opacity = '0'
        })


        // Show dropzones
        document.querySelectorAll('.el-dropzone').forEach(dz => {
            (dz as SVGElement).style.opacity = '1'
            const textEl = dz.nextElementSibling as SVGElement
            if (textEl && textEl.tagName === 'text') textEl.style.opacity = '1'
        })


        // Hide wires
        document.querySelectorAll('.el-wire').forEach(wire => {
            (wire as SVGElement).setAttribute('opacity', '0');
            (wire as SVGElement).style.stroke = '#888';
            (wire as SVGElement).style.filter = 'none'
        })


        // Reset sidebar items
        componentItems.forEach(item => {
            (item as HTMLElement).classList.remove('placed');
            (item as HTMLElement).setAttribute('draggable', 'true')
        })

        // Remove click listener from switch
        const switchGroup = document.getElementById('placed-switch')
        if (switchGroup) {
            switchGroup.style.cursor = 'default'
            switchGroup.removeEventListener('click', toggleSwitch)
        }


        // Reset statuses
        document.querySelectorAll('.el-comp-status').forEach(el => {
            el.textContent = 'Not placed'
            el.classList.remove('placed')
        })


        // Reset progress dots
        document.querySelectorAll('.el-progress-dot').forEach(dot => {
            dot.classList.remove('active')
        })


        // Turn off bulb
        deactivateCircuit()


        // Reset switch lever
        const lever = document.getElementById('switchLever')
        if (lever) {
            lever.setAttribute('x2', '670')
            lever.setAttribute('y2', '350')
        }
        const switchLabel = document.getElementById('switchLabel')
        if (switchLabel) switchLabel.textContent = 'Click to toggle'


        // Reset status text
        const statusText = document.getElementById('elStatusText')
        const statusIcon = document.getElementById('elStatusIndicator')?.querySelector('.material-symbols-outlined')
        if (statusText) statusText.textContent = 'Place all components on the board to build the circuit'
        if (statusIcon) statusIcon.textContent = 'info'


        // Hide knowledge cards
        const knowledgeCards = document.getElementById('elKnowledgeCards')
        if (knowledgeCards) knowledgeCards.classList.add('hidden')
    })
}



