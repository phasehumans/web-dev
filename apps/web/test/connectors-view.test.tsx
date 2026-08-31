import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { expect, test, describe, afterEach, beforeEach, spyOn } from 'bun:test'
import React from 'react'

import { getViewForPath } from '../src/app/types'
import { ConnectorsPage } from '../src/features/connectors/components/ConnectorsPage'
import { profileAPI } from '../src/features/profile/api/profile'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

describe('Connectors View & Route Resolution', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })
    })

    afterEach(() => {
        cleanup()
    })

    test('getViewForPath correctly maps /connectors and legacy integration settings to connectors view', () => {
        expect(getViewForPath('/connectors')).toBe('connectors')
        expect(getViewForPath('/connectors/github')).toBe('connectors')
        expect(getViewForPath('/settings/integrations')).toBe('connectors')
        expect(getViewForPath('/profile/integrations')).toBe('connectors')
        expect(getViewForPath('/settings/mcp-server')).toBe('connectors')
    })

    test('ConnectorsPage renders unified connectors (GitHub, Vercel, Supabase, Notion, Figma)', async () => {
        spyOn(profileAPI, 'getProfile').mockImplementation(async () => ({
            id: 'test-user-123',
            name: 'Test User',
            username: 'testuser',
            email: 'test@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            emailVerified: true,
            receiveNotification: true,
            googleId: null,
            githubConnected: true,
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <ConnectorsPage />
            </QueryClientProvider>
        )

        // Header & description
        expect(screen.getByRole('heading', { name: 'Connectors' })).toBeDefined()
        expect(
            screen.getByText(
                /Connect external services, databases, deployment platforms, and design systems/i
            )
        ).toBeDefined()

        // Connectors
        expect(screen.getByText('GitHub')).toBeDefined()
        expect(screen.getByText('Vercel')).toBeDefined()
        expect(screen.getByText('Supabase')).toBeDefined()
        expect(screen.getByText('Notion')).toBeDefined()
        expect(screen.getByText('Figma')).toBeDefined()

        // GitHub connected badge
        await waitFor(() => {
            expect(screen.getByText('Connected')).toBeDefined()
        })
    })
})
