import './landing.css'

export function renderLandingPage(): string {
  return `
    <div class="landing-page" id="landingPage">
      <!-- Navbar -->
      <nav class="landing-nav" id="landingNav">
          <div class="nav-left">
          <a class="landing-nav-brand" href="#">
            <img src="/Pulse.jpeg" alt="Academic Pulse Logo" style="height: 32px; width: auto; border-radius: 8px;" />
            <span>Academic Pulse</span>
          </a>
          <div class="landing-nav-links">
          </div>
        </div>
        <div class="nav-right">
          <a class="nav-login-btn" href="#" id="navStartBtn">Login</a>
        </div>
      </nav>

      <!-- Hero -->
      <section class="hero-section" id="hero">
        <div class="hero-content animate-in">
          <div class="hero-badge">
            <span class="badge-text">⚡️ THE FUTURE OF LEARNING</span>
          </div>
          <h1>Find Your Pulse.<br><span class="gradient-text">Master Any Subject.</span></h1>
          <p>Stop struggling with static content.<br>Start learning at the speed of thought.</p>
          <div class="hero-actions">
            <button class="hero-btn-primary" id="heroStartBtn">Start Learning for Free</button>
            <button class="hero-btn-secondary" id="heroLearnMore">Explore Platform</button>
          </div>
        </div>
        <div class="hero-image animate-in animate-delay-2">
          <img src="/hero-student.png" alt="Student studying with Academic Pulse" />
        </div>
      </section>

      <!-- Smart Tools -->
      <section class="tools-section" id="features">
        <div class="tools-header">
          <h2>Smart Tools for the Modern<br>Learner</h2>
          <p>We've reimagined modern education. No more dusty textbooks—just high-velocity,<br>interactive learning.</p>
        </div>
        
        <div class="bento-grid">
          <div class="bento-card bento-notebook bento-wide animate-in">
            <div class="bento-content">
              <div class="bento-icon-wrapper">
                <img src="/Pulse.jpeg" alt="Pulse AI" style="width: 48px; height: 48px; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
              </div>
              <h3>Interactive AI Mentor</h3>
              <p>Chat directly with your notes. Academic Pulse highlights key concepts and answers your deepest questions about any subject in real-time.</p>
              <div class="important-highlight">
                <span class="dot-red"></span> Pulse AI: "Ask me anything about this chapter"
              </div>
            </div>
          </div>

          <!-- Card 2: Audio Overviews -->
          <div class="bento-card bento-audio animate-in animate-delay-1">
            <div class="bento-content">
              <div class="bento-icon-wrapper"><span class="material-symbols-outlined">headphones</span></div>
              <h3>Audio Overviews</h3>
              <p>Turn complex topics into podcast-style summaries you can listen to anywhere.</p>
            </div>
            <div class="audio-visualizer">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
            </div>
          </div>

          <!-- Card 3: AI Games Hub -->
          <div class="bento-card bento-games animate-in animate-delay-2">
            <div class="bento-content">
              <div class="bento-icon-wrapper"><span class="material-symbols-outlined">sports_esports</span></div>
              <h3>AI Games Hub</h3>
              <p>Study by playing. Our AI turns your curriculum into immersive roleplay and strategy games.</p>
              <div class="game-badges">
                <span class="game-badge">RPG Mode</span>
                <span class="game-badge">Strategy</span>
              </div>
            </div>
          </div>


          <!-- Card 5: Flashcards -->
          <div class="bento-card bento-flashcards animate-in animate-delay-1">
            <div class="bento-content">
              <div class="bento-icon-wrapper" style="color: #ea580c;"><span class="material-symbols-outlined">style</span></div>
              <h3>Smart Flashcards</h3>
              <p>AI-generated cards for spaced repetition mastery.</p>
            </div>
            <div class="flashcard-stack">
              <div class="card-face card-1">Quantum Physics</div>
              <div class="card-face card-2">Thermodynamics</div>
            </div>
          </div>

          <!-- Card 6: Adaptive Quizzes -->
          <div class="bento-card bento-challenge animate-in animate-delay-2">
            <div class="bento-content">
              <div class="bento-icon-wrapper" style="color: #6366f1;"><span class="material-symbols-outlined">leaderboard</span></div>
              <h3>Adaptive Quizzes</h3>
              <p>Challenge yourself and rise through the global leaderboard.</p>
              <div class="pulse-score" style="margin-top: 20px; padding: 12px; background: #f1f2fa;">
                <div class="pulse-bar-bg" style="background: #e2e8f0;"><div class="pulse-bar-fill" style="width: 85%; background: #6366f1;"></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Why Students Love Us (Carousel) -->
      <section class="love-section" id="impact">
        <div class="love-header animate-in">
          <h2>Why Students<br><span>Love Pulse.</span></h2>
          <p>We built a high-performance ecosystem that bridges the gap between potential and opportunity.</p>
        </div>

        <div class="carousel-wrapper animate-in">
          <div class="carousel-viewport">
            <div class="carousel-track" id="loveCarouselTrack">
              <!-- Slide 1: Rural -->
              <div class="carousel-slide">
                <div class="slide-inner">
                  <div class="slide-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><path d="M12 7v3.5L14.5 12"/><path d="M17 7c0-2.76-2.24-5-5-5S7 4.24 7 7"/></svg>
                  </div>
                  <div class="impact-badge">RURAL IMPACT</div>
                  <h3>Your Classroom in Your Pocket</h3>
                  <p>Location shouldn't limit your future. Whether you're in a small town or a remote village, Academic Pulse brings the world’s best teachers to your screen, designed specifically for mobile devices.</p>
                </div>
              </div>

              <!-- Slide 2: Urban/Gamified -->
              <div class="carousel-slide">
                <div class="slide-inner">
                  <div class="slide-icon orange">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h4m-2-2v4m10-2h.01M15 12h.01M21 12c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9 9-4.03 9-9Z"/></svg>
                  </div>
                  <div class="impact-badge orange">GAMIFIED LEARNING</div>
                  <h3>Play Your Way to the Top</h3>
                  <p>Forget the grind. Turn late-night study sessions into a high-score chase. Our 24/7 AI Mentor turns every chapter into an interactive game you actually want to play.</p>
                </div>
              </div>

              <!-- Slide 3: Support -->
              <div class="carousel-slide">
                <div class="slide-inner">
                  <div class="slide-icon green">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </div>
                  <div class="impact-badge green">HUMAN SUPPORT</div>
                  <h3>The Hand-Holding You Need</h3>
                  <p>Learning is hard; we make it human. From exam stress management to last-mile guidance, we’re the support system that stays with you until the finish line.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="carousel-controls">
            <button class="carousel-btn prev" id="loveCarouselPrev">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="carousel-dots" id="loveCarouselDots">
              <span class="dot active"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <button class="carousel-btn next" id="loveCarouselNext">
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta-section">
        <div class="cta-card animate-in">
          <h2>Ready to Find Your <span class="gradient-text">Pulse?</span></h2>

          <div class="cta-buttons">
            <button class="cta-btn-primary" id="ctaStartBtn">Create Free Account</button>
          </div>
        </div>
      </section>

    </div>
  `
}

