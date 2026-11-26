import { Component } from 'react'

// Catches a crash while rendering so one broken page does not blank the whole app. When `resetKey` changes (the
// shell passes the page address), the error is cleared so moving to another page shows that page again.
export default class ErrorBoundary extends Component {
  state = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey }
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="message-page" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">This page hit an unexpected error. Reload to try again.</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
