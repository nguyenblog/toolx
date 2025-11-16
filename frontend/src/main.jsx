import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './style.css'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'

const root = document.getElementById('root')
createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)