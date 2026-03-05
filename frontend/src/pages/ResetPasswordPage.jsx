import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import styles from './LoginPage.module.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (form.new_password.length < 8) newErrors.new_password = 'Password must be at least 8 characters'
    if (form.new_password !== form.confirm_password) newErrors.confirm_password = 'Passwords do not match'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      await apiClient.post('/auth/reset-password', { token, new_password: form.new_password })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setErrors({ submit: err.response?.data?.detail || 'Reset failed. The link may have expired.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.grid} />
        <main className={styles.main}>
          <div className={styles.formContainer}>
            <div className={styles.header}>
              <h1 className={styles.title}>Invalid Link</h1>
              <p className={styles.subtitle}>This reset link is invalid or has expired.</p>
            </div>
            <div className={styles.footer}>
              <Link to="/forgot-password" className={styles.footerLink}>Request a new link</Link>
            </div>
          </div>
        </main>
      </div>
    )
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
          {!done ? (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Reset Password</h1>
                <p className={styles.subtitle}>Enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                {errors.submit && <div className={styles.errorMessage}><span>⚠️</span> {errors.submit}</div>}

                <div className={styles.formGroup}>
                  <label className={styles.label}>New Password</label>
                  <input
                    type="password"
                    value={form.new_password}
                    onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className={`${styles.input} ${errors.new_password ? styles.inputError : ''}`}
                    disabled={isLoading}
                    autoFocus
                  />
                  {errors.new_password && <span className={styles.fieldError}>{errors.new_password}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirm_password}
                    onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                    placeholder="••••••••"
                    className={`${styles.input} ${errors.confirm_password ? styles.inputError : ''}`}
                    disabled={isLoading}
                  />
                  {errors.confirm_password && <span className={styles.fieldError}>{errors.confirm_password}</span>}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                  {isLoading ? <><span className={styles.spinner} /> Resetting...</> : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.header} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h1 className={styles.title}>Password Reset!</h1>
              <p className={styles.subtitle}>Redirecting you to login...</p>
            </div>
          )}
        </div>
        <div className={styles.sideDecoration} />
      </main>
    </div>
  )
}