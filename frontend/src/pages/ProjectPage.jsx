import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import AppLayout from '../components/layout/AppLayout'
import { useProject, useValidateProject, useAbandonProject } from '../hooks/useProjects'
import { useUpdateSubtask } from '../hooks/useTask'
import styles from './ProjectPage.module.css'
import { getCommits, linkRepo, unlinkRepo, listRepos, completeTaskWithProof } from '../api/github'


function calcProgress(project) {
  if (!project?.phases) return 0
  let total = 0, done = 0
  project.phases.forEach(p => p.tasks?.forEach(t => {
    t.subtasks?.forEach(s => {
      total++
      if (s.status === 'done') done++
    })
  }))
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

function getDaysInfo(project) {
  if (!project?.started_at) return { daysLeft: null, daysElapsed: 0, totalDays: 0, expectedProgress: 0 }
  const start = new Date(project.started_at)
  const today = new Date()
  const totalDays = project.deadline_weeks * 7
  const daysElapsed = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, totalDays - daysElapsed)
  const expectedProgress = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
  return { daysLeft, daysElapsed, totalDays, expectedProgress }
}

function getCurrentWeek(project) {
  if (!project?.started_at) return 1
  const start = new Date(project.started_at)
  const today = new Date()
  const daysElapsed = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  return Math.min(project.deadline_weeks, Math.floor(daysElapsed / 7) + 1)
}

function generateLinkedInPost(project, validationReport) {
  const weeks = project.deadline_weeks
  const title = project.title
  const skillsLearned = project.missing_skills
    ? `\n🧠 Topics I learned along the way: ${project.missing_skills}`
    : ''
  return `🚀 Just shipped "${title}"!

I challenged myself to build this project in ${weeks} week${weeks > 1 ? 's' : ''} — and I did it.

${validationReport || 'It was a challenging but rewarding build. Learned a lot along the way!'}${skillsLearned}

Tracked every task, every phase, every week using BuildOS — an AI-powered project completion tracker that held me accountable.

If you're an entry-level dev struggling to finish projects, BuildOS is worth checking out.

#buildinpublic #webdev #shipping #coding #100daysofcode #buildwithbuildos`
}

const DEPLOY_LINKS = [
  { name: 'Vercel', desc: 'Best for frontend / React', url: 'https://vercel.com/new', color: '#ffffff', icon: '▲' },
  { name: 'Render', desc: 'Best for backend / FastAPI', url: 'https://render.com', color: '#46E3B7', icon: '⬡' },
  { name: 'Netlify', desc: 'Great for static sites', url: 'https://app.netlify.com/start', color: '#00C7B7', icon: '◆' },
  { name: 'Railway', desc: 'Full-stack in one place', url: 'https://railway.app', color: '#7B61FF', icon: '🚂' },
]

