import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { useAppStore } from '../src/app/store'
import { HomeHero } from '../src/features/home/components/HomeHero'

import type { BackendSession } from '../src/features/sessions/api/session'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, cleanup, fireEvent } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
    useAppStore.setState({
        isAuthenticated: false,
    })
})

describe('HomeHero Recent Sessions vs Get Started', () => {
    test('renders Get Started section when user is not authenticated or has no sessions', () => {
        useAppStore.setState({ isAuthenticated: false })

        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })

        const { getByText, queryByText, getAllByText } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <HomeHero onPromptSubmit={() => {}} onOpenAuth={() => {}} />
                </MemoryRouter>
            </QueryClientProvider>
        )

        expect(getByText('Get Started')).not.toBeNull()
        expect(getByText('Connect GitHub')).not.toBeNull()
        expect(getAllByText('Star on GitHub').length).toBeGreaterThan(0)
        expect(getByText('Give feedback')).not.toBeNull()
        expect(queryByText('Recent Sessions')).toBeNull()
    })

    test('renders Recent Sessions section with top 3 sessions when authenticated and sessions exist', () => {
        useAppStore.setState({ isAuthenticated: true })

        const mockSessions: BackendSession[] = [
            {
                id: 'sess-12345678',
                title: 'E-commerce Storefront',
                type: 'WEB',
                createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
                updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                projectId: 'proj-1',
                projectName: 'Storefront',
                lastMessage: 'Added payment checkout flow with Stripe',
                tags: ['ecommerce', 'stripe'],
                prNumber: 42,
                prState: 'open',
            },
            {
                id: 'sess-23456789',
                title: 'CLI Tool Integration',
                type: 'CLI',
                createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                projectId: 'proj-2',
                projectName: 'CLI Tool',
                lastMessage: 'Implemented terminal command parser',
                tags: ['cli'],
                prNumber: null,
            },
            {
                id: 'sess-34567890',
                title: 'Search Indexer',
                type: 'SEARCH',
                createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
                updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                projectId: 'proj-3',
                projectName: 'Indexer',
                lastMessage: 'Optimized vector similarity search',
                tags: ['search'],
                prNumber: null,
            },
            {
                id: 'sess-45678901',
                title: 'Older Session Not In Top 3',
                type: 'WEB',
                createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
                updatedAt: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
                projectId: 'proj-4',
                projectName: 'Old Project',
                lastMessage: 'Should not appear in top 3',
            },
        ]

        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })

        queryClient.setQueryData(['sessions', undefined], {
            sessions: mockSessions,
            pagination: { total: 4, page: 1, limit: 50, totalPages: 1 },
        })

        let openedProjectId = ''
        const handleOpenProject = (id: string) => {
            openedProjectId = id
        }

        const { getByText, queryByText, getAllByText } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <HomeHero
                        onPromptSubmit={() => {}}
                        onOpenAuth={() => {}}
                        onOpenProject={handleOpenProject}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Verify Recent Sessions header exists and Get Started is replaced
        expect(getByText('Recent Sessions')).not.toBeNull()
        expect(queryByText('Get Started')).toBeNull()

        // Verify top 3 session titles are rendered
        expect(getByText('E-commerce Storefront')).not.toBeNull()
        expect(getByText('CLI Tool Integration')).not.toBeNull()
        expect(getByText('Search Indexer')).not.toBeNull()
        expect(queryByText('Older Session Not In Top 3')).toBeNull()

        // Verify metadata (message snippet, etc.)
        expect(getByText('Added payment checkout flow with Stripe')).not.toBeNull()
        expect(getByText('Implemented terminal command parser')).not.toBeNull()
        expect(getByText('Optimized vector similarity search')).not.toBeNull()

        // Test clicking open session card
        const sessionCard = getByText('E-commerce Storefront').closest('.cursor-pointer')
        expect(sessionCard).not.toBeNull()
        if (sessionCard) fireEvent.click(sessionCard)
        expect(openedProjectId).toBe('sess-12345678')
    })
})
