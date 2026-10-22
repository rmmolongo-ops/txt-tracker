// Règles de mot de passe, communes à l'inscription et au choix d'un nouveau mot de passe.
export const PASSWORD_RULES = [
  { id: 'length', label: '8 caractères minimum', test: p => p.length >= 8 },
  { id: 'upper', label: '1 majuscule', test: p => /[A-Z]/.test(p) },
  { id: 'number', label: '1 chiffre', test: p => /[0-9]/.test(p) },
  { id: 'special', label: '1 caractère spécial (!@#$...)', test: p => /[^A-Za-z0-9]/.test(p) },
]

export const isPasswordValid = (p) => PASSWORD_RULES.every(r => r.test(p))
