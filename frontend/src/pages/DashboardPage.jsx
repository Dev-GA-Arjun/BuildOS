import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { useActiveProject, useProjects } from '../hooks/useProjects'
import apiClient from '../api/client'
import styles from './DashboardPage.module.css'

function getHeatmapColor(count) {
  if (count === 0) return 'var(--bg-card)'
  if (count <= 2) return 'rgba(51,194,40,0.25)'
  if (count <= 4) return 'rgba(51,194,40,0.5)'
  if (count <= 6) return 'rgba(51,194,40,0.75)'
  return '#33C228'
}

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

function generateDays() {
  const days = []
  const today = new Date()
  for (let i = 180; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function calcStreak(activityData) {
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const entry = activityData[key]
    const count = entry ? (entry.subtasks_completed + entry.tasks_completed) : 0
    if (count > 0) streak++
    else break
  }
  return streak
}

export default function DashboardPage() {
  const [expandedPhase, setExpandedPhase] = useState(null)
  const [activityData, setActivityData] = useState({})
  const { data: activeProject, isLoading: loadingActive } = useActiveProject()
  const { data: allProjects, isLoading: loadingProjects } = useProjects()

  useEffect(() => {
    apiClient.get('/activity/')
      .then(res => setActivityData(res.data))
      .catch(() => setActivityData({}))
  }, [])

  const progress = calcProgress(activeProject)
  const streak = calcStreak(activityData)
  const allDays = generateDays()
  const pastProjects = allProjects?.filter(p => p.status === 'completed' || p.status === 'abandoned') || []
  const completedCount = allProjects?.filter(p => p.status === 'completed').length || 0

  return (
    <AppLayout>
      <div className={styles.dashboard}>

        <div className={styles.statsRow}>
          <div className={`${styles.statCard} ${styles.streakCard}`}>
            <span className={styles.statLabel}>Current Streak</span>
            <div className={styles.streakValue}>
              <div className={styles.streakFire}>🔥</div>
              <div className={styles.streakInfo}>
                <span className={styles.streakNum}>{streak}</span>
                <span className={styles.streakUnit}>{streak === 1 ? 'Day' : 'Days'}</span>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active Project</span>
            <div className={styles.statValue}>
              <span className={styles.statNum}>{activeProject ? `${progress}%` : '—'}</span>
              <span className={styles.statUnit}>{activeProject ? 'complete' : 'no project'}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Projects Shipped</span>
            <div className={styles.statValue}>
              <span className={styles.statNum}>{completedCount}</span>
              <span className={styles.statUnit}>completed</span>
            </div>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.leftCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Active Project</h2>
                  <p className={styles.cardSub}>
                    {loadingActive ? 'Loading...' : activeProject?.title || 'No active project'}
                  </p>
                </div>
                {activeProject && (
                  <Link to={`/projects/${activeProject.id}`} className={styles.viewBtn}>View →</Link>
                )}
              </div>

              {!activeProject && !loadingActive && (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>You have no active project.</p>
                  <Link to="/projects/new" className={styles.emptyBtn}>⚡ Start a New Project</Link>
                </div>
              )}

              {activeProject && (
                <>
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                    </div>
                    <span className={styles.progressLabel}>{progress}%</span>
                  </div>
                  <div className={styles.phases}>
                    {activeProject.phases?.map((phase) => {
                      const phaseDone = phase.tasks?.every(t => t.status === 'done')
                      const phaseActive = phase.tasks?.some(t => t.status === 'in_progress')
                      const isOpen = expandedPhase === phase.id
                      return (
                        <div key={phase.id} className={styles.phase}>
                          <div
                            className={`${styles.phaseHeader} ${phaseDone ? styles.phaseDone : ''} ${phaseActive ? styles.phaseActive : ''}`}
                            onClick={() => setExpandedPhase(isOpen ? null : phase.id)}
                          >
                            <div className={styles.phaseLeft}>
                              <span className={styles.phaseIcon}>{phaseDone ? '✅' : phaseActive ? '⚡' : '○'}</span>
                              <span className={styles.phaseTitle}>{phase.title}</span>
                            </div>
                            <span className={styles.phaseChevron}>{isOpen ? '▾' : '▸'}</span>
                          </div>
                          {isOpen && (
                            <div className={styles.taskList}>
                              {phase.tasks?.map((task) => (
                                <div key={task.id} className={styles.taskItem}>
                                  <span className={`${styles.taskDot} ${styles[`task_${task.status}`]}`} />
                                  <span className={styles.taskTitle}>{task.title}</span>
                                  <span className={styles.taskBadge}>{task.status.replace('_', ' ')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Past Projects</h2>
              {loadingProjects ? (
                <p className={styles.cardSub}>Loading...</p>
              ) : pastProjects.length === 0 ? (
                <p className={styles.cardSub} style={{ marginTop: '1rem' }}>No past projects yet.</p>
              ) : (
                <div className={styles.pastList}>
                  {pastProjects.map((p) => (
                    <div key={p.id} className={styles.pastItem}>
                      <div>
                        <p className={styles.pastTitle}>{p.title}</p>
                        <p className={styles.pastMeta}>
                          {p.deadline_weeks} weeks{p.completed_at ? ` · shipped ${p.completed_at}` : ''}
                        </p>
                      </div>
                      <span className={`${styles.pastBadge} ${p.status === 'completed' ? styles.badgeComplete : styles.badgeAbandoned}`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Execution Heatmap</h2>
              <p className={styles.cardSub}>Last 6 months of activity</p>
              <div className={styles.heatmap}>
                {allDays.map((day) => {
                  const entry = activityData[day]
                  const count = entry ? (entry.subtasks_completed + entry.tasks_completed) : 0
                  return (
                    <div
                      key={day}
                      className={styles.heatCell}
                      style={{ background: getHeatmapColor(count) }}
                      title={`${day}: ${count} actions`}
                    />
                  )
                })}
              </div>
              <div className={styles.heatLegend}>
                <span className={styles.legendLabel}>Less</span>
                {[0, 2, 4, 6, 8].map((v) => (
                  <div key={v} className={styles.legendCell} style={{ background: getHeatmapColor(v) }} />
                ))}
                <span className={styles.legendLabel}>More</span>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Quick Actions</h2>
              <div className={styles.actions}>
                <Link to="/projects/new" className={styles.actionBtn}><span>⚡</span> New Project</Link>
                {activeProject && (
                  <Link to={`/projects/${activeProject.id}`} className={styles.actionBtnSecondary}>
                    <span>📋</span> View Active Project
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}