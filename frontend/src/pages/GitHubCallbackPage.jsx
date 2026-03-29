import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { githubCallback } from '../api/github'
import AppLayout from '../components/layout/AppLayout'
import Loader from '../components/Loader'

export default function GitHubCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const code = params.get('code')
    if (!code) { navigate('/settings'); return }

    githubCallback(code)
      .then(() => navigate('/settings?github_connected=true'))
      .catch(() => navigate('/settings?github_error=true'))
  }, [params, navigate])

  return (
    <AppLayout>
      <Loader context="github" />
    </AppLayout>
  )
}