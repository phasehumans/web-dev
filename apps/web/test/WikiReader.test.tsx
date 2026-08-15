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

    test('renders sidebar page index and active page content', () => {
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

        expect(screen.getByText('testowner / testrepo')).toBeDefined()
        expect(screen.getByText('Pages (2)')).toBeDefined()
        expect(screen.getByRole('button', { name: /Architecture/i })).toBeDefined()

        // Default active page is Overview
        expect(screen.getAllByRole('heading', { name: 'Overview' }).length).toBeGreaterThan(0)
        expect(screen.getByText('Welcome to documentation.')).toBeDefined()

        // Switch to Architecture page
        const archButton = screen.getByRole('button', { name: /Architecture/i })
        fireEvent.click(archButton)

        const archHeadings = screen.getAllByRole('heading', { name: 'Architecture' })
        expect(archHeadings.length).toBeGreaterThan(0)
        expect(screen.getByText('System breakdown.')).toBeDefined()
    })

    test('opens Add Page modal when Add Page button is clicked', () => {
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

        const addButtons = screen.getAllByRole('button', { name: /Add Page/i })
        fireEvent.click(addButtons[0])

        expect(screen.getAllByText(/Add Wiki Page/i).length).toBeGreaterThan(0)
        expect(screen.getByPlaceholderText('Page title (e.g. API Guidelines)')).toBeDefined()
    })

    test('opens Edit Page modal when Edit Page button is clicked', () => {
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

        const editButton = screen.getByRole('button', { name: /Edit Page/i })
        fireEvent.click(editButton)

        expect(screen.getByText('Edit Wiki Page')).toBeDefined()
        const titleInput = screen.getByDisplayValue('Overview')
        expect(titleInput).toBeDefined()
    })

    test('opens Delete Page confirmation dialog when Delete button is clicked', () => {
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

        const deleteButton = screen.getByRole('button', { name: /Delete/i })
        fireEvent.click(deleteButton)

        expect(screen.getByText('Delete Page')).toBeDefined()
        expect(screen.getByText(/Are you sure you want to delete/i)).toBeDefined()
    })
})
