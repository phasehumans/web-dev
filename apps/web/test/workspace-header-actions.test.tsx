import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, mock, afterEach, beforeEach } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { WorkspaceHeaderActions } from '../src/features/preview/components/WorkspaceHeaderActions'
import { WorkspaceHeaderViewTabs } from '../src/features/preview/components/WorkspaceHeaderViewTabs'
import { sessionAPI } from '../src/features/sessions/api/session'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup, waitFor } = await import('@testing-library/react')

describe('Ticket #401: Workspace Header Actions, PR Badge, and Feedback Integration', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        })
    })

    afterEach(() => {
        cleanup()
    })

    test('PR badge is hidden when session has no pull request metadata', async () => {
        sessionAPI.getSession = mock(async () => ({
            id: 'session-no-pr',
            title: 'Project Without PR',
            type: 'WEB' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: null,
            projectName: null,
            lastMessage: 'hello',
            prNumber: null,
            prState: null,
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WorkspaceHeaderActions
                        projectId="session-no-pr"
                        projectName="Project Without PR"
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Wait for query to settle
        await waitFor(() => {
            const prBadge = screen.queryByTitle(/Open Pull Request/i)
            expect(prBadge).toBeNull()
        })
    })

    test('PR badge is visible when session has genuine PR metadata', async () => {
        sessionAPI.getSession = mock(async () => ({
            id: 'session-with-pr',
            title: 'feature-awesome',
            type: 'WEB' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: 'proj-1',
            projectName: 'feature-awesome',
            lastMessage: 'hello',
            prNumber: 401,
            prState: 'open' as const,
            githubRepoUrl: 'https://github.com/phasehumans/december',
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WorkspaceHeaderActions
                        projectId="session-with-pr"
                        projectName="feature-awesome"
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        await waitFor(() => {
            const prBadge = screen.getByTitle(/Open Pull Request #401/i)
            expect(prBadge).not.toBeNull()
            expect(screen.getByText('#401')).not.toBeNull()
        })
    })

    test('WorkspaceHeaderViewTabs does not show hardcoded PR #97 when no PRs exist', () => {
        const setActiveTab = mock()
        const onCloseTab = mock()
        const onAddTab = mock()
        const onReorderTabs = mock()

        render(
            <WorkspaceHeaderViewTabs
                openTabs={['changes', 'desktop']}
                activeTab="changes"
                setActiveTab={setActiveTab}
                onCloseTab={onCloseTab}
                onAddTab={onAddTab}
                onReorderTabs={onReorderTabs}
            />
        )

        // There should not be any tab or text named "PR #97"
        expect(screen.queryByText('PR #97')).toBeNull()

        // Open + add tab dropdown
        const buttons = screen.getAllByRole('button')
        const plusButton =
            buttons.find((btn) => btn.innerHTML.includes('lucide-plus')) ||
            buttons[buttons.length - 1]
        fireEvent.click(plusButton)

        // Pull requests submenu trigger should not be present when no PRs exist
        expect(screen.queryByText('Pull requests')).toBeNull()
    })

    test('WorkspaceHeaderViewTabs shows PR tab when available PR is provided', () => {
        const setActiveTab = mock()
        const onCloseTab = mock()
        const onAddTab = mock()
        const onReorderTabs = mock()

        const realPr = {
            id: 'pull_requests' as const,
            label: 'PR #401',
            icon: <span>PR</span>,
        }

        render(
            <WorkspaceHeaderViewTabs
                openTabs={['changes', 'pull_requests']}
                activeTab="pull_requests"
                setActiveTab={setActiveTab}
                onCloseTab={onCloseTab}
                onAddTab={onAddTab}
                onReorderTabs={onReorderTabs}
                availablePrs={[realPr]}
            />
        )

        expect(screen.getByText('PR #401')).not.toBeNull()
    })

    test('Session insights button opens the insights modal in WorkspaceHeaderActions', async () => {
        sessionAPI.getSession = mock(async () => ({
            id: 'session-insights-test',
            title: 'Test App',
            type: 'WEB' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: 'proj-1',
            projectName: 'Test App',
            lastMessage: 'hello',
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WorkspaceHeaderActions
                        projectId="session-insights-test"
                        projectName="Test App"
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Open 3 dots menu
        const moreButtons = screen.getAllByRole('button')
        const threeDotsButton =
            moreButtons.find(
                (btn) =>
                    btn.getAttribute('aria-label')?.includes('More') ||
                    btn.innerHTML.includes('lucide-more-horizontal')
            ) || moreButtons[moreButtons.length - 1]
        fireEvent.click(threeDotsButton)

        const insightsButton = await screen.findByRole('button', { name: /Session insights/i })
        expect(insightsButton).not.toBeNull()
        fireEvent.click(insightsButton)

        // SessionInsightsModal should open with title "Session usage & tokens"
        await waitFor(() => {
            expect(screen.getByText('Session usage & tokens')).not.toBeNull()
        })
    })
})
