import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { useProject, useValidateProject, useAbandonProject } from '../hooks/useProjects'
import { useUpdateSubtask } from '../hooks/useTask'
import styles from './ProjectPage.module.css'

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
    ? `\n Topics I learned along the way: ${project.missing_skills}`
    : ''

  return ` Just shipped "${title}"!

I challenged myself to build this project in ${weeks} week${weeks > 1 ? 's' : ''} — and I did it.

${validationReport || 'It was a challenging but rewarding build. Learned a lot along the way!'}${skillsLearned}

Tracked every task, every phase, every week using BuildOS — an AI-powered project completion tracker that held me accountable.

#buildwithbuildos`
}

const DEPLOY_LINKS = [
  { name: 'Vercel', desc: 'Best for frontend / React', url: 'https://vercel.com/new', color: '#ffffff', icon: '▲' },
  { name: 'Render', desc: 'Best for backend / FastAPI', url: 'https://render.com', color: '#46E3B7', icon: '⬡' },
  { name: 'Netlify', desc: 'Great for static sites', url: 'https://app.netlify.com/start', color: '#00C7B7', icon: '◆' },
  { name: 'Railway', desc: 'Full-stack in one place', url: 'https://railway.app', color: '#7B61FF', icon: '🚂' },
]

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
          {validationReport && (
            <p className={styles.modalReport}>{validationReport}</p>
          )}
        </div>

        <div className={styles.modalSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>📢 Share on LinkedIn</h3>
            <span className={styles.sectionHint}>Edit before posting</span>
          </div>
          <textarea
            className={styles.postTextarea}
            value={postText}
            onChange={e => setPostText(e.target.value)}
            rows={10}
          />
          <div className={styles.postActions}>
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button className={styles.linkedinBtn} onClick={handleLinkedIn}>
              Share on LinkedIn →
            </button>
          </div>
        </div>

        <div className={styles.modalSection}>
          <h3 className={styles.sectionTitle}>🌐 Deploy Your Project</h3>
          <div className={styles.deployGrid}>
            {DEPLOY_LINKS.map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.deployCard}
              >
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

        <button className={styles.modalClose} onClick={onClose}>
          Done — Go to Dashboard
        </button>
      </div>
    </div>
  )
}

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activePhaseId, setActivePhaseId] = useState(null)
  const [expandedTask, setExpandedTask] = useState(null)
  const [shipModal, setShipModal] = useState(false)
  const [validationReport, setValidationReport] = useState(null)

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

  const handleValidate = async () => {
    try {
      const result = await validateMutation.mutateAsync(id)
      setValidationReport(result?.ai_validation_report || null)
      setShipModal(true)
    } catch {
      alert('Validation failed. Try again.')
    }
  }

  const handleAbandon = async () => {
    if (window.confirm('Are you sure you want to abandon this project?')) {
      await abandonMutation.mutateAsync(id)
      navigate('/dashboard')
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
                <div key={phase.id} className={`${styles.phaseTab} ${isActive ? styles.phaseTabActive : ''} ${allDone ? styles.phaseTabDone : ''}`} onClick={() => setActivePhaseId(phase.id)}>
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
                    </div>
                    {isOpen && (
                      <div className={styles.subtaskList}>
                        {task.subtasks?.map((sub) => (
                          <div key={sub.id} className={`${styles.subtaskItem} ${sub.status === 'done' ? styles.subtaskDone : ''}`} onClick={() => toggleSubtask(task.id, sub.id, sub.status)}>
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
            {project.ai_evaluation && (
              <div className={styles.infoCard}>
                <h3 className={styles.colTitle}>AI Evaluation</h3>
                <p className={styles.infoText}>{project.ai_evaluation}</p>
              </div>
            )}
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
            <div className={styles.infoCard}>
              <h3 className={styles.colTitle}>Project Stats</h3>
              <div className={styles.statsList}>
                <div className={styles.statRow}>
                  <span className={styles.statKey}>Status</span>
                  <span className={styles.statVal} style={{ color: 'var(--accent)' }}>{project.status} ⚡</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statKey}>Timeline</span>
                  <span className={styles.statVal}>{project.deadline_weeks} weeks</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statKey}>Progress</span>
                  <span className={styles.statVal}>{progress}%</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statKey}>Started</span>
                  <span className={styles.statVal}>{project.started_at || '—'}</span>
                </div>
                {project.completed_at && (
                  <div className={styles.statRow}>
                    <span className={styles.statKey}>Completed</span>
                    <span className={styles.statVal}>{project.completed_at}</span>
                  </div>
                )}
              </div>
            </div>
            {project.status === 'active' && (
              <button className={styles.abandonBtn} onClick={handleAbandon} disabled={abandonMutation.isPending}>
                {abandonMutation.isPending ? 'Abandoning...' : 'Abandon Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}