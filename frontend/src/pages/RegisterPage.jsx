import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './LoginPage.module.css'
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { register } from '../api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required'
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
      })
      // ✅ Redirect to verify page — don't auto login yet
      navigate('/verify-email', { state: { email: formData.email } })
    } catch (error) {
      setErrors({
        submit: error.friendlyMessage || error.response?.data?.detail || 'Registration failed. Please try again.'
      })
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
        <div className={styles.navLinks}>
          <span className={styles.navText}>Already building?</span>
          <Link to="/login" className={styles.navBtn}>Sign In</Link>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.formContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Start Building</h1>
            <p className={styles.subtitle}>Create your BuildOS account and ship your first project.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {errors.submit && (
              <div className={styles.errorMessage}><span>⚠️</span> {errors.submit}</div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="full_name" className={styles.label}>Full Name</label>
              <input type="text" id="full_name" name="full_name"
                value={formData.full_name} onChange={handleChange}
                placeholder="Your Name"
                className={`${styles.input} ${errors.full_name ? styles.inputError : ''}`}
                disabled={isLoading} />
              {errors.full_name && <span className={styles.fieldError}>{errors.full_name}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input type="email" id="email" name="email"
                value={formData.email} onChange={handleChange}
                placeholder="you@example.com"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                disabled={isLoading} />
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password" name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  disabled={isLoading} />
                <button type="button" className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword"
                value={formData.confirmPassword} onChange={handleChange}
                placeholder="••••••••"
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                disabled={isLoading} />
              {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? <><span className={styles.spinner} /> Creating account...</> : '⚡ Activate Builder Mode'}
            </button>

            <div className={styles.divider}>or continue with</div>

            <div className={styles.oauthButtons}>
              <button type="button" className={styles.oauthBtn} disabled={isLoading}>
                <FaGithub size={18} /> GitHub
              </button>
              <button type="button" className={styles.oauthBtn} disabled={isLoading}>
                <FaGoogle size={16} /> Google
              </button>
            </div>
          </form>

          <div className={styles.footer}>
            <span className={styles.footerText}>
              Already have an account?{' '}
              <Link to="/login" className={styles.footerLink}>Sign in</Link>
            </span>
          </div>
        </div>
        <div className={styles.sideDecoration} />
      </main>
    </div>
  )
}