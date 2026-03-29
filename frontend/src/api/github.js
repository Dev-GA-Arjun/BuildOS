import client from './client'

export const connectGitHub = () => client.get('/github/connect')
export const githubCallback = (code) => client.post('/github/connect/callback', { code })
export const listRepos = () => client.get('/github/repos')
export const linkRepo = (projectId, repo, branch) =>
  client.post(`/github/projects/${projectId}/link`, { repo, branch })
export const unlinkRepo = (projectId) =>
  client.delete(`/github/projects/${projectId}/link`)
export const getCommits = (projectId) =>
  client.get(`/github/projects/${projectId}/commits`)
export const completeTaskWithProof = (taskId, proof) =>
  client.post(`/tasks/${taskId}/complete`, { proof })