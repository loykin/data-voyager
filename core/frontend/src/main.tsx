import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import '@data-voyager/shared-ui/styles/globals.css'
import '@loykin/designkit/styles'
import '@loykin/dashboardkit/styles'
import './generated/extension-loader'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
