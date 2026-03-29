import { useState, useEffect, useRef } from 'react'
import AppLayout from '../components/layout/AppLayout'
import apiClient from '../api/client'
import styles from './Profile.module.css'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name: '', bio: '', skills: '', github_url: '', linkedin_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const avatarRef = useRef()
  const resumeRef = useRef()

  useEffect(() => {
    apiClient.get('/user/profile')
      .then(res => {
        setProfile(res.data)
        setForm({
          full_name: res.data.full_name || '',
          bio: res.data.bio || '',
          skills: res.data.skills || '',
          github_url: res.data.github_url || '',
          linkedin_url: res.data.linkedin_url || '',
        })
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load profile.' }))
  }, [])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await apiClient.patch('/user/profile', form)
      setProfile(res.data)
      setEditing(false)
      setMessage({ type: 'success', text: 'Profile saved.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.friendlyMessage || 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      skills: profile.skills || '',
      github_url: profile.github_url || '',
      linkedin_url: profile.linkedin_url || '',
    })
    setEditing(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setMessage(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await apiClient.post('/user/profile/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfile(prev => ({ ...prev, avatar_url: res.data.avatar_url }))
      setMessage({ type: 'success', text: 'Avatar updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.friendlyMessage || 'Upload failed.' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingResume(true)
    setMessage(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await apiClient.post('/user/profile/resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfile(prev => ({ ...prev, resume_url: res.data.resume_url }))
      setMessage({ type: 'success', text: 'Resume uploaded.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.friendlyMessage || 'Upload failed.' })
    } finally {
      setUploadingResume(false)
    }
  }

  if (!profile) return (
    <AppLayout>
      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '2rem' }}>
        Loading profile...
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className={styles.page}>
        <div className={styles.pageHead}>
          <div>
            <h1 className={styles.pageTitle}>Profile</h1>
            <p className={styles.pageSubtitle}>Your developer identity on BuildOS.</p>
          </div>
          {!editing && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.msgSuccess : styles.msgError}`}>
            {message.text}
          </div>
        )}

        {/* Avatar */}
        <div className={styles.section}>
          <div className={styles.avatarRow}>
            <div className={styles.avatar}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className={styles.avatarImg} />
                : <span className={styles.avatarInitial}>{profile.full_name?.[0]?.toUpperCase() || 'U'}</span>
              }
            </div>
            <div className={styles.avatarActions}>
              <button
                className={styles.uploadBtn}
                onClick={() => avatarRef.current.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading...' : profile.avatar_url ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className={styles.uploadHint}>JPEG, PNG or WebP — max 2MB</p>
            </div>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>
        </div>

        {/* View mode */}
        {!editing && (
          <div className={styles.section}>
            <div className={styles.viewGrid}>
              <div className={styles.viewItem}>
                <span className={styles.viewLabel}>Full Name</span>
                <span className={styles.viewValue}>{profile.full_name || '—'}</span>
              </div>
              <div className={styles.viewItem}>
                <span className={styles.viewLabel}>Bio</span>
                <span className={styles.viewValue}>{profile.bio || '—'}</span>
              </div>
              <div className={styles.viewItem}>
                <span className={styles.viewLabel}>Skills</span>
                {profile.skills ? (
                  <div className={styles.skillChips}>
                    {profile.skills.split(',').map((s, i) => (
                      <span key={i} className={styles.skillChip}>{s.trim()}</span>
                    ))}
                  </div>
                ) : <span className={styles.viewValue}>—</span>}
              </div>
              <div className={styles.viewItem}>
                <span className={styles.viewLabel}>GitHub</span>
                {profile.github_url
                  ? <a href={profile.github_url} target="_blank" rel="noreferrer" className={styles.viewLink}>{profile.github_url}</a>
                  : <span className={styles.viewValue}>—</span>
                }
              </div>
              <div className={styles.viewItem}>
                <span className={styles.viewLabel}>LinkedIn</span>
                {profile.linkedin_url
                  ? <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className={styles.viewLink}>{profile.linkedin_url}</a>
                  : <span className={styles.viewValue}>—</span>
                }
              </div>
              <div className={styles.viewItem}>
                <span className={styles.viewLabel}>Resume</span>
                {profile.resume_url
                  ? (
                    <div className={styles.resumeRow}>
                      <span className={styles.resumeUploaded}>Resume uploaded</span>
                      <button className={styles.uploadBtn} onClick={() => resumeRef.current.click()}
                        disabled={uploadingResume}>
                        {uploadingResume ? 'Uploading...' : 'Replace'}
                      </button>
                    </div>
                  )
                  : (
                    <button className={styles.uploadBtn} onClick={() => resumeRef.current.click()}
                      disabled={uploadingResume}>
                      {uploadingResume ? 'Uploading...' : 'Upload PDF'}
                    </button>
                  )
                }
              </div>
            </div>
            <input ref={resumeRef} type="file" accept="application/pdf"
              style={{ display: 'none' }} onChange={handleResumeUpload} />
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div className={styles.section}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name</label>
                <input className={styles.input} name="full_name"
                  value={form.full_name} onChange={handleChange} placeholder="Your name" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Bio</label>
                <textarea className={styles.textarea} name="bio"
                  value={form.bio} onChange={handleChange}
                  placeholder="e.g. Full-stack developer building in public" rows={2} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Skills</label>
                <textarea className={styles.textarea} name="skills"
                  value={form.skills} onChange={handleChange}
                  placeholder="e.g. React, Python, PostgreSQL, FastAPI" rows={2} />
                <p className={styles.fieldHint}>Comma separated. Used as defaults when creating projects.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>GitHub</label>
                <input className={styles.input} name="github_url"
                  value={form.github_url} onChange={handleChange}
                  placeholder="https://github.com/username" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>LinkedIn</label>
                <input className={styles.input} name="linkedin_url"
                  value={form.linkedin_url} onChange={handleChange}
                  placeholder="https://linkedin.com/in/username" />
              </div>
            </div>

            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}