import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/layout/AppLayout'
import apiClient from '../api/client'
import { connectGitHub, githubCallback } from '../api/github'
import styles from './Settings.module.css'

export default function SettingsPage() {
  const { refreshUser, user } = useAuth()
  const [keyStatus, setKeyStatus] = useState(null)
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [githubStatus, setGithubStatus] = useState(null)
  const [connectingGitHub, setConnectingGitHub] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    apiClient.get('/user/api-key/status')
      .then(res => setKeyStatus(res.data))
      .catch(() => setKeyStatus({ has_key: false, masked_key: null }))
  }, [])

  useEffect(() => {
    if (user) {
      setGithubStatus(user.github_access_token ? 'connected' : 'disconnected')
    }
  }, [user])

  // Handle GitHub OAuth callback code
  useEffect(() => {
    const code = searchParams.get('github_code')
    if (!code) return
    githubCallback(code)
      .then(async () => {
        await refreshUser()
        setMessage({ type: 'success', text: 'GitHub connected successfully.' })
        window.history.replaceState({}, '', '/settings')
      })
      .catch(() => setMessage({ type: 'error', text: 'GitHub connection failed. Try again.' }))
  }, [searchParams, refreshUser])

  const handleGitHubConnect = async () => {
    setConnectingGitHub(true)
    try {
      const res = await connectGitHub()
      window.location.href = res.data.url
    } catch {
      setMessage({ type: 'error', text: 'Failed to initiate GitHub connection.' })
      setConnectingGitHub(false)
    }
  }

  const handleSave = async () => {
    if (!keyInput.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await apiClient.post('/user/api-key', { api_key: keyInput.trim() })
      setKeyStatus(res.data)
      setKeyInput('')
      setMessage({ type: 'success', text: 'API key saved. AI limit removed for your account.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.friendlyMessage || 'Failed to save key.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setMessage(null)
    try {
      await apiClient.delete('/user/api-key')
      setKeyStatus({ has_key: false, masked_key: null })
      setMessage({ type: 'success', text: 'API key removed. Free plan limits now apply.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.friendlyMessage || 'Failed to remove key.' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <AppLayout>
      <div className={styles.page}>
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSubtitle}>Manage your account preferences and integrations.</p>
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.msgSuccess : styles.msgError}`}>
            {message.text}
          </div>
        )}

        {/* GitHub Integration */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>GitHub Integration</h2>
              <p className={styles.sectionSub}>
                Connect your GitHub account to link repos to projects and auto-track commits.
              </p>
            </div>
            <div className={`${styles.limitBadge} ${githubStatus === 'connected' ? styles.limitUnlocked : styles.limitFree}`}>
              {githubStatus === 'connected' ? 'Connected' : 'Not connected'}
            </div>
          </div>

          {githubStatus === 'connected' ? (
            <div className={styles.activeKey}>
              <div className={styles.activeKeyInfo}>
                <span className={styles.activeKeyLabel}>GitHub account linked</span>
                <span className={styles.activeKeyMask}>Repos available in project settings</span>
              </div>
            </div>
          ) : (
            <button
              className={styles.saveBtn}
              onClick={handleGitHubConnect}
              disabled={connectingGitHub}
            >
              {connectingGitHub ? 'Redirecting...' : 'Connect GitHub Account'}
            </button>
          )}

          <div className={styles.guideNote} style={{ marginTop: '0.5rem' }}>
            After connecting, go to any active project and use the GitHub panel to select a repo.
            Commits pushed to that repo will automatically match and complete tasks.
          </div>
        </div>

        {/* BYOK Section */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>OpenRouter API Key</h2>
              <p className={styles.sectionSub}>
                Free plan allows 5 AI calls per day. Add your own key to remove this limit entirely.
              </p>
            </div>
            <div className={`${styles.limitBadge} ${keyStatus?.has_key ? styles.limitUnlocked : styles.limitFree}`}>
              {keyStatus?.has_key ? 'Unlimited' : '5 / day'}
            </div>
          </div>

          {keyStatus?.has_key && (
            <div className={styles.activeKey}>
              <div className={styles.activeKeyInfo}>
                <span className={styles.activeKeyLabel}>Active key</span>
                <span className={styles.activeKeyMask}>{keyStatus.masked_key}</span>
              </div>
              <button className={styles.removeBtn} onClick={handleRemove} disabled={removing}>
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          )}

          {!keyStatus?.has_key && (
            <div className={styles.keyInputWrap}>
              <input
                type="password"
                className={styles.keyInput}
                placeholder="sk-or-v1-..."
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                disabled={saving}
              />
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !keyInput.trim()}>
                {saving ? 'Saving...' : 'Save Key'}
              </button>
            </div>
          )}

          <button className={styles.guideToggle} onClick={() => setShowGuide(g => !g)}>
            {showGuide ? 'Hide guide' : 'How to get your OpenRouter API key'}
          </button>

          {showGuide && (
            <div className={styles.guide}>
              <div className={styles.guideStep}>
                <span className={styles.guideNum}>1</span>
                <p className={styles.guideText}>Go to <a href="https://openrouter.ai" target="_blank" rel="noreferrer">openrouter.ai</a> and create a free account.</p>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.guideNum}>2</span>
                <p className={styles.guideText}>Click your profile icon — select <strong>API Keys</strong>.</p>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.guideNum}>3</span>
                <p className={styles.guideText}>Click <strong>Create Key</strong>. Name it "BuildOS".</p>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.guideNum}>4</span>
                <p className={styles.guideText}>Copy the key starting with <code>sk-or-v1-</code> and paste it above.</p>
              </div>
              <div className={styles.guideNote}>
                Free tier on OpenRouter includes generous credits. You only pay if you exceed the free quota.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}