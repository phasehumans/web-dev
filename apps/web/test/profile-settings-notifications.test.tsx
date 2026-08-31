import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach, beforeEach, mock, spyOn } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { profileAPI } from '../src/features/profile/api/profile'
import { ProfileGeneralSettings } from '../src/features/profile/components/ProfileGeneralSettings'
import { ProfileSettingsContent } from '../src/features/profile/components/ProfileSettingsContent'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, cleanup, fireEvent } = await import('@testing-library/react')

describe('Profile Settings Notifications Tab Placement', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })
        spyOn(profileAPI, 'getRules').mockImplementation(async () => ({ rules: '' }))
    })

    afterEach(() => {
        mock.restore()
        cleanup()
    })

    test('ProfileSettingsContent (Account tab) renders Notifications section with toggles', () => {
        const handleNotificationToggle = mock(() => {})

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ProfileSettingsContent
                        profile={{
                            id: 'test-user',
                            name: 'Test User',
                            email: 'test@example.com',
                            username: 'testuser',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            emailVerified: true,
                            receiveNotification: true,
                            googleId: null,
                            githubConnected: false,
                            hasPassword: true,
                        }}
                        resolvedName="Test User"
                        hasProfile={true}
                        isGithubConnected={false}
                        emailNotifications={true}
                        productUpdates={false}
                        securityAlerts={true}
                        isNotificationPending={false}
                        onOpenNameModal={() => {}}
                        onOpenUsernameModal={() => {}}
                        onOpenPasswordModal={() => {}}
                        onNotificationToggle={handleNotificationToggle}
                        onConnectGithub={() => {}}
                        onSignOut={() => {}}
                        onOpenSignOutAllSessionsModal={() => {}}
                        onOpenDeleteAccountModal={() => {}}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Headings
        expect(screen.getByRole('heading', { name: 'Account' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Notifications' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'System' })).toBeDefined()

        // Notification options
        expect(screen.getByText('Project activity')).toBeDefined()
        expect(
            screen.getByText('Get notification updates when someone interacts with your projects')
        ).toBeDefined()
        expect(screen.getByText('Product updates')).toBeDefined()
        expect(
            screen.getByText('Get notification updates about new features and improvements')
        ).toBeDefined()
        expect(screen.getByText('Security alerts')).toBeDefined()
        expect(
            screen.getByText('Get notification updates for important security notices')
        ).toBeDefined()

        // Toggle switches
        const switches = screen.getAllByRole('switch')
        expect(switches.length).toBe(3)

        // Click Project activity switch (first switch)
        fireEvent.click(switches[0])
        expect(handleNotificationToggle).toHaveBeenCalledWith('notifyProjectActivity', false)

        // Click Product updates switch (second switch)
        fireEvent.click(switches[1])
        expect(handleNotificationToggle).toHaveBeenCalledWith('notifyProductUpdates', true)
    })

    test('ProfileGeneralSettings (Preferences tab) does NOT render Notifications section', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ProfileGeneralSettings
                        chatSuggestions={true}
                        generationSound="FIRST_GENERATION"
                        onChatSuggestionsToggle={() => {}}
                        onGenerationSoundChange={() => {}}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Preferences and Custom Rules headings should exist
        expect(screen.getByRole('heading', { name: 'Preferences' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Custom Rules' })).toBeDefined()

        // Notifications section should NOT exist in Preferences tab
        expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull()
        expect(screen.queryByText('Project activity')).toBeNull()
        expect(screen.queryByText('Product updates')).toBeNull()
        expect(screen.queryByText('Security alerts')).toBeNull()
    })
})
