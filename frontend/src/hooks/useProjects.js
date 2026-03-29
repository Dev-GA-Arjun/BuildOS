import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  getActiveProject,
  listProjects,
  getProject,
  createProject,
  abandonProject,
  deleteProject,
} from '../api/projects'
import { evaluateProject, generatePlan, validateProject } from '../api/ai'

export function useActiveProject() {
  return useQuery({
    queryKey: ['project', 'active'],
    queryFn: () => getActiveProject().then(r => r.data),
    retry: false,
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects().then(r => r.data),
  })
}

export function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => createProject(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useEvaluateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId) => evaluateProject(projectId).then(r => r.data),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useGeneratePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId) => generatePlan(projectId).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', data.id] })
      queryClient.invalidateQueries({ queryKey: ['project', 'active'] })
    },
  })
}

export function useValidateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId) => validateProject(projectId).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', data.id] })
      queryClient.invalidateQueries({ queryKey: ['project', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useAbandonProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId) => abandonProject(projectId).then(r => r.data),
    onSuccess: () => {
      // Invalidate everything so dashboard shows correct state immediately
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', 'active'] })
      queryClient.removeQueries({ queryKey: ['project', 'active'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (projectId) => deleteProject(projectId).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', 'active'] })
      navigate('/dashboard')
    },
  })
}