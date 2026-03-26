import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import '@data-voyager/shared-ui/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
