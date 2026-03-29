import { useState, useEffect } from 'react'
import styles from './Loader.module.css'

const CONTEXTS = {
  login: {
    messages: ['Verifying credentials...', 'Checking your account...', 'Almost in...'],
    label: 'signing in',
  },
  plan: {
    messages: [
      'Reading your project idea...',
      'Analysing tech stack...',
      'Mapping out the weeks...',
      'Writing code-level tasks...',
      'Finalising your execution plan...',
    ],
    label: 'generating plan',
  },
  evaluate: {
    messages: [
      'Evaluating your idea...',
      'Checking feasibility...',
      'Matching to your skill level...',
      'Almost ready...',
    ],
    label: 'evaluating',
  },
  github: {
    messages: ['Connecting to GitHub...', 'Reading your repository...', 'Syncing commits...'],
    label: 'syncing github',
  },
  default: {
    messages: ['Loading...', 'Please wait...', 'Almost there...'],
    label: 'loading',
  },
}

export default function Loader({ context = 'default', fullscreen = false }) {
  const { messages, label } = CONTEXTS[context] || CONTEXTS.default
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % messages.length)
        setVisible(true)
      }, 350)
    }, 2400)
    return () => clearInterval(msgTimer)
  }, [messages.length])

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(d => (d + 1) % 4)
    }, 500)
    return () => clearInterval(dotTimer)
  }, [])

  return (
    <div className={`${styles.wrap} ${fullscreen ? styles.fullscreen : ''}`}>
      {/* Background grid pulse */}
      <div className={styles.bgGrid} />

      {/* Central animation */}
      <div className={styles.centerStack}>
        {/* Outer rings */}
        <div className={`${styles.ring} ${styles.ring3}`} />
        <div className={`${styles.ring} ${styles.ring2}`} />
        <div className={`${styles.ring} ${styles.ring1}`} />

        {/* Core logo mark */}
        <div className={styles.core}>
          <span className={styles.coreBracket}>&lt;</span>
          <span className={styles.coreSlash}>/</span>
          <span className={styles.coreBracket}>&gt;</span>
        </div>
      </div>

      {/* Label */}
      <div className={styles.labelRow}>
        <span className={styles.labelTag}>buildos</span>
        <span className={styles.labelSep}>//</span>
        <span className={styles.labelContext}>{label}</span>
      </div>

      {/* Rotating message */}
      <p className={`${styles.message} ${visible ? styles.visible : styles.hidden}`}>
        {messages[msgIndex]}
        <span className={styles.dotsWrap}>
          {[0, 1, 2].map(i => (
            <span key={i} className={`${styles.dot} ${i < dots ? styles.dotOn : ''}`}>.</span>
          ))}
        </span>
      </p>

      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} />
      </div>
    </div>
  )
}