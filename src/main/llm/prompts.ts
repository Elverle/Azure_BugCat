export function buildSystemPrompt(categories: string[]): string {
  const base =
    'You are a software quality analyst. Categorize each bug below.\n' +
    'Return ONLY valid JSON, no markdown, no preamble.\n' +
    'Schema: { "results": [{ "bugId": number, "macroCategory": string, "subCategory": string, "categoryReason": string }] }'

  if (categories.length > 0) {
    return base + `\nUse ONLY these categories: ${categories.join(', ')}`
  }

  return base + '\nAssign categories freely based on content.'
}

export function buildUserMessage(
  bugs: { id: number; title: string; description: string }[]
): string {
  const payload = bugs.map((b) => ({ id: b.id, title: b.title, description: b.description }))
  return `Categorize these bugs:\n${JSON.stringify(payload)}`
}
