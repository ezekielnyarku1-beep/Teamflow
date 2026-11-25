import './auth.css'

function Brand() {
  return (
    <div className="hero-brand">
      <span className="logo-o" aria-hidden="true">O</span>
      <div>
        <p className="hero-name">Overview Teams</p>
      </div>
    </div>
  )
}

export default function AuthLayout({ title, subtitle, footer, showCheck = false, children }) {
  return (
    <div className="auth">
      <aside className="auth-hero" aria-label="About Overview Teams">
        <Brand />
        <div className="hero-body">
          <p className="hero-eyebrow">Innovation &amp; Excellence</p>
          <p className="hero-headline">Forward-Thinking Solutions For <em>Tomorrow’s Challenges.</em></p>
        </div>
        <div className="auth-sculpture" aria-hidden="true" />
        <p className="hero-foot">Overview Teams</p>
      </aside>

      <main className="auth-form">
        <div className="auth-box">
          <Brand />
          {showCheck && (
            <div className="notice-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M5 11.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <h1>{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          {children}
          {footer && <p className="auth-foot">{footer}</p>}
        </div>
      </main>
    </div>
  )
}