// ── Ship Modal ────────────────────────────────────────────
function ShipModal({ project, validationReport, onClose }) {
  const [copied, setCopied] = useState(false)
  const [postText, setPostText] = useState(generateLinkedInPost(project, validationReport))

  const handleCopy = () => {
    navigator.clipboard.writeText(postText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLinkedIn = () => {
    const encoded = encodeURIComponent(postText)
    window.open(`https://www.linkedin.com/sharing/share-offsite/?text=${encoded}`, '_blank')
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalEmoji}>🚀</div>
          <h2 className={styles.modalTitle}>Project Shipped!</h2>
          <p className={styles.modalSub}>
            You built <strong>{project.title}</strong> in {project.deadline_weeks} week{project.deadline_weeks > 1 ? 's' : ''}. That's real.
          </p>
          {validationReport && <p className={styles.modalReport}>{validationReport}</p>}
        </div>

        <div className={styles.modalSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>📢 Share on LinkedIn</h3>
            <span className={styles.sectionHint}>Edit before posting</span>
          </div>
          <textarea className={styles.postTextarea} value={postText} onChange={e => setPostText(e.target.value)} rows={10} />
          <div className={styles.postActions}>
            <button className={styles.copyBtn} onClick={handleCopy}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
            <button className={styles.linkedinBtn} onClick={handleLinkedIn}>Share on LinkedIn →</button>
          </div>
        </div>

        <div className={styles.modalSection}>
          <h3 className={styles.sectionTitle}>🌐 Deploy Your Project</h3>
          <div className={styles.deployGrid}>
            {DEPLOY_LINKS.map(link => (
              <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.deployCard}>
                <span className={styles.deployIcon} style={{ color: link.color }}>{link.icon}</span>
                <div>
                  <p className={styles.deployName}>{link.name}</p>
                  <p className={styles.deployDesc}>{link.desc}</p>
                </div>
                <span className={styles.deployArrow}>→</span>
              </a>
            ))}
          </div>
        </div>

        <button className={styles.modalClose} onClick={onClose}>Done — Go to Dashboard</button>
      </div>
    </div>
  )
}

// ── Abandon Modal ─────────────────────────────────────────
function AbandonModal({ project, onConfirm, onCancel, isPending }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.abandonModal} onClick={e => e.stopPropagation()}>
        <div className={styles.abandonEmoji}>⚠️</div>
        <h2 className={styles.abandonTitle}>Abandon Project?</h2>
        <p className={styles.abandonSub}>
          Are you sure you want to abandon <strong>"{project.title}"</strong>? This can't be undone.
        </p>
        <div className={styles.abandonActions}>
          <button className={styles.abandonCancelBtn} onClick={onCancel} disabled={isPending}>
            Keep Building
          </button>
          <button className={styles.abandonConfirmBtn} onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Abandoning...' : 'Yes, Abandon'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Proof Modal ────────────────────────────────────────────
function ProofModal({ task, onClose, onVerified }) {
  const [proof, setProof] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (proof.trim().length < 20) {
      setError('Please describe what you built in more detail.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await completeTaskWithProof(task.id, proof)
      onVerified()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.proofModal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.proofTitle}>Mark Task as Done</h2>
        <p className={styles.proofSub}>
          <strong>{task.title}</strong>
        </p>
        <p className={styles.proofHint}>
          Describe what you built. AI will verify before marking done.
        </p>
        <textarea
          className={styles.proofTextarea}
          value={proof}
          onChange={e => setProof(e.target.value)}
          placeholder="e.g. Built the useAuth hook in src/hooks/useAuth.js — handles JWT storage and token refresh. Connected to the login form."
          rows={5}
        />
        {error && <p className={styles.proofError}>{error}</p>}
        <div className={styles.proofActions}>
          <button className={styles.secondaryBtnSm} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={styles.primaryBtnSm}
            onClick={handleSubmit}
            disabled={loading || proof.trim().length < 20}
          >
            {loading ? 'AI is verifying...' : 'Verify & Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GitHub Panel ───────────────────────────────────────────
function GitHubPanel({ project, onRepoLinked }) {
  const [commits, setCommits] = useState([])
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)
  const [showRepoSelect, setShowRepoSelect] = useState(false)
  const [error, setError] = useState(null)
  const [isGitHubConnected, setIsGitHubConnected] = useState(null) // null = checking, true/false = checked

  useEffect(() => {
    if (project.github_repo) {
      getCommits(project.id)
        .then(res => setCommits(res.data.commits || []))
        .catch(() => setCommits([]))
    }
  }, [project.id, project.github_repo])

  // Check if GitHub is connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await listRepos()
        setIsGitHubConnected(true)
      } catch {
        setIsGitHubConnected(false)
      }
    }
    if (!project.github_repo) {
      checkConnection()
    }
  }, [project.id, project.github_repo])

  const handleLoadRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listRepos()
      setRepos(res.data.repos || [])
      setShowRepoSelect(true)
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load repos.')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkRepo = async () => {
    if (!selectedRepo) return
    setLinking(true)
    setError(null)
    try {
      await linkRepo(project.id, selectedRepo, 'main')
      setShowRepoSelect(false)
      onRepoLinked()
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to link repo.')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    try {
      await unlinkRepo(project.id)
      onRepoLinked()
    } catch {
      setError('Failed to unlink repo.')
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className={styles.infoCard}>
      <div className={styles.githubHeader}>
        <h3 className={styles.colTitle}>GitHub</h3>
        {project.github_repo && (
          <button className={styles.unlinkBtn} onClick={handleUnlink}>Unlink</button>
        )}
      </div>

      {error && <p className={styles.githubError}>{error}</p>}

      {/* Not connected */}
      {!project.github_repo && !showRepoSelect && isGitHubConnected === false && (
        <div className={styles.githubEmpty}>
          <p className={styles.githubEmptyText}>Connect GitHub in Settings to link repos and auto-track commits.</p>
          <a href="/settings" className={styles.githubBtn} style={{ display: 'inline-block', textAlign: 'center' }}>
            Go to Settings →
          </a>
        </div>
      )}

      {/* Connected - show repo selector */}
      {!project.github_repo && !showRepoSelect && isGitHubConnected === true && (
        <div className={styles.githubEmpty}>
          <p className={styles.githubEmptyText}>Link a repo to auto-track commits.</p>
          <button className={styles.githubBtn} onClick={handleLoadRepos} disabled={loading}>
            {loading ? 'Loading...' : 'Select Repo'}
          </button>
        </div>
      )}

      {/* Repo selector */}
      {showRepoSelect && (
        <div className={styles.repoSelect}>
          <select
            className={styles.repoDropdown}
            value={selectedRepo}
            onChange={e => setSelectedRepo(e.target.value)}
          >
            <option value="">Select a repository...</option>
            {repos.map(r => (
              <option key={r.full_name} value={r.full_name}>
                {r.full_name} {r.private ? '(private)' : ''}
              </option>
            ))}
          </select>
          <div className={styles.repoActions}>
            <button className={styles.githubBtnOutline} onClick={() => setShowRepoSelect(false)}>
              Cancel
            </button>
            <button
              className={styles.githubBtn}
              onClick={handleLinkRepo}
              disabled={!selectedRepo || linking}
            >
              {linking ? 'Linking...' : 'Link Repo'}
            </button>
          </div>
        </div>
      )}

      {/* Linked repo + commits */}
      {project.github_repo && (
        <>
          <div className={styles.repoLinked}>
            <span className={styles.repoName}>{project.github_repo}</span>
            <span className={styles.repoBranch}>{project.github_branch || 'main'}</span>
          </div>

          {commits.length === 0 ? (
            <p className={styles.githubEmptyText} style={{ marginTop: '0.75rem' }}>
              No commits yet. Push to {project.github_branch || 'main'} to start tracking.
            </p>
          ) : (
            <div className={styles.commitList}>
              {commits.map((c) => (
                <a
                  key={c.full_sha}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.commitItem}
                >
                  <div className={styles.commitTop}>
                    <span className={styles.commitSha}>{c.sha}</span>
                    <span className={styles.commitDate}>{formatDate(c.date)}</span>
                  </div>
                  <p className={styles.commitMsg}>{c.message}</p>
                  <span className={styles.commitAuthor}>{c.author}</span>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────
export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activePhaseId, setActivePhaseId] = useState(null)
  const [expandedTask, setExpandedTask] = useState(null)
  const [shipModal, setShipModal] = useState(false)
  const [abandonModal, setAbandonModal] = useState(false)
  const [validationReport, setValidationReport] = useState(null)
  const [proofModal, setProofModal] = useState(null) // holds task object
  const { data: project, isLoading } = useProject(id)
  const validateMutation = useValidateProject()
  const abandonMutation = useAbandonProject()
  const updateSubtask = useUpdateSubtask(id)

  const progress = calcProgress(project)
  const { daysLeft, expectedProgress, totalDays } = getDaysInfo(project)
  const currentWeek = getCurrentWeek(project)
  const onTrack = progress >= expectedProgress

  const activePhase = activePhaseId
    ? project?.phases?.find(p => p.id === activePhaseId)
    : project?.phases?.[0]

  const toggleSubtask = (taskId, subtaskId, currentStatus) => {
    updateSubtask.mutate({
      taskId,
      subtaskId,
      data: { status: currentStatus === 'done' ? 'todo' : 'done' }
    })
  }

  const handleProofVerified = () => {
    queryClient.invalidateQueries({ queryKey: ['project', id] })
  }

  const handleValidate = async () => {
    try {
      const result = await validateMutation.mutateAsync(id)
      setValidationReport(result?.ai_validation_report || null)
      // ✅ Invalidate so dashboard refetches updated project status + completed count
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['activeProject'] })
      setShipModal(true)
    } catch {
      alert('Validation failed. Try again.')
    }
  }

  const handleAbandon = async () => {
    try {
      await abandonMutation.mutateAsync(id)
      // ✅ Invalidate so dashboard refetches
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['activeProject'] })
      navigate('/dashboard')
    } catch {
      alert('Failed to abandon project. Try again.')
    }
  }

  if (isLoading) return (
    <AppLayout>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', padding: '2rem' }}>loading project...</div>
    </AppLayout>
  )

  if (!project) return (
    <AppLayout>
      <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', padding: '2rem' }}>project not found.</div>
    </AppLayout>
  )

  const urgencyColor = daysLeft <= 3 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--accent)'

  return (
    <AppLayout>
      <div className={styles.page}>

        {shipModal && (
          <ShipModal
            project={project}
            validationReport={validationReport || project?.ai_validation_report}
            onClose={() => { setShipModal(false); navigate('/dashboard') }}
          />
        )}

        {abandonModal && (
          <AbandonModal
            project={project}
            onConfirm={handleAbandon}
            onCancel={() => setAbandonModal(false)}
            isPending={abandonMutation.isPending}
          />
        )}

        {proofModal && (
          <ProofModal
            task={proofModal}
            onClose={() => setProofModal(null)}
            onVerified={handleProofVerified}
          />
        )}

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>← Back</button>
            <div>
              <h1 className={styles.projectTitle}>{project.title}</h1>
              <p className={styles.projectMeta}>
                Started {project.started_at} · {project.deadline_weeks} weeks · {progress}% complete
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.statusBadge}>⚡ {project.status}</span>
            {progress >= 80 && project.status === 'active' && (
              <button className={styles.validateBtn} onClick={handleValidate} disabled={validateMutation.isPending}>
                {validateMutation.isPending ? '🤖 Validating...' : '🚀 Validate & Ship'}
              </button>
            )}
          </div>
        </div>

        {project.ai_validation_report && project.status === 'completed' && (
          <div className={`${styles.validationBanner} ${project.ai_validation_passed ? styles.validationPass : styles.validationFail}`}>
            <span>{project.ai_validation_passed ? '✅' : '⚠️'}</span>
            <p>{project.ai_validation_report}</p>
          </div>
        )}

        <div className={styles.missionRow}>
          <div className={styles.missionCard}>
            <span className={styles.missionLabel}>Overall Progress</span>
            <div className={styles.missionProgressWrap}>
              <div className={styles.missionProgressBar}>
                <div className={styles.missionProgressFill} style={{ width: `${progress}%` }} />
                {expectedProgress > 0 && expectedProgress < 100 && (
                  <div className={styles.expectedMarker} style={{ left: `${expectedProgress}%` }} title={`Expected: ${expectedProgress}%`} />
                )}
              </div>
              <span className={styles.missionProgressPct}>{progress}%</span>
            </div>
            <div className={styles.missionSubtext}>
              {expectedProgress > 0 && (
                <span style={{ color: onTrack ? 'var(--accent)' : 'var(--warning)' }}>
                  {onTrack ? '✓ On track' : '⚠ Behind schedule'} · expected {expectedProgress}%
                </span>
              )}
            </div>
          </div>

          <div className={styles.missionCard}>
            <span className={styles.missionLabel}>Time Remaining</span>
            <div className={styles.missionBig} style={{ color: urgencyColor }}>
              {daysLeft !== null ? daysLeft : '—'}
            </div>
            <span className={styles.missionSubtext}>
              {daysLeft === 0 ? '🚨 Deadline today!' : `days left · ${totalDays} total`}
            </span>
          </div>

          <div className={styles.missionCard}>
            <span className={styles.missionLabel}>Current Week</span>
            <div className={styles.missionBig} style={{ color: 'var(--accent)' }}>
              {currentWeek} <span className={styles.missionOf}>/ {project.deadline_weeks}</span>
            </div>
            <span className={styles.missionSubtext}>
              {project.phases?.[currentWeek - 1]?.title || 'Final week'}
            </span>
          </div>

          <div className={styles.missionCard}>
            <span className={styles.missionLabel}>Ship Status</span>
            <div className={styles.shipStatus}>
              {progress >= 80 ? <span className={styles.shipReady}>🚀 Ready to Ship</span>
                : progress >= 50 ? <span className={styles.shipMid}>⚡ In Progress</span>
                : <span className={styles.shipEarly}>🔨 Building</span>}
            </div>
            <span className={styles.missionSubtext}>{100 - progress}% remaining</span>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.phasesCol}>
            <h3 className={styles.colTitle}>Phases</h3>
            {project.phases?.map((phase) => {
              const allDone = phase.tasks?.every(t => t.status === 'done')
              const hasActive = phase.tasks?.some(t => t.status === 'in_progress')
              const totalSubs = phase.tasks?.reduce((a, t) => a + (t.subtasks?.length || 0), 0)
              const doneSubs = phase.tasks?.reduce((a, t) => a + (t.subtasks?.filter(s => s.status === 'done').length || 0), 0)
              const phasePct = totalSubs ? Math.round((doneSubs / totalSubs) * 100) : 0
              const isActive = (activePhaseId ?? project?.phases?.[0]?.id) === phase.id
              return (
                <div key={phase.id}
                  className={`${styles.phaseTab} ${isActive ? styles.phaseTabActive : ''} ${allDone ? styles.phaseTabDone : ''}`}
                  onClick={() => setActivePhaseId(phase.id)}>
                  <div className={styles.phaseTabTop}>
                    <span className={styles.phaseTabIcon}>{allDone ? '✅' : hasActive ? '⚡' : '○'}</span>
                    <span className={styles.phaseTabTitle}>{phase.title}</span>
                  </div>
                  <div className={styles.phaseTabBar}>
                    <div className={styles.phaseTabFill} style={{ width: `${phasePct}%` }} />
                  </div>
                  <div className={styles.phaseTabBottom}>
                    <span className={styles.phaseTabCount}>{doneSubs}/{totalSubs} subtasks</span>
                    <span className={styles.phaseTabPct}>{phasePct}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.tasksCol}>
            <div className={styles.tasksHeader}>
              <h3 className={styles.colTitle}>{activePhase?.title}</h3>
              <span className={styles.tasksCount}>
                {activePhase?.tasks?.filter(t => t.status === 'done').length || 0}/{activePhase?.tasks?.length || 0} tasks done
              </span>
            </div>
            <div className={styles.taskList}>
              {activePhase?.tasks?.map((task) => {
                const allDone = task.subtasks?.every(s => s.status === 'done')
                const isOpen = expandedTask === task.id
                const doneSubs = task.subtasks?.filter(s => s.status === 'done').length || 0
                const totalSubs = task.subtasks?.length || 0
                const taskPct = totalSubs ? Math.round((doneSubs / totalSubs) * 100) : 0
                return (
                  <div key={task.id} className={`${styles.taskCard} ${allDone ? styles.taskDone : ''}`}>
                    <div className={styles.taskHeader} onClick={() => setExpandedTask(isOpen ? null : task.id)}>
                      <div className={styles.taskLeft}>
                        <div className={`${styles.taskStatus} ${styles[`status_${task.status}`]}`}>
                          {allDone ? '✓' : taskPct > 0 ? '◑' : '○'}
                        </div>
                        <div>
                          <p className={styles.taskTitle}>{task.title}</p>
                          <p className={styles.taskDesc}>{task.description}</p>
                        </div>
                      </div>
                      <div className={styles.taskRight}>
                        <div className={styles.taskMiniBar}>
                          <div className={styles.taskMiniFill} style={{ width: `${taskPct}%` }} />
                        </div>
                        <span className={styles.taskProgress}>{doneSubs}/{totalSubs}</span>
                        <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
                      </div>
                      {!allDone && task.completed_via !== 'github' && (
                        <button
                          className={styles.markDoneBtn}
                          onClick={(e) => { e.stopPropagation(); setProofModal(task) }}
                        >
                          Mark Done
                        </button>
                      )}
                      {task.github_commit_sha && (
                        <span className={styles.commitBadge}>{task.github_commit_sha}</span>
                      )}
                    </div>
                    {isOpen && (
                      <div className={styles.subtaskList}>
                        {task.subtasks?.map((sub) => (
                          <div key={sub.id}
                            className={`${styles.subtaskItem} ${sub.status === 'done' ? styles.subtaskDone : ''}`}
                            onClick={() => toggleSubtask(task.id, sub.id, sub.status)}>
                            <div className={`${styles.checkbox} ${sub.status === 'done' ? styles.checkboxDone : ''}`}>
                              {sub.status === 'done' && '✓'}
                            </div>
                            <span className={styles.subtaskTitle}>{sub.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className={styles.infoCol}>
            {project.missing_skills && (
              <div className={styles.infoCard}>
                <h3 className={styles.colTitle}>Skills to Learn</h3>
                <div className={styles.skillTags}>
                  {project.missing_skills.split(',').map((skill, i) => (
                    <span key={i} className={styles.skillTag}>{skill.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            <GitHubPanel
              project={project}
              onRepoLinked={() => queryClient.invalidateQueries({ queryKey: ['project', id] })}
            />

            {project.ai_evaluation && (
              <div className={styles.infoCard}>
                <h3 className={styles.colTitle}>AI Evaluation</h3>
                <p className={styles.infoText}>{project.ai_evaluation}</p>
              </div>
            )}

            {project.status === 'active' && (
              <button
                className={styles.abandonBtn}
                onClick={() => setAbandonModal(true)}
                disabled={abandonMutation.isPending}
              >
                Abandon Project
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}