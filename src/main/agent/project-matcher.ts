import type { CategorizedBug, ProjectEntry } from '@shared/types'

const SCORE_THRESHOLD = 3

/**
 * Scores a bug against a project based on keyword matches across multiple fields.
 */
function scoreProject(bug: CategorizedBug, project: ProjectEntry): number {
  let score = 0
  const keywords = project.keywords.map((k) => k.toLowerCase())
  if (keywords.length === 0) return score

  const areaPathLower = bug.areaPath.toLowerCase()
  const titleWords = bug.title.toLowerCase().split(/\s+/)
  const macroLower = bug.macroCategory.toLowerCase()
  const subLower = bug.subCategory.toLowerCase()

  for (const keyword of keywords) {
    // areaPath contains keyword → +2
    if (areaPathLower.includes(keyword)) {
      score += 2
    }

    // tag matches keyword → +2 per tag match
    for (const tag of bug.tags) {
      if (tag.toLowerCase() === keyword) {
        score += 2
      }
    }

    // macroCategory or subCategory matches keyword → +1
    if (macroLower === keyword || subLower === keyword) {
      score += 1
    }

    // Word in title matches keyword → +1 per keyword match
    if (titleWords.includes(keyword)) {
      score += 1
    }
  }

  // Bug's areaPath contains the project type AND project is that type → +1
  if (areaPathLower.includes(project.type.toLowerCase())) {
    score += 1
  }

  return score
}

/**
 * Selects the best matching project for a bug based on keyword scoring.
 * Returns null if the best score is below the threshold (< 3).
 */
export function selectPrimaryProject(bug: CategorizedBug, projects: ProjectEntry[]): string | null {
  if (projects.length === 0) return null

  let bestId: string | null = null
  let bestScore = 0

  for (const project of projects) {
    const score = scoreProject(bug, project)
    if (score > bestScore) {
      bestScore = score
      bestId = project.id
    }
  }

  return bestScore >= SCORE_THRESHOLD ? bestId : null
}

/**
 * Suggests secondary projects for cross-repo context based on the primary project's type.
 */
export function suggestSecondaryProjects(primaryId: string, projects: ProjectEntry[]): string[] {
  const primary = projects.find((p) => p.id === primaryId)
  if (!primary) return []

  const secondaryIds: string[] = []

  for (const project of projects) {
    if (project.id === primaryId) continue

    if (project.type === 'shared') {
      secondaryIds.push(project.id)
    } else if (primary.type === 'backend' && project.type === 'frontend') {
      secondaryIds.push(project.id)
    } else if (primary.type === 'frontend' && project.type === 'backend') {
      secondaryIds.push(project.id)
    }
  }

  return secondaryIds
}
