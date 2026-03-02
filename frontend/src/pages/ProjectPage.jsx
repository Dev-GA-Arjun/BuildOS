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

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activePhaseId, setActivePhaseId] = useState(null)
  const [expandedTask, setExpandedTask] = useState(null)

  const { data: project, isLoading } = useProject(id)
  const validateMutation = useValidateProject()
  const abandonMutation = useAbandonProject()
  const updateSubtask = useUpdateSubtask(id)

  const progress = calcProgress(project)
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
      await validateMutation.mutateAsync(id)
      alert('🎉 AI Validation complete!')
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
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', padding: '2rem' }}>
        loading project...
      </div>
    </AppLayout>
  )

  if (!project) return (
    <AppLayout>
      <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', padding: '2rem' }}>
        project not found.
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
              ← Back
            </button>
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
              <button
                className={styles.validateBtn}
                onClick={handleValidate}
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? '🤖 Validating...' : '✅ Validate Project'}
              </button>
            )}
          </div>
        </div>

        {/* AI Validation Result */}
        {project.ai_validation_report && (
          <div className={`${styles.validationBanner} ${project.ai_validation_passed ? styles.validationPass : styles.validationFail}`}>
            <span>{project.ai_validation_passed ? '✅' : '⚠️'}</span>
            <p>{project.ai_validation_report}</p>
          </div>
        )}

        {/* Progress bar */}
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Overall Progress</span>
            <span className={styles.progressPct}>{progress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Main layout */}
        <div className={styles.mainGrid}>

          {/* Phases */}
          <div className={styles.phasesCol}>
            <h3 className={styles.colTitle}>Phases</h3>
            {project.phases?.map((phase) => {
              const allDone = phase.tasks?.every(t => t.status === 'done')
              const hasActive = phase.tasks?.some(t => t.status === 'in_progress')
              const totalSubs = phase.tasks?.reduce((a, t) => a + (t.subtasks?.length || 0), 0)
              const doneSubs = phase.tasks?.reduce((a, t) => a + (t.subtasks?.filter(s => s.status === 'done').length || 0), 0)

              return (
                <div
                  key={phase.id}
                  className={`${styles.phaseTab} ${(activePhaseId ?? project?.phases?.[0]?.id) === phase.id ? styles.phaseTabActive : ''}`}
                  onClick={() => setActivePhaseId(phase.id)}
                >
                  <div className={styles.phaseTabTop}>
                    <span className={styles.phaseTabIcon}>
                      {allDone ? '✅' : hasActive ? '⚡' : '○'}
                    </span>
                    <span className={styles.phaseTabTitle}>{phase.title}</span>
                  </div>
                  <div className={styles.phaseTabBar}>
                    <div
                      className={styles.phaseTabFill}
                      style={{ width: `${totalSubs ? (doneSubs / totalSubs) * 100 : 0}%` }}
                    />
                  </div>
                  <span className={styles.phaseTabCount}>{doneSubs}/{totalSubs} subtasks</span>
                </div>
              )
            })}
          </div>

          {/* Tasks */}
          <div className={styles.tasksCol}>
            <h3 className={styles.colTitle}>{activePhase?.title}</h3>
            <div className={styles.taskList}>
              {activePhase?.tasks?.map((task) => {
                const allDone = task.subtasks?.every(s => s.status === 'done')
                const isOpen = expandedTask === task.id
                const doneSubs = task.subtasks?.filter(s => s.status === 'done').length || 0

                return (
                  <div key={task.id} className={`${styles.taskCard} ${allDone ? styles.taskDone : ''}`}>
                    <div
                      className={styles.taskHeader}
                      onClick={() => setExpandedTask(isOpen ? null : task.id)}
                    >
                      <div className={styles.taskLeft}>
                        <span className={`${styles.taskDot} ${styles[`dot_${task.status}`]}`} />
                        <div>
                          <p className={styles.taskTitle}>{task.title}</p>
                          <p className={styles.taskDesc}>{task.description}</p>
                        </div>
                      </div>
                      <div className={styles.taskRight}>
                        <span className={styles.taskProgress}>
                          {doneSubs}/{task.subtasks?.length || 0}
                        </span>
                        <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className={styles.subtaskList}>
                        {task.subtasks?.map((sub) => (
                          <div
                            key={sub.id}
                            className={`${styles.subtaskItem} ${sub.status === 'done' ? styles.subtaskDone : ''}`}
                            onClick={() => toggleSubtask(task.id, sub.id, sub.status)}
                          >
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

          {/* Info col */}
          <div className={styles.infoCol}>
            {project.ai_evaluation && (
              <div className={styles.infoCard}>
                <h3 className={styles.colTitle}>AI Evaluation</h3>
                <p className={styles.infoText}>{project.ai_evaluation}</p>
              </div>
            )}

            <div className={styles.infoCard}>
              <h3 className={styles.colTitle}>Project Stats</h3>
              <div className={styles.statsList}>
                <div className={styles.statRow}>
                  <span className={styles.statKey}>Status</span>
                  <span className={styles.statVal} style={{ color: 'var(--accent)' }}>
                    {project.status} ⚡
                  </span>
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