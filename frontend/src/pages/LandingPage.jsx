import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import styles from './LandingPage.module.css'

const features = [
  {
    num: '01',
    title: 'Skill Evaluation',
    desc: "Tell BuildOS what you want to build. AI assesses your skill level and decides if you're ready — or what to close first.",
    accent: false,
  },
  {
    num: '02',
    title: 'AI Execution Plan',
    desc: 'A week-by-week breakdown with code-level tasks and subtasks calibrated to your exact experience — not generic tutorials.',
    accent: false,
  },
  {
    num: '03',
    title: 'Progress Tracking',
    desc: 'GitHub-style activity heatmap. Streak tracking. Daily accountability. Every subtask you complete is logged.',
    accent: false,
  },
  {
    num: '04',
    title: 'AI Validation',
    desc: 'When you finish, AI validates your project was actually built. No shortcuts. Completion means completion.',
    accent: true,
  },
]

export default function LandingPage() {
  const gridRef = useRef(null)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    let frame
    let offset = 0
    const animate = () => {
      offset = (offset + 0.2) % 40
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
          <span className={styles.logoBracket}>&lt;</span>BuildOS<span className={styles.logoBracket}>/&gt;</span>
        </div>
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.navBtnSecondary}>Log in</Link>
          <Link to="/register" className={styles.navBtn}>Sign up</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          AI-Powered Developer Execution System
        </div>

        <h1 className={styles.title}>
          Stop Starting.<br />
          <span className={styles.titleAccent}>Start Shipping.</span>
        </h1>

        <p className={styles.subtitle}>
          BuildOS turns your project idea into a precise, code-level execution plan
          matched to your skill level — then holds you accountable until it ships.
        </p>

        <div className={styles.cta}>
          <Link to="/register" className={styles.ctaPrimary}>
            Get Started
            <span className={styles.ctaArrow}>→</span>
          </Link>
          <Link to="/login" className={styles.ctaSecondary}>
            Already have an account
          </Link>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>AI</span>
            <span className={styles.statLabel}>Skill Matching</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>Week</span>
            <span className={styles.statLabel}>By Week Plans</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>0→1</span>
            <span className={styles.statLabel}>Ship Rate</span>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <p className={styles.featuresEyebrow}>How it works</p>
          <h2 className={styles.featuresTitle}>Everything you need to finish what you start</h2>
        </div>
        <div className={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.num} className={`${styles.featureCard} ${f.accent ? styles.featureCardAccent : ''}`}>
              <span className={styles.featureNum}>{f.num}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof strip */}
      <section className={styles.proofStrip}>
        <div className={styles.proofInner}>
          {[
            '"Finally finished a project for the first time."',
            '"The AI plan actually matched what I could build."',
            '"Streak tracking kept me coding every day."',
            '"Shipped my portfolio in 3 weeks using BuildOS."',
          ].map((q, i) => (
            <div key={i} className={styles.proofQuote}>
              <span className={styles.proofMark}>"</span>
              {q.replace(/"/g, '')}
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaBannerInner}>
          <div className={styles.ctaBannerLeft}>
            <h2 className={styles.ctaBannerTitle}>Ready to ship your first project?</h2>
            <p className={styles.ctaBannerSub}>Free plan. No credit card. Start in 60 seconds.</p>
          </div>
          <Link to="/register" className={styles.ctaBannerBtn}>
            Activate Builder Mode →
          </Link>
        </div>
      </section>

      {/* Feedback */}
      <section className={styles.feedbackSection}>
        <div className={styles.feedbackInner}>
          <div className={styles.feedbackLeft}>
            <h2 className={styles.feedbackTitle}>Help shape BuildOS</h2>
            <p className={styles.feedbackSub}>Got ideas, bugs, or feedback? Every response is read.</p>
          </div>
          <a
            href="https://tally.so/r/Zjd7dv"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.feedbackBtn}
          >
            Give Feedback
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.footerLogo}>
            <span className={styles.logoBracket}>&lt;</span>BuildOS<span className={styles.logoBracket}>/&gt;</span>
          </span>
          <span className={styles.footerText}>Built for developers who ship.</span>
          <span className={styles.credit}>vibecoded by KSquad128</span>
        </div>
        <div className={styles.footerRight}>
          <span className={styles.footerAccent}>© 2026</span>
          <a
            href="https://www.linkedin.com/in/gaarjun"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.connectBtn}
          >
            LinkedIn →
          </a>
        </div>
      </footer>
    </div>
  )
}