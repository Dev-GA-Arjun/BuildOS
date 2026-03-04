import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const gridRef = useRef(null)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    let frame
    let offset = 0
    const animate = () => {
      offset = (offset + 0.3) % 40
      grid.style.backgroundPosition = `${offset}px ${offset}px`
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid} ref={gridRef} />
      <div className={styles.orb} />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoBracket}>&lt;</span>
          BuildOS
          <span className={styles.logoBracket}>/&gt;</span>
        </div>
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.navLink}>Login</Link>
          <Link to="/register" className={styles.navBtn}>Start Building</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          AI-Powered Project Completion System
        </div>

        <h1 className={styles.title}>
          Stop Starting.<br />
          <span className={styles.titleAccent}>Start Finishing.</span>
        </h1>

        <p className={styles.subtitle}>
          BuildOS evaluates your idea, matches it to your skill level,
          and generates a week-by-week execution plan — so you actually ship.
        </p>

        <div className={styles.cta}>
          <Link to="/register" className={styles.ctaPrimary}>
            Activate Builder Mode
            <span className={styles.ctaArrow}>→</span>
          </Link>
          <Link to="/login" className={styles.ctaSecondary}>
            I already build here
          </Link>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>AI</span>
            <span className={styles.statLabel}>Project Evaluation</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>Week</span>
            <span className={styles.statLabel}>By Week Planning</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>0→1</span>
            <span className={styles.statLabel}>Project Completion</span>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className={styles.features}>
        {[
          { icon: '⚡', title: 'Skill Evaluation', desc: "Tell us your idea and current skills. AI decides if you're ready — or what to learn first." },
          { icon: '🗺️', title: 'AI Execution Plan', desc: 'Get a week-by-week breakdown with tasks and subtasks tailored to your level.' },
          { icon: '🔥', title: 'Streak Tracking', desc: 'GitHub-style heatmap tracks your daily execution. Build momentum, not excuses.' },
          { icon: '✅', title: 'AI Validation', desc: "When you're done, AI validates your project was actually completed correctly." },
        ].map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Feedback Section */}
      <section className={styles.feedbackSection}>
        <div className={styles.feedbackInner}>
          <div className={styles.feedbackLeft}>
            <h2 className={styles.feedbackTitle}>Help shape BuildOS</h2>
            <p className={styles.feedbackSub}>
              Got ideas, bugs, or just want to say what you think? I read every response.
            </p>
          </div>
          <a
            href="https://tally.so/r/Zjd7dv"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.feedbackBtn}
          >
            💬 Give Feedback
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.footerText}>Built for developers who ship.</span>
          <span className={styles.credit}>vibe coded by G A Arjun ⚡</span>
        </div>
        <div className={styles.footerRight}>
          <span className={styles.footerAccent}>BuildOS © 2026</span>
          <a
            href="https://www.linkedin.com/in/gaarjun"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.connectBtn}
          >
            Connect on LinkedIn →
          </a>
        </div>
      </footer>
    </div>
  )
}