import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'         // оставь один импорт

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
