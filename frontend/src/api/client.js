import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('buildos_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function getFriendlyError(error) {
  const status = error.response?.status
  const detail = error.response?.data?.detail

  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return "We couldn't find what you were looking for."
  if (status === 422) return 'Something was missing or incorrect. Please check your inputs.'
  if (status === 409) return detail || 'This action conflicts with something that already exists.'

  if (status === 429) {
    return 'Daily AI limit reached (5 calls/day on free plan). Add your API key in Settings to remove this limit.'
  }

  if (status === 500) {
    if (
      detail?.toLowerCase().includes('openrouter') ||
      detail?.toLowerCase().includes('ai') ||
      detail?.toLowerCase().includes('model')
    ) {
      return 'Our AI is taking a breather. Please try again in a moment.'
    }
    return 'Something went wrong on our end. We are looking into it.'
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'BuildOS is temporarily unavailable. Please try again shortly.'
  }

  if (!error.response) {
    return 'BuildOS is temporarily offline. Please try again in a moment.'
  }

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