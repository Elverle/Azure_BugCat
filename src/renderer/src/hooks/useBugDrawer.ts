import { useState, useCallback, useMemo } from 'react'
import type { CategorizedBug } from '@shared/types'

export interface UseBugDrawerReturn {
  isOpen: boolean
  selectedBug: CategorizedBug | null
  hasPrev: boolean
  hasNext: boolean
  openDrawer: (bug: CategorizedBug) => void
  closeDrawer: () => void
  goToPrev: () => void
  goToNext: () => void
}

export function useBugDrawer(bugList: CategorizedBug[]): UseBugDrawerReturn {
  // Only the id is kept: the bug itself is always read back from the current list,
  // so the drawer follows fresh data and closes on its own when the bug drops out.
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null)

  const currentIndex = useMemo(() => {
    if (selectedBugId === null) return -1
    return bugList.findIndex((b) => b.id === selectedBugId)
  }, [selectedBugId, bugList])

  const selectedBug = currentIndex >= 0 ? bugList[currentIndex] : null
  const isOpen = selectedBug !== null
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < bugList.length - 1

  const openDrawer = useCallback((bug: CategorizedBug) => {
    setSelectedBugId(bug.id)
  }, [])

  const closeDrawer = useCallback(() => {
    setSelectedBugId(null)
  }, [])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedBugId(bugList[currentIndex - 1].id)
    }
  }, [currentIndex, bugList])

  const goToNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < bugList.length - 1) {
      setSelectedBugId(bugList[currentIndex + 1].id)
    }
  }, [currentIndex, bugList])

  return {
    isOpen,
    selectedBug,
    hasPrev,
    hasNext,
    openDrawer,
    closeDrawer,
    goToPrev,
    goToNext
  }
}
