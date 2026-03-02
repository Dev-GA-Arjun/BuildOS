import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import styles from './NewProjectPage.module.css'
import { useCreateProject, useEvaluateProject, useGeneratePlan } from '../hooks/useProjects'

const STEPS = ['Define', 'Evaluate', 'Confirm']



export default function NewProjectPage() {
  const createProject = useCreateProject()
  const evaluateProjectMutation = useEvaluateProject()
  const generatePlanMutation = useGeneratePlan()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    skills_input: '',
    deadline_weeks: 4,
  })
  const [evaluation, setEvaluation] = useState(null)
  const [projectId, setProjectId] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Step 1 — Create project + evaluate
  const handleEvaluate = async () => {
    if (!form.title || !form.description || !form.skills_input) return
    setLoading(true)
    try {
      // Create project first
      const project = await createProject.mutateAsync({
        title: form.title,
        description: form.description,
        skills_input: form.skills_input,
        deadline_weeks: parseInt(form.deadline_weeks),
      })
      setProjectId(project.id)

      // Then evaluate
      const result = await evaluateProjectMutation.mutateAsync(project.id)
      setEvaluation(result)
      setStep(1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — Generate plan
  const handleGeneratePlan = async () => {
    setLoading(true)
    try {
      await generatePlanMutation.mutateAsync(projectId)
      setStep(2)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Step 3 — Go to project
  const handleConfirm = () => {
    navigate(`/projects/${projectId}`)
  }

  return (
    <AppLayout>
      <div className={styles.page}>

        {/* Step indicator */}
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

        {/* Step 0 — Define project */}
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
                  placeholder="e.g. Personal Portfolio Website"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>What are you building?</label>
                <textarea
                  className={styles.textarea}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe your project idea in detail. What it does, who it's for, what features it has..."
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
                  placeholder="e.g. I know basic Python, basic HTML and CSS, never used JavaScript properly, built 2 small projects before..."
                  rows={3}
                />
                <p className={styles.fieldHint}>Be honest — AI will match your skills to the project requirements.</p>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Timeline — <span className={styles.accentText}>{form.deadline_weeks} weeks</span>
                </label>
                <input
                  className={styles.slider}
                  type="range"
                  name="deadline_weeks"
                  min={1}
                  max={12}
                  value={form.deadline_weeks}
                  onChange={handleChange}
                />
                <div className={styles.sliderLabels}>
                  <span>1 week</span>
                  <span>12 weeks</span>
                </div>
              </div>

              <button
                className={styles.primaryBtn}
                onClick={handleEvaluate}
                disabled={loading || !form.title || !form.description || !form.skills_input}
              >
                {loading ? (
                  <span className={styles.loadingWrap}>
                    <span className={styles.spinner} />
                    AI is evaluating your project...
                  </span>
                ) : (
                  '⚡ Evaluate with AI →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — AI Evaluation result */}
        {step === 1 && evaluation && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h1 className={styles.title}>AI Evaluation</h1>
              <p className={styles.subtitle}>Here's what BuildOS thinks about your project.</p>
            </div>

            <div className={`${styles.evalResult} ${evaluation.feasible ? styles.evalGood : styles.evalBad}`}>
              <div className={styles.evalIcon}>
                {evaluation.feasible ? '✅' : '⚠️'}
              </div>
              <div>
                <p className={styles.evalStatus}>
                  {evaluation.feasible ? 'Ready to Build' : 'Not Ready Yet'}
                </p>
                <p className={styles.evalText}>{evaluation.evaluation}</p>
              </div>
            </div>

            {evaluation.missing_skills && (
              <div className={styles.skillsWarn}>
                <p className={styles.skillsTitle}>⚡ Skills to learn first:</p>
                <p className={styles.skillsList}>{evaluation.missing_skills}</p>
              </div>
            )}

            {evaluation.suggested_weeks && (
              <div className={styles.timelineWarn}>
                <p>⏱️ AI suggests <strong className={styles.accentText}>{evaluation.suggested_weeks} weeks</strong> for this project instead of {form.deadline_weeks}.</p>
              </div>
            )}

            {/* Project summary */}
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
                  {evaluation.feasible ? 'Feasible ✓' : 'Not feasible ✗'}
                </span>
              </div>
            </div>

            <div className={styles.btnRow}>
              <button className={styles.secondaryBtn} onClick={() => setStep(0)}>
                ← Edit Project
              </button>
              {evaluation.feasible && (
                <button
                  className={styles.primaryBtn}
                  onClick={handleGeneratePlan}
                  disabled={loading}
                >
                  {loading ? (
                    <span className={styles.loadingWrap}>
                      <span className={styles.spinner} />
                      Generating your plan...
                    </span>
                  ) : (
                    '🗺️ Generate Execution Plan →'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Plan generated */}
        {step === 2 && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h1 className={styles.title}>Your Plan is Ready 🎉</h1>
              <p className={styles.subtitle}>
                AI has generated a {form.deadline_weeks}-week execution plan for <strong>{form.title}</strong>.
                Review it and activate your project.
              </p>
            </div>

            <div className={styles.planReady}>
              <div className={styles.planIcon}>🗺️</div>
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
                'Complexity matches your skill level',
                'Final week includes testing & polish',
              ].map((item) => (
                <div key={item} className={styles.checkItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button className={styles.primaryBtn} onClick={handleConfirm}>
              🚀 Activate Project →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}