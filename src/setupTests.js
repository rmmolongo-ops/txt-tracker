// Chargé automatiquement avant chaque fichier de test (Create React App).

// Rendu React direct avec act() : active les avertissements act de React 18.
global.IS_REACT_ACT_ENVIRONMENT = true

// jsdom ne fournit pas ResizeObserver, utilisé par les graphiques recharts (ResponsiveContainer).
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
