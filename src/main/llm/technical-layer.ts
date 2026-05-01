export const TECHNICAL_LAYER_VALUES = ['FE', 'BE', 'FE/BE', 'Non determinabile'] as const

export type TechnicalLayer = (typeof TECHNICAL_LAYER_VALUES)[number]

const FULL_STACK_PATTERNS = [
  /^fe\s*\/\s*be$/i,
  /^be\s*\/\s*fe$/i,
  /^frontend\s*\/\s*backend$/i,
  /^backend\s*\/\s*frontend$/i,
  /^front\s*end\s*\/\s*back\s*end$/i,
  /^full[\s-]?stack$/i,
  /\bboth\b/i,
  /\bentramb/i,
  /frontend.*backend/i,
  /backend.*frontend/i,
  /client.*server/i,
  /server.*client/i
]

const FRONTEND_PATTERNS = [
  /^fe$/i,
  /^frontend$/i,
  /^front-end$/i,
  /\bfrontend\b/i,
  /\bfront\s*end\b/i,
  /\bui\b/i,
  /\bux\b/i,
  /\blayout\b/i,
  /\bform\b/i,
  /\bmodal(?:e)?\b/i,
  /\bpage\b/i,
  /\bscreen\b/i,
  /\bschermata\b/i,
  /\bmaschera\b/i,
  /\bbrowser\b/i,
  /\bclient\b/i,
  /\brender/i,
  /\bcss\b/i,
  /\bcomponent\b/i,
  /\bvisual\b/i
]

const BACKEND_PATTERNS = [
  /^be$/i,
  /^backend$/i,
  /^back-end$/i,
  /\bbackend\b/i,
  /\bback\s*end\b/i,
  /\bapi\b/i,
  /\bendpoint\b/i,
  /\bserver\b/i,
  /\bdatabase\b/i,
  /\bdb\b/i,
  /\bquery\b/i,
  /\brepository\b/i,
  /\bpersisten/i,
  /\bservice\b/i,
  /\bmicroservice\b/i
]

const UNKNOWN_PATTERNS = [
  /^non determinabile$/i,
  /^non determinato$/i,
  /^unknown$/i,
  /^unclear$/i,
  /^unsure$/i,
  /^n\/d$/i,
  /^not enough info$/i,
  /^insufficient evidence$/i
]

export function normalizeTechnicalLayer(
  value: unknown,
  fallback: TechnicalLayer = 'Non determinabile'
): TechnicalLayer {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return fallback
  }

  if (FULL_STACK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'FE/BE'
  }

  if (FRONTEND_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'FE'
  }

  if (BACKEND_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'BE'
  }

  if (UNKNOWN_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'Non determinabile'
  }

  return fallback
}
