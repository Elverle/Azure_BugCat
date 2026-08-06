import { useState, useCallback, useEffect, useMemo } from 'react'
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
  const [selectedBug, setSelectedBug] = useState<CategorizedBug | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const currentIndex = useMemo(() => {
    if (!selectedBug) return -1
    return bugList.findIndex((b) => b.id === selectedBug.id)
  }, [selectedBug, bugList])

  // Auto-close if selected bug is no longer in the filtered list
  useEffect(() => {
    if (isOpen && selectedBug && currentIndex === -1) {
      // Sintomo dell'issue 2.3 (stato di sessione duplicato); rimosso dal Task 22.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(false)
      setSelectedBug(null)
    }
  }, [isOpen, selectedBug, currentIndex])

  // Keep selectedBug in sync with latest data from bugList
  useEffect(() => {
    if (isOpen && selectedBug && currentIndex >= 0) {
      const updated = bugList[currentIndex]
      if (updated !== selectedBug) {
        // Sintomo dell'issue 2.3 (stato di sessione duplicato); rimosso dal Task 22.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedBug(updated)
      }
    }
  }, [bugList, currentIndex, isOpen, selectedBug])

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < bugList.length - 1

  const openDrawer = useCallback((bug: CategorizedBug) => {
    setSelectedBug(bug)
    setIsOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
    setSelectedBug(null)
  }, [])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedBug(bugList[currentIndex - 1])
    }
  }, [currentIndex, bugList])

  const goToNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < bugList.length - 1) {
      setSelectedBug(bugList[currentIndex + 1])
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