export function initLandingEvents(onStartApp: () => void) {
  // Nav scroll effect
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('landingNav')
    if (nav) {
      nav.classList.toggle('scrolled', window.scrollY > 20)
    }
  })

  // Start buttons
  const startBtns = ['navStartBtn', 'heroStartBtn', 'ctaStartBtn']
  startBtns.forEach(id => {
    const btn = document.getElementById(id)
    btn?.addEventListener('click', (e) => {
      e.preventDefault()
      onStartApp()
    })
  })

  // Explore button scroll
  const exploreBtn = document.getElementById('heroLearnMore')
  exploreBtn?.addEventListener('click', () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  })

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = (link as HTMLAnchorElement).getAttribute('href')
      if (href && href !== '#' && !link.id) {
        e.preventDefault()
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }
    })
  })

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.animate-in').forEach(el => {
    observer.observe(el)
  })

  // Love Carousel Logic
  const track = document.getElementById('loveCarouselTrack')
  const prevBtn = document.getElementById('loveCarouselPrev')
  const nextBtn = document.getElementById('loveCarouselNext')
  const dots = document.querySelectorAll('#loveCarouselDots .dot')
  
  if (track && prevBtn && nextBtn) {
    let currentIndex = 0
    const slides = track.querySelectorAll('.carousel-slide')
    const totalSlides = slides.length

    const updateCarousel = () => {
      track.style.transform = `translateX(-${currentIndex * 100}%)`
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentIndex)
      })
    }

    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % totalSlides
      updateCarousel()
    })

    prevBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + totalSlides) % totalSlides
      updateCarousel()
    })

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        currentIndex = idx
        updateCarousel()
      })
    })

    // Auto-play (optional)
    setInterval(() => {
      currentIndex = (currentIndex + 1) % totalSlides
      updateCarousel()
    }, 5000)
  }
}
