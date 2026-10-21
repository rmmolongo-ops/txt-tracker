import { Component } from 'react'
import { C } from '../lib/constants'
import { reportError } from '../lib/errorReporting'

// Écran de secours quand un écran plante : au lieu d'une page blanche, un message et un bouton
// pour recharger. L'erreur est enregistrée dans le journal consultable par le super admin.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    const withComponent = error instanceof Error ? error : new Error(String(error))
    if (info?.componentStack) withComponent.stack = (withComponent.stack || '') + '\n' + info.componentStack
    ;(this.props.onError || reportError)(withComponent, 'ecran')
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div role="alert" style={{ background: C.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 10 }}>Un problème est survenu</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
            Cet écran n'a pas pu s'afficher. L'erreur a été signalée. Recharge l'appli pour continuer.
          </div>
          <button onClick={() => window.location.reload()}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            Recharger l'appli
          </button>
        </div>
      </div>
    )
  }
}
