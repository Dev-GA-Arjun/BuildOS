import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('buildos_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Friendly error messages
function getFriendlyError(error) {
  const status = error.response?.status
  const detail = error.response?.data?.detail

  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return "We couldn't find what you were looking for."
  if (status === 422) return 'Something was missing or incorrect. Please check your inputs.'
  if (status === 429) return "You're going too fast! Please wait a moment and try again."

  if (status === 500) {
    if (
      detail?.toLowerCase().includes('openrouter') ||
      detail?.toLowerCase().includes('ai') ||
      detail?.toLowerCase().includes('model')
    ) {
      return "The AI is temporarily unavailable. We've likely hit the free tier limit. Please try again in a few minutes."
    }
    return 'Something went wrong on our end. Please try again shortly.'
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'BuildOS is having trouble connecting. Please check your internet and try again.'
  }

  // Network error — backend not running
  if (!error.response) {
    return 'Cannot connect to BuildOS servers. Make sure the backend is running.'
  }

  // Use API detail if short and readable
  if (typeof detail === 'string' && detail.length < 120) return detail

  return 'Something went wrong. Please try again.'
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('buildos_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    error.friendlyMessage = getFriendlyError(error)
    return Promise.reject(error)
  }
)

export default client