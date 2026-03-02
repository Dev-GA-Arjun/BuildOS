import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask, deleteTask, createSubtask, updateSubtask, deleteSubtask } from '../api/tasks'

// ── Update task ───────────────────────────────────────────
export function useUpdateTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }) => updateTask(taskId, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', 'active'] })
    },
  })
}

// ── Delete task ───────────────────────────────────────────
export function useDeleteTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId) => deleteTask(taskId).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

// ── Create subtask ────────────────────────────────────────
export function useCreateSubtask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }) => createSubtask(taskId, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

// ── Update subtask ────────────────────────────────────────
export function useUpdateSubtask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtaskId, data }) =>
      updateSubtask(taskId, subtaskId, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', 'active'] })
    },
  })
}

// ── Delete subtask ────────────────────────────────────────
export function useDeleteSubtask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtaskId }) =>
      deleteSubtask(taskId, subtaskId).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}