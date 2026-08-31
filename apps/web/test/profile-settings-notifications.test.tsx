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

        // Account rows (password should not be present)
        expect(screen.getByText('Full Name')).toBeDefined()
        expect(screen.getByText('Username')).toBeDefined()
        expect(screen.getByText('Email')).toBeDefined()
        expect(screen.queryByText('Password')).toBeNull()

        // Notification options (Project activity should not be present)
        expect(screen.queryByText('Project activity')).toBeNull()
        expect(
            screen.queryByText('Get notification updates when someone interacts with your projects')
        ).toBeNull()
        expect(screen.getByText('Product updates')).toBeDefined()
        expect(
            screen.getByText('Get notification updates about new features and improvements')
        ).toBeDefined()
        expect(screen.getByText('Security alerts')).toBeDefined()
        expect(
            screen.getByText('Get notification updates for important security notices')
        ).toBeDefined()

        // Toggle switches (2 remaining: Product updates, Security alerts)
        const switches = screen.getAllByRole('switch')
        expect(switches.length).toBe(2)

        // Click Product updates switch (first switch)
        fireEvent.click(switches[0])
        expect(handleNotificationToggle).toHaveBeenCalledWith('notifyProductUpdates', true)

        // Click Security alerts switch (second switch)
        fireEvent.click(switches[1])
        expect(handleNotificationToggle).toHaveBeenCalledWith('notifySecurityAlerts', false)
    })

    test('ProfileGeneralSettings (Preferences tab) does NOT render Notifications section or Chat suggestions', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ProfileGeneralSettings
                        generationSound="FIRST_GENERATION"
                        onGenerationSoundChange={() => {}}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Preferences and Custom Rules headings should exist
        expect(screen.getByRole('heading', { name: 'Preferences' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Custom Rules' })).toBeDefined()

        // Completion sound should exist, Generation complete sound should not
        expect(screen.getByText('Completion sound')).toBeDefined()
        expect(screen.queryByText('Generation complete sound')).toBeNull()

        // Chat suggestions should NOT exist
        expect(screen.queryByText('Chat suggestions')).toBeNull()
        expect(
            screen.queryByText(
                'Show helpful suggestions in the chat interface to enhance your experience.'
            )
        ).toBeNull()

        // Notifications section should NOT exist in Preferences tab
        expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull()
        expect(screen.queryByText('Project activity')).toBeNull()
        expect(screen.queryByText('Product updates')).toBeNull()
        expect(screen.queryByText('Security alerts')).toBeNull()
    })
})
