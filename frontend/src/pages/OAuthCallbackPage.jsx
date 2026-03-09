import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const token = searchParams.get('token')
    const error = searchParams.get('error')
    const path = window.location.pathname

    if (error) {
      navigate('/login?error=oauth_failed')
      return
    }

    if (token) {
      login(token).then(() => navigate('/dashboard'))
      return
    }

    if (code) {
      const provider = path.includes('google') ? 'google' : 'github'
      apiClient.get(`/auth/${provider}/callback?code=${code}`)
        .then(res => {
          if (res.data?.token) {
            login(res.data.token).then(() => navigate('/dashboard'))
          } else {
            navigate('/login?error=oauth_failed')
          }
        })
        .catch(() => navigate('/login?error=oauth_failed'))
    }
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)',
      color: 'var(--accent)', fontFamily: 'var(--font-mono)'
    }}>
      signing you in...
    </div>
  )
}