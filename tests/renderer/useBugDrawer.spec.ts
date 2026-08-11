// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CategorizedBug } from '@shared/types'
import { useBugDrawer } from '@renderer/hooks/useBugDrawer'

function makeBug(id: number): CategorizedBug {
  return {
    id,
    title: `Bug ${id}`,
    state: 'Active',
    assignee: 'User',
    areaPath: 'Area',
    description: 'desc',
    priority: 1,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01',
    tags: [],
    macroCategory: 'Cat',
    technicalLayer: 'Sub',
    categoryReason: 'reason',
    categorizedAt: '2026-01-01'
  }
}

describe('useBugDrawer', () => {
  const bugs = [makeBug(1), makeBug(2), makeBug(3)]

  it('starts closed with no selected bug', () => {
    const { result } = renderHook(() => useBugDrawer(bugs))
    expect(result.current.isOpen).toBe(false)
    expect(result.current.selectedBug).toBeNull()
    expect(result.current.hasPrev).toBe(false)
    expect(result.current.hasNext).toBe(false)
  })

  it('opens with the correct bug', () => {
    const { result } = renderHook(() => useBugDrawer(bugs))
    act(() => result.current.openDrawer(bugs[1]))
    expect(result.current.isOpen).toBe(true)
    expect(result.current.selectedBug?.id).toBe(2)
  })

  it('closes correctly', () => {
    const { result } = renderHook(() => useBugDrawer(bugs))
    act(() => result.current.openDrawer(bugs[1]))
    act(() => result.current.closeDrawer())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.selectedBug).toBeNull()
  })

  it('navigates to next bug', () => {
    const { result } = renderHook(() => useBugDrawer(bugs))
    act(() => result.current.openDrawer(bugs[0]))
    act(() => result.current.goToNext())
    expect(result.current.selectedBug?.id).toBe(2)
  })

  it('navigates to previous bug', () => {
    const { result } = renderHook(() => useBugDrawer(bugs))
    act(() => result.current.openDrawer(bugs[2]))
    act(() => result.current.goToPrev())
    expect(result.current.selectedBug?.id).toBe(2)
  })

  it('hasPrev is false at index 0', () => {
    const { result } = renderHook(() => useBugDrawer(bugs))
    act(() => result.current.openDrawer(bugs[0]))
    expect(result.current.hasPrev).toBe(false)
    expect(result.current.hasNext).toBe(true)
  })

  it('hasNext is false at last index', () => {
    const { result } = renderHook(() => useBugDrawer(bugs))
    act(() => result.current.openDrawer(bugs[2]))
    expect(result.current.hasPrev).toBe(true)
    expect(result.current.hasNext).toBe(false)
  })

  it('handles single-bug list (both nav disabled)', () => {
    const singleBug = [makeBug(99)]
    const { result } = renderHook(() => useBugDrawer(singleBug))
    act(() => result.current.openDrawer(singleBug[0]))
    expect(result.current.hasPrev).toBe(false)
    expect(result.current.hasNext).toBe(false)
  })

  it('closes when selected bug is removed from list', () => {
    let bugList = [makeBug(1), makeBug(2), makeBug(3)]
    const { result, rerender } = renderHook(({ list }) => useBugDrawer(list), {
      initialProps: { list: bugList }
    })

    act(() => result.current.openDrawer(bugList[1]))
    expect(result.current.isOpen).toBe(true)

    // Remove bug 2 from list
    bugList = [makeBug(1), makeBug(3)]
    rerender({ list: bugList })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.selectedBug).toBeNull()
  })

  it('keeps drawer open if selected bug remains in list after filter change', () => {
    let bugList = [makeBug(1), makeBug(2), makeBug(3)]
    const { result, rerender } = renderHook(({ list }) => useBugDrawer(list), {
      initialProps: { list: bugList }
    })

    act(() => result.current.openDrawer(bugList[1]))
    expect(result.current.isOpen).toBe(true)

    // Filter removes bug 3 but keeps bug 2
    bugList = [makeBug(1), makeBug(2)]
    rerender({ list: bugList })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.selectedBug?.id).toBe(2)
  })
})
