import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, mock, afterEach } from 'bun:test'
import React from 'react'

import { WikiReader } from '../src/features/wiki/components/WikiReader'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: Infinity,
            },
        },
    })

describe('WikiReader Component', () => {
    const mockWiki = {
        id: 'wiki-1',
        userId: 'user-1',
        repoFullName: 'testowner/testrepo',
        repoOwner: 'testowner',
        repoName: 'testrepo',
        status: 'COMPLETED' as const,
        pages: [
            {
                id: 'page-1',
                wikiId: 'wiki-1',
                slug: 'overview',
                title: 'Overview',
                content: '# Overview\n\nWelcome to documentation.',
                order: 1,
            },
            {
                id: 'page-2',
                wikiId: 'wiki-1',
                slug: 'architecture',
                title: 'Architecture',
                content: '# Architecture\n\nSystem breakdown.',
                order: 2,
            },
        ],
    }

    test('renders header navigation, back button, and active page content', () => {
        const queryClient = createTestQueryClient()
        const onBackMock = mock()

        render(
            <QueryClientProvider client={queryClient}>
                <WikiReader
                    repoOwner="testowner"
                    repoName="testrepo"
                    onBack={onBackMock}
                    initialWiki={mockWiki}
                />
            </QueryClientProvider>
        )

        expect(screen.getByText(/testrepo — Overview/i)).toBeDefined()
        expect(screen.getByText('main (default)')).toBeDefined()

        const backButton = screen.getByRole('button', { name: /Back/i })
        expect(backButton).toBeDefined()
        fireEvent.click(backButton)
        expect(onBackMock).toHaveBeenCalledTimes(1)
    })

    test('opens options menu and opens Edit Wiki modal when Edit wiki is clicked', () => {
        const queryClient = createTestQueryClient()
        const onBackMock = mock()

        render(
            <QueryClientProvider client={queryClient}>
                <WikiReader
                    repoOwner="testowner"
                    repoName="testrepo"
                    onBack={onBackMock}
                    initialWiki={mockWiki}
                />
            </QueryClientProvider>
        )

        const optionsButton = screen.getByRole('button', { name: /Options/i })
        fireEvent.click(optionsButton)

        expect(screen.getByText('Edit wiki')).toBeDefined()
        expect(screen.getByText('DeepWiki settings')).toBeDefined()

        const editButton = screen.getByText('Edit wiki')
        fireEvent.click(editButton)

        expect(screen.getByText('Edit Wiki Page')).toBeDefined()
    })

    test('opens settings modal when DeepWiki settings is clicked', () => {
        const queryClient = createTestQueryClient()
        const onBackMock = mock()

        render(
            <QueryClientProvider client={queryClient}>
                <WikiReader
                    repoOwner="testowner"
                    repoName="testrepo"
                    onBack={onBackMock}
                    initialWiki={mockWiki}
                />
            </QueryClientProvider>
        )

        const optionsButton = screen.getByRole('button', { name: /Options/i })
        fireEvent.click(optionsButton)

        const settingsButton = screen.getByText('DeepWiki settings')
        fireEvent.click(settingsButton)

        expect(screen.getByText('DeepWiki Settings')).toBeDefined()
    })
})
