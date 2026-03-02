import client from './client'

export const evaluateProject = (projectId) => client.post(`/ai/evaluate/${projectId}`)
export const generatePlan = (projectId) => client.post(`/ai/generate-plan/${projectId}`)
export const validateProject = (projectId) => client.post(`/ai/validate/${projectId}`)