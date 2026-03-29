import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// 🎨 Console easter egg
console.log(
  '%c ⚡ BuildOS ',
  'background: #33C228; color: #0F172A; font-size: 16px; font-weight: bold; padding: 6px 14px; border-radius: 6px;'
)
console.log(
  '%c Vibe coded by KSqaud128',
  'color: #33C228; font-size: 12px; padding: 2px 0;'
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)