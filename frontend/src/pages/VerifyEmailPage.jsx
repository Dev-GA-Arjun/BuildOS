import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'
import styles from './LoginPage.module.css'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginUser } = useAuth()

  const email = location.state?.email || ''
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (!email) navigate('/register')
  }, [email, navigate])

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendCooldown])

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await apiClient.post('/auth/verify-email', { email, otp })
      const { access_token } = res.data
      localStorage.setItem('buildos_token', access_token)
      const meRes = await apiClient.get('/auth/me')
      loginUser(access_token, meRes.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    try {
      await apiClient.post('/auth/resend-otp', { email })
      setSuccess('New code sent! Check your inbox.')
      setResendCooldown(60)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError('Failed to resend. Try again.')
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
          <div className={styles.header}>
            <h1 className={styles.title}>Check your email</h1>
            <p className={styles.subtitle}>
              We sent a 6-digit code to <strong style={{ color: 'var(--accent)' }}>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerify} className={styles.form}>
            {error && <div className={styles.errorMessage}><span>⚠️</span> {error}</div>}
            {success && <div className={styles.successMessage}><span>✅</span> {success}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className={styles.input}
                style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.4rem' }}
                maxLength={6}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading || otp.length !== 6}>
              {isLoading ? <><span className={styles.spinner} /> Verifying...</> : 'Verify Email'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                style={{
                  background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.82rem'
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get it? Resend code"}
              </button>
            </div>
          </form>

          <div className={styles.footer}>
            <span className={styles.footerText}>
              Wrong email? <Link to="/register" className={styles.footerLink}>Go back</Link>
            </span>
          </div>
        </div>
        <div className={styles.sideDecoration} />
      </main>
    </div>
  )
}