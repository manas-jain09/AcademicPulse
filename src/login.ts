import './login.css'
import { supabase } from './supabaseClient'

export function renderLoginPage(): string {
  return `
    <div class="login-wrapper">
      <header class="login-header">
        <div class="login-brand">
          <img src="/Pulse.jpeg" alt="Logo" style="height: 32px; width: auto; border-radius: 8px;" />
          <span>Academic Pulse</span>
        </div>
      </header>

      <div class="login-container">
        <div class="login-promo">
          <h1>Your Subjects. <br><span class="promo-highlight">Your Rules.</span></h1>
          <p>Stop struggling with static content. Turn any chapter into a game, a podcast, or a direct chat with your AI Mentor. Mastery is now just a tap away.</p>
        </div>

        <div class="login-form-container">
          <h2>Welcome Back</h2>
          <p class="login-subtitle">Continue your journey to academic mastery.</p>


          <form id="loginForm">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" id="username" placeholder="StudentUsername" />
            </div>
            <div class="form-group">
                <label for="password">Password</label>
              <input type="password" id="password" placeholder="••••••••" />
            </div>
            <p id="loginError" class="login-error"></p>
            <button type="submit" class="submit-btn">Get Started</button>
          </form>

        </div>
      </div>

    </div>
  `
}

export function initLoginEvents(onLoginSuccess: () => void) {
  const form = document.getElementById('loginForm') as HTMLFormElement
  const usernameInput = document.getElementById('username') as HTMLInputElement
  const passwordInput = document.getElementById('password') as HTMLInputElement
  const errorMsg = document.getElementById('loginError') as HTMLParagraphElement
  const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorMsg.textContent = ''
    
    if (submitBtn) submitBtn.textContent = 'Signing in...'
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', usernameInput.value)
      .eq('password', passwordInput.value)
      .single()

    if (submitBtn) submitBtn.textContent = 'Get Started'

    if (error || !data) {
      errorMsg.textContent = 'Invalid username or password';
    } else {
      localStorage.setItem('pulse_user_id', data.id)
      onLoginSuccess()
    }
  })
}

