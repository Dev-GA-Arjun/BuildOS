import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Loader from '../components/Loader'
import styles from './NewProjectPage.module.css'
import { useCreateProject, useEvaluateProject, useGeneratePlan } from '../hooks/useProjects'
import { clarifyProject } from '../api/ai'

const STEPS = ['Define', 'Clarify', 'Evaluate', 'Plan']

export default function NewProjectPage() {
  const createProject = useCreateProject()
  const evaluateProjectMutation = useEvaluateProject()
  const generatePlanMutation = useGeneratePlan()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingContext, setLoadingContext] = useState('evaluate')
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    skills_input: '',
    deadline_weeks: 4,
  })

  const [projectId, setProjectId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [evaluation, setEvaluation] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleAnswerChip = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }))
  }

  const handleAnswerText = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id]?.trim())

  // Step 0 → Step 1: create project + get clarifying questions
  const handleClarify = async () => {
    if (!form.title || !form.description || !form.skills_input) return
    setLoadingContext('evaluate')
    setLoading(true)
    setError(null)
    try {
      const project = await createProject.mutateAsync({
        title: form.title,
        description: form.description,
        skills_input: form.skills_input,
        deadline_weeks: parseInt(form.deadline_weeks),
      })
      setProjectId(project.id)

      const res = await clarifyProject(project.id)
      setQuestions(res.data.questions || [])
      setStep(1)
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setError('You already have an active project. Free plan allows 1 active project at a time.')
      } else if (status === 429) {
        setError(err.friendlyMessage)
      } else {
        setError(err.friendlyMessage || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 1 → Step 2: evaluate with answers
  const handleEvaluate = async () => {
    if (!allAnswered) return
    setLoadingContext('evaluate')
    setLoading(true)
    setError(null)
    try {
      const result = await evaluateProjectMutation.mutateAsync(projectId)
      setEvaluation(result)
      setStep(2)
    } catch (err) {
      const status = err?.response?.status
      if (status === 429) {
        setError(err.friendlyMessage)
      } else {
        setError(err.friendlyMessage || 'Evaluation failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 2 → Step 3: generate plan
  const handleGeneratePlan = async () => {
    setLoadingContext('plan')
    setLoading(true)
    setError(null)
    try {
      await generatePlanMutation.mutateAsync(projectId)
      setStep(3)
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to generate plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => navigate(`/projects/${projectId}`)

  if (loading) return (
    <AppLayout>
      <Loader context={loadingContext} />
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className={styles.page}>

        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={s} className={styles.stepWrap}>
              <div className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ''} ${i < step ? styles.stepDotDone : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${i <= step ? styles.stepLabelActive : ''}`}>{s}</span>
              {i < STEPS.length - 1 && (
                <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0 — Define */}
        {step === 0 && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h1 className={styles.title}>Define Your Project</h1>
              <p className={styles.subtitle}>Tell BuildOS what you want to build and where you stand.</p>
            </div>
            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Project Title</label>
                <input
                  className={styles.input}
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Netflix Clone"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>What are you building?</label>
                <textarea
                  className={styles.textarea}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe your project — what it does, who it's for, what features it has..."
                  rows={4}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Your Current Skills</label>
                <textarea
                  className={styles.textarea}
                  name="skills_input"
                  value={form.skills_input}
                  onChange={handleChange}
                  placeholder="e.g. I know basic React, never built a backend, completed 2 small projects..."
                  rows={3}
                />
                <p className={styles.fieldHint}>Be honest — AI will match tasks to your actual skill level.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Timeline — <span className={styles.accentText}>{form.deadline_weeks} weeks</span>
                </label>
                <input
                  className={styles.slider}
                  type="range"
                  name="deadline_weeks"
                  min={1} max={8}
                  value={form.deadline_weeks}
                  onChange={handleChange}
                />
                <div className={styles.sliderLabels}>
                  <span>1 week</span><span>8 weeks</span>
                </div>
              </div>

              {error && (
                <div className={error.includes('limit reached') || error.includes('Daily AI limit') ? styles.limitErrorBox : styles.errorBox}>
                  {error.includes('limit reached') || error.includes('Daily AI limit') ? (
                    <div className={styles.limitError}>
                      <p className={styles.limitErrorText}>
                        Daily AI limit reached. Free plan allows 5 calls per day.
                      </p>
                      <Link to="/settings" className={styles.limitBtn}>
                        Add API Key →
                      </Link>
                    </div>
                  ) : (
                    error
                  )}
                </div>
              )}

              <button
                className={styles.primaryBtn}
                onClick={handleClarify}
                disabled={!form.title || !form.description || !form.skills_input}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Clarify */}
        {step === 1 && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h1 className={styles.title}>A few quick questions</h1>
              <p className={styles.subtitle}>
                BuildOS needs a bit more context to generate precise, code-level tasks for your project.
              </p>
            </div>

            <div className={styles.chatWrap}>
              {questions.map((q) => (
                <div key={q.id} className={styles.chatItem}>

                  {/* AI bubble */}
                  <div className={styles.aiBubbleRow}>
                    <div className={styles.aiAvatar}>AI</div>
                    <div className={styles.aiBubble}>{q.text}</div>
                  </div>

                  {/* Quick reply chips */}
                  <div className={styles.chipsRow}>
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        className={`${styles.chip} ${answers[q.id] === opt ? styles.chipSelected : ''}`}
                        onClick={() => handleAnswerChip(q.id, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Custom answer input */}
                  <div className={styles.customAnswerRow}>
                    <input
                      className={styles.customInput}
                      placeholder="Or type a custom answer..."
                      value={answers[q.id] && !q.options.includes(answers[q.id]) ? answers[q.id] : ''}
                      onChange={(e) => handleAnswerText(q.id, e.target.value)}
                    />
                  </div>

                  {/* User answer bubble — shown once answered */}
                  {answers[q.id] && (
                    <div className={styles.userBubbleRow}>
                      <div className={styles.userBubble}>{answers[q.id]}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.btnRow}>
              <button className={styles.secondaryBtn} onClick={() => setStep(0)}>Back</button>
              <button
                className={styles.primaryBtn}
                onClick={handleEvaluate}
                disabled={!allAnswered}
              >
                Evaluate Project
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Evaluate */}
        {step === 2 && evaluation && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h1 className={styles.title}>AI Evaluation</h1>
              <p className={styles.subtitle}>Here's what BuildOS thinks about your project.</p>
            </div>

            <div className={`${styles.evalResult} ${evaluation.feasible ? styles.evalGood : styles.evalBad}`}>
              <div className={styles.evalStatus}>
                {evaluation.feasible ? 'Ready to Build' : 'Not Ready Yet'}
              </div>
              <p className={styles.evalText}>{evaluation.evaluation}</p>
            </div>

            {evaluation.missing_skills && (
              <div className={styles.skillsWarn}>
                <p className={styles.skillsTitle}>Skills to learn first:</p>
                <p className={styles.skillsList}>{evaluation.missing_skills}</p>
              </div>
            )}

            {evaluation.suggested_weeks && evaluation.suggested_weeks !== Number(form.deadline_weeks) && (
              <div className={styles.timelineWarn}>
                <p>
                  AI suggests <strong className={styles.accentText}>{evaluation.suggested_weeks} weeks</strong> for this project.
                  You chose {form.deadline_weeks} — you can keep your timeline or adjust it.
                </p>
                <div className={styles.timelineChoice}>
                  <button
                    className={`${styles.timelineBtn} ${Number(form.deadline_weeks) === evaluation.suggested_weeks ? styles.timelineBtnActive : ''}`}
                    onClick={() => setForm(f => ({ ...f, deadline_weeks: evaluation.suggested_weeks }))}
                  >
                    Use AI suggestion ({evaluation.suggested_weeks} weeks)
                  </button>
                  <button
                    className={`${styles.timelineBtn} ${Number(form.deadline_weeks) !== evaluation.suggested_weeks ? styles.timelineBtnActive : ''}`}
                    onClick={() => {}}
                  >
                    Keep my timeline ({form.deadline_weeks} weeks)
                  </button>
                </div>
              </div>
            )}

            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Project</span>
                <span className={styles.summaryValue}>{form.title}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Timeline</span>
                <span className={styles.summaryValue}>{evaluation.suggested_weeks || form.deadline_weeks} weeks</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Status</span>
                <span className={`${styles.summaryValue} ${evaluation.feasible ? styles.accentText : styles.dangerText}`}>
                  {evaluation.feasible ? 'Feasible' : 'Not feasible'}
                </span>
              </div>
            </div>

            {error && (
              <div className={error.includes('limit reached') || error.includes('Daily AI limit') ? styles.limitErrorBox : styles.errorBox}>
                {error.includes('limit reached') || error.includes('Daily AI limit') ? (
                  <div className={styles.limitError}>
                    <p className={styles.limitErrorText}>
                      Daily AI limit reached. Free plan allows 5 calls per day.
                    </p>
                    <Link to="/settings" className={styles.limitBtn}>
                      Add API Key →
                    </Link>
                  </div>
                ) : (
                  error
                )}
              </div>
            )}

            <div className={styles.btnRow}>
              <button className={styles.secondaryBtn} onClick={() => setStep(1)}>Back</button>
              {evaluation.feasible && (
                <button className={styles.primaryBtn} onClick={handleGeneratePlan}>
                  Generate Execution Plan
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Plan ready */}
        {step === 3 && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h1 className={styles.title}>Plan Ready</h1>
              <p className={styles.subtitle}>
                A {form.deadline_weeks}-week execution plan has been generated for <strong>{form.title}</strong>.
              </p>
            </div>

            <div className={styles.planReady}>
              <div className={styles.planDetails}>
                <p className={styles.planTitle}>{form.title}</p>
                <p className={styles.planMeta}>
                  {form.deadline_weeks} phases · AI-generated tasks and subtasks · Ready to execute
                </p>
              </div>
            </div>

            <div className={styles.planChecks}>
              {[
                'Week-by-week phases created',
                'Tasks broken into subtasks',
                'Complexity matched to your skill level',
                'Final week includes testing and deployment',
              ].map((item) => (
                <div key={item} className={styles.checkItem}>
                  <span className={styles.checkIcon}>+</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button className={styles.primaryBtn} onClick={handleConfirm}>
              Activate Project
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  )
}