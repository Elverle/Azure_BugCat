import { BugItem } from '../../shared/types'

export function splitIntoChunks(bugs: BugItem[], chunkSize: number): BugItem[][] {
  if (chunkSize <= 0) return [bugs]

  const chunks: BugItem[][] = []
  for (let i = 0; i < bugs.length; i += chunkSize) {
    chunks.push(bugs.slice(i, i + chunkSize))
  }
  return chunks
}
