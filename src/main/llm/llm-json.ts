export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()
}

export function extractJsonCandidate(text: string): string | null {
  const startIndexes = [text.indexOf('{'), text.indexOf('[')].filter((index) => index >= 0)
  if (startIndexes.length === 0) {
    return null
  }

  const start = Math.min(...startIndexes)
  let depth = 0
  let inString = false
  let isEscaped = false

  for (let index = start; index < text.length; index++) {
    const char = text[index]

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (char === '\\') {
      isEscaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === '{' || char === '[') {
      depth++
      continue
    }

    if (char === '}' || char === ']') {
      depth--
      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return null
}

export function parseLlmJson(raw: string): unknown | null {
  const cleaned = stripMarkdownFences(raw)
    .replace(/^\uFEFF/, '')
    .trim()
  const candidates = [cleaned, extractJsonCandidate(cleaned)].filter(
    (candidate, index, array): candidate is string =>
      !!candidate && array.indexOf(candidate) === index
  )

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      continue
    }
  }

  return null
}
