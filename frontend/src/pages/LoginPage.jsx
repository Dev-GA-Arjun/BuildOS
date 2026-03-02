import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { login, getMe } from '../api/auth'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginUser } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    try {
      const res = await login({ email: formData.email, password: formData.password })
      const { access_token } = res.data
      localStorage.setItem('buildos_token', access_token)
      const meRes = await getMe()
      loginUser(access_token, meRes.data)
      navigate('/dashboard')
    } catch (error) {
      setErrors({
        submit: error.response?.data?.detail || 'Invalid email or password.',
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
          <span className={styles.logoBracket}>&lt;</span>
          BuildOS
          <span className={styles.logoBracket}>/&gt;</span>
        </Link>
        <div className={styles.navLinks}>
          <span className={styles.navText}>New here?</span>
          <Link to="/register" className={styles.navBtn}>Start Building</Link>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.formContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>
              Sign in to your BuildOS account to continue your projects
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {errors.submit && (
              <div className={styles.errorMessage}>
                <span>⚠️</span> {errors.submit}
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                disabled={isLoading}
              />
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <Link to="/forgot-password" className={styles.forgotLink}>Forgot?</Link>
              </div>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className={styles.checkbox}
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className={styles.checkboxLabel}>
                Keep me signed in
              </label>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? (
                <><span className={styles.spinner} /> Signing in...</>
              ) : 'Sign In'}
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
              Don't have an account?{' '}
              <Link to="/register" className={styles.footerLink}>Create one</Link>
            </span>
          </div>
        </div>
        <div className={styles.sideDecoration} />
      </main>
    </div>
  )
}