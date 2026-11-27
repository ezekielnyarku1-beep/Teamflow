import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './app.css'
import App from './App.jsx'
import DocumentTitle from './components/DocumentTitle.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { applyAppearance, getAppearance } from './lib/appearance.js'
import { queryClient } from './lib/queryClient.js'

applyAppearance(getAppearance())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <DocumentTitle />
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
