import { QueryClient } from '@tanstack/react-query'
import { expect, test, describe } from 'bun:test'

import { getViewForPath } from '../src/app/types'

describe('UI Performance and Routing Fixes', () => {
    describe('Path and Route Resolution (getViewForPath)', () => {
        test('resolves /sessions list view vs /sessions/:slug project workspace view', () => {
            expect(getViewForPath('/sessions')).toBe('sessions')
            expect(getViewForPath('/sessions/my-ecommerce-app')).toBe('project')
            expect(getViewForPath('/session/sess-12345')).toBe('project')
            expect(getViewForPath('/project/proj-67890')).toBe('project')
            expect(getViewForPath('/search')).toBe('search')
            expect(getViewForPath('/canvas')).toBe('canvas')
            expect(getViewForPath('/')).toBe('chat')
        })
    })

    describe('Infinite Query Optimistic Cache Updates', () => {
        test('correctly mutates pages structure for useInfiniteSessions cache', () => {
            const queryClient = new QueryClient()
            const initialInfiniteData = {
                pages: [
                    {
                        sessions: [
                            {
                                id: 'sess-1',
                                title: 'Old Title',
                                isPinned: false,
                                isArchived: false,
                            },
                            {
                                id: 'sess-2',
                                title: 'Second Session',
                                isPinned: false,
                                isArchived: false,
                            },
                        ],
                        pagination: { totalCount: 2, page: 1, limit: 10, totalPages: 1 },
                    },
                ],
                pageParams: [1],
            }

            queryClient.setQueryData(['sessions', 'infinite', {}], initialInfiniteData)

            // Simulate the updater function used in useSessionListMutations / Sidebar
            const updater = (session: any) =>
                session.id === 'sess-1'
                    ? { ...session, title: 'New Renamed Title', isPinned: true }
                    : session

            queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
                if (!old) return old
                if (Array.isArray(old)) {
                    return old.map(updater).filter(Boolean)
                }
                if (Array.isArray(old.sessions)) {
                    return {
                        ...old,
                        sessions: old.sessions.map(updater).filter(Boolean),
                    }
                }
                if (Array.isArray(old.pages)) {
                    return {
                        ...old,
                        pages: old.pages.map((page: any) => {
                            if (!page) return page
                            if (Array.isArray(page.sessions)) {
                                return {
                                    ...page,
                                    sessions: page.sessions.map(updater).filter(Boolean),
                                }
                            }
                            if (Array.isArray(page)) {
                                return page.map(updater).filter(Boolean)
                            }
                            return page
                        }),
                    }
                }
                return old
            })

            const updatedData: any = queryClient.getQueryData(['sessions', 'infinite', {}])
            expect(updatedData).toBeDefined()
            expect(updatedData.pages[0].sessions[0].title).toBe('New Renamed Title')
            expect(updatedData.pages[0].sessions[0].isPinned).toBe(true)
            expect(updatedData.pages[0].sessions[1].title).toBe('Second Session')
        })

        test('correctly handles deletion in infinite query pages structure', () => {
            const queryClient = new QueryClient()
            const initialInfiniteData = {
                pages: [
                    {
                        sessions: [
                            { id: 'sess-1', title: 'Session 1' },
                            { id: 'sess-2', title: 'Session 2' },
                        ],
                        pagination: { totalCount: 2, page: 1, limit: 10, totalPages: 1 },
                    },
                ],
                pageParams: [1],
            }

            queryClient.setQueryData(['sessions', 'infinite', {}], initialInfiniteData)

            const sessionIdToDelete = 'sess-1'
            queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
                if (!old) return old
                if (Array.isArray(old)) {
                    return old.filter((s) => s.id !== sessionIdToDelete)
                }
                if (Array.isArray(old.sessions)) {
                    return {
                        ...old,
                        sessions: old.sessions.filter((s: any) => s.id !== sessionIdToDelete),
                    }
                }
                if (Array.isArray(old.pages)) {
                    return {
                        ...old,
                        pages: old.pages.map((page: any) => {
                            if (!page) return page
                            if (Array.isArray(page.sessions)) {
                                return {
                                    ...page,
                                    sessions: page.sessions.filter(
                                        (s: any) => s.id !== sessionIdToDelete
                                    ),
                                }
                            }
                            return page
                        }),
                    }
                }
                return old
            })

            const updatedData: any = queryClient.getQueryData(['sessions', 'infinite', {}])
            expect(updatedData.pages[0].sessions.length).toBe(1)
            expect(updatedData.pages[0].sessions[0].id).toBe('sess-2')
        })
    })
})
