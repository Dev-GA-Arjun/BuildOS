import client from './client'

export const createProject = (data) => client.post('/projects', data)
export const listProjects = () => client.get('/projects')
export const getActiveProject = () => client.get('/projects/active')
export const getProject = (id) => client.get(`/projects/${id}`)
export const updateProject = (id, data) => client.patch(`/projects/${id}`, data)
export const abandonProject = (id) => client.patch(`/projects/${id}/abandon`)
export const deleteProject = (id) => client.delete(`/projects/${id}`)