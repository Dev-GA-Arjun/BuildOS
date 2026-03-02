import client from './client'

export const getTask = (id) => client.get(`/tasks/${id}`)
export const updateTask = (id, data) => client.patch(`/tasks/${id}`, data)
export const deleteTask = (id) => client.delete(`/tasks/${id}`)
export const createSubtask = (taskId, data) => client.post(`/tasks/${taskId}/subtasks`, data)
export const updateSubtask = (taskId, subtaskId, data) => client.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, data)
export const deleteSubtask = (taskId, subtaskId) => client.delete(`/tasks/${taskId}/subtasks/${subtaskId}`)