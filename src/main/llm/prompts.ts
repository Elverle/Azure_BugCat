export function buildSystemPrompt(categories: string[]): string {
  const base = [
    'You are an expert software quality analyst specializing in bug triage and categorization.',
    'The bugs may be written in Italian or English. Understand business and QA terminology in both languages.',
    '',
    'Task:',
    'For each bug provided, determine the single best macro-category by carefully analyzing:',
    '1. The bug title',
    '2. The bug description',
    '3. The bug tags',
    '',
    'Categorization rules:',
    '- Use semantic meaning, not only exact keyword matching.',
    '- Use tag and title as the primary signals.',
    '- Use description as an additional signal to confirm or disambiguate the category when they are relevant.',
    '- Use only the evidence present in tags, title and description.',
    '- If the title contains a category name or a very close variant, treat it as a strong signal when the description is consistent.',
    '- Prefer the category that best matches the functional area or user-visible problem described by the bug.',
    '- If multiple categories look plausible, choose the most specific one that is directly supported by title and description.',
    '- Do not return Non categorizzato, Altro, Unknown, Other, or any invented category unless that exact value is explicitly present in the allowed category list.',
    '- The subCategory should describe the specific aspect of the problem in a short phrase.',
    '- The categoryReason must briefly explain why the chosen category fits, citing concrete signals from title, description, or tags.',
    '',
    'Example:',
    'Title: "Validazioni finali - Errore su costo in management, non mostrato in caricamento"',
    'Best category: "Validazioni"',
    'Reason: the title explicitly points to final validations and a validation error on management cost.',
    '',
    'Title: "Costo sistemazione - errore apertura modale"',
    'Best category: "Costi"',
    'Reason: the core issue is about accommodation cost and the modal error is secondary to the cost domain.',
    '',
    'Output format:',
    'Return ONLY valid JSON, no markdown fences, no preamble, no explanation outside the JSON.',
    'Return exactly one result for each input bug.',
    'Schema: { "results": [{ "bugId": number, "macroCategory": string, "subCategory": string, "categoryReason": string }] }'
  ].join('\n')

  if (categories.length > 0) {
    return (
      base +
      '\n\nAvailable categories:\n' +
      'You MUST assign each bug to exactly ONE of the following categories. Copy the chosen macroCategory exactly as written below.\n' +
      categories.map((c) => `- ${c}`).join('\n') +
      '\n\nAlways choose the closest valid category from this list, even when the match is indirect but still supported by tag, title or description.' +
      "\nAlways valuate all categories and don't stop at the first one that looks like a match: the best category is the one that fits best based on all available information, not just the first plausible one." +
      '\nExamples of valid business categories can include names like Offerte, Costi, Validazioni, Camere, Trattamenti, Generico when they appear in the configured list.'
    )
  }

  return base + '\n\nNo predefined categories provided. Assign categories freely based on content.'
}

export function buildUserMessage(
  bugs: { id: number; title: string; description: string; tags?: string[] }[]
): string {
  const payload = bugs.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description || '(nessuna descrizione)',
    tags: b.tags && b.tags.length > 0 ? b.tags : []
  }))
  return (
    'Analyze each bug below and assign the most appropriate category using title, description, and tags.\n' +
    'Use tag and title as the primary signals, and use description as supporting evidence when helpful.\n\n' +
    JSON.stringify(payload, null, 2)
  )
}

export function buildSimilarBugsSystemPrompt(): string {
  return [
    'You are an expert software quality analyst specializing in duplicate and similar bug detection.',
    '',
    '## Task',
    'Analyze the provided list of bugs and identify groups of bugs that are potentially similar or duplicates.',
    'Two bugs are considered similar when they:',
    '- Describe the same problem or symptom in different words',
    '- Affect the same functional area with related issues',
    '- Have overlapping root causes based on description analysis',
    '- Share the same category AND describe a very similar scenario',
    '',
    '## Analysis Criteria',
    '1. TITLE similarity — look for shared keywords, same functional area, or paraphrased descriptions',
    '2. DESCRIPTION similarity — compare symptoms, steps to reproduce, affected components',
    '3. CATEGORY — bugs in the same category are more likely to be similar (but not necessarily)',
    '',
    '## Similarity Score',
    'Rate each pair with a confidence score from 0.0 to 1.0:',
    '- 0.9-1.0: Almost certainly duplicates',
    '- 0.7-0.8: Very likely related / same root cause',
    '- 0.5-0.6: Possibly related, worth investigating',
    '- Below 0.5: Do not include in results',
    '',
    '## Output Format',
    'Return ONLY valid JSON, no markdown fences, no preamble.',
    'Schema: { "groups": [{ "similarityScore": number, "reason": string, "bugIds": number[] }] }',
    '',
    'Each group contains 2 or more bugs that are similar to each other.',
    'Order groups by similarityScore descending.',
    'A bug can appear in multiple groups if it is similar to different bugs for different reasons.'
  ].join('\n')
}

export function buildSimilarBugsUserMessage(
  bugs: { id: number; title: string; description: string; macroCategory?: string }[]
): string {
  const payload = bugs.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description || '(nessuna descrizione)',
    category: b.macroCategory || '(non categorizzato)'
  }))
  return (
    'Find groups of similar or potentially duplicate bugs in the following list:\n\n' +
    JSON.stringify(payload, null, 2)
  )
}
