const CATEGORY_PALETTE = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { bg: 'bg-lime-100', text: 'text-lime-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' }
]

const TINT_PALETTE = [
  'bg-indigo-50',
  'bg-purple-50',
  'bg-pink-50',
  'bg-rose-50',
  'bg-orange-50',
  'bg-amber-50',
  'bg-yellow-50',
  'bg-lime-50',
  'bg-emerald-50',
  'bg-teal-50',
  'bg-cyan-50',
  'bg-sky-50'
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getStatusBadgeClasses(state: string): string {
  switch (state) {
    case 'Active':
      return 'bg-red-100 text-red-700'
    case 'Resolved':
      return 'bg-green-100 text-green-700'
    case 'Closed':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-blue-100 text-blue-700'
  }
}

export function getCategoryColor(category: string): { bg: string; text: string } {
  if (!category) {
    return { bg: 'bg-gray-100', text: 'text-gray-600' }
  }
  const index = hashString(category) % CATEGORY_PALETTE.length
  return CATEGORY_PALETTE[index]
}

export function getTechnicalLayerBgTint(technicalLayer: string): string {
  if (!technicalLayer) {
    return 'bg-white'
  }
  const index = hashString(technicalLayer) % TINT_PALETTE.length
  return TINT_PALETTE[index]
}
