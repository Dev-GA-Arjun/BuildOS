import { useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import styles from './LoginPage.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await apiClient.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid} />
      <div className={styles.orb} />

      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoBracket}>&lt;</span>BuildOS<span className={styles.logoBracket}>/&gt;</span>
        </Link>
      </nav>

      <main className={styles.main}>
        <div className={styles.formContainer}>
          {!submitted ? (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Forgot Password</h1>
                <p className={styles.subtitle}>Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.errorMessage}><span>⚠️</span> {error}</div>}

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="you@example.com"
                    className={styles.input}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isLoading || !email}>
                  {isLoading ? <><span className={styles.spinner} /> Sending...</> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.header} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
              <h1 className={styles.title}>Check your inbox</h1>
              <p className={styles.subtitle}>
                If <strong style={{ color: 'var(--accent)' }}>{email}</strong> has an account,
                a reset link has been sent. Check your spam folder too.
              </p>
            </div>
          )}

          <div className={styles.footer}>
            <span className={styles.footerText}>
              <Link to="/login" className={styles.footerLink}>← Back to login</Link>
            </span>
          </div>
        </div>
        <div className={styles.sideDecoration} />
      </main>
    </div>
  )
}