import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'

import { getProfileTabFromSlug, getSlugForProfileTab, getViewForPath } from '../src/app/types'
import { PrivacyPolicyContent } from '../src/shared/components/legal/PrivacyPolicyContent'
import { TermsOfServiceContent } from '../src/shared/components/legal/TermsOfServiceContent'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('Google OAuth Verification, Privacy & Terms', () => {
    test('getViewForPath correctly routes legal, connections, and settings URLs to profile / settings view', () => {
        expect(getViewForPath('/settings/privacy')).toBe('profile')
        expect(getViewForPath('/settings/terms')).toBe('profile')
        expect(getViewForPath('/settings/usage')).toBe('profile')
        expect(getViewForPath('/settings/billing')).toBe('profile')
        expect(getViewForPath('/settings/integrations')).toBe('profile')
        expect(getViewForPath('/profile/integrations')).toBe('profile')
        expect(getViewForPath('/settings/connections')).toBe('profile')
        expect(getViewForPath('/connections')).toBe('profile')
        expect(getViewForPath('/connectors')).toBe('profile')
        expect(getViewForPath('/privacy')).toBe('profile')
        expect(getViewForPath('/terms')).toBe('profile')
    })

    test('getProfileTabFromSlug and getSlugForProfileTab resolve connections, billing, and usage correctly', () => {
        expect(getProfileTabFromSlug('connections')).toBe('Connections')
        expect(getProfileTabFromSlug('integrations')).toBe('Connections')
        expect(getProfileTabFromSlug('usage')).toBe('Usage')
        expect(getProfileTabFromSlug('analytics')).toBe('Usage')
        expect(getProfileTabFromSlug('billing')).toBe('Billing')
        expect(getSlugForProfileTab('Connections')).toBe('connections')
        expect(getSlugForProfileTab('Usage')).toBe('usage')
        expect(getSlugForProfileTab('Billing')).toBe('billing')
    })

    test('PrivacyPolicyContent contains all mandatory Google OAuth verification disclosures', () => {
        render(<PrivacyPolicyContent />)

        // App Name and website
        expect(screen.getAllByText(/December/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/https:\/\/trydecember\.com/i).length).toBeGreaterThan(0)

        // Google OAuth & Limited Use compliance statement
        expect(screen.getByText(/Google API Services User Data Policy/i)).toBeDefined()
        expect(screen.getByText(/Limited Use/i)).toBeDefined()

        // Privacy contact email
        expect(screen.getAllByText(/team@trydecember.com/i).length).toBeGreaterThan(0)

        // No model training on private user data
        expect(screen.getByText(/No Model Training:/i)).toBeDefined()
    })

    test('TermsOfServiceContent contains December terms and code ownership terms', () => {
        render(<TermsOfServiceContent />)

        // App Name and website
        expect(screen.getAllByText(/December/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/https:\/\/trydecember\.com/i).length).toBeGreaterThan(0)

        // Ownership clause
        expect(screen.getByText(/Ownership of Code & Intellectual Property/i)).toBeDefined()

        // Support contact email
        expect(screen.getAllByText(/team@trydecember.com/i).length).toBeGreaterThan(0)
    })

    test('ProfileConnectionsSettings renders Connections section without mock MCP servers', async () => {
        const { ProfileConnectionsSettings } =
            await import('../src/features/profile/components/ProfileConnectionsSettings')

        render(
            <ProfileConnectionsSettings
                isGithubConnected={true}
                isVercelConnected={false}
                isSupabaseConnected={false}
                isNotionConnected={false}
                onConnectGithub={() => {}}
                onConnectVercel={() => {}}
                onConnectSupabase={() => {}}
                onConnectNotion={() => {}}
            />
        )

        // Section heading
        expect(screen.getByRole('heading', { name: 'Connections' })).toBeDefined()
        expect(screen.queryByRole('heading', { name: 'MCP Servers' })).toBeNull()

        // Core connections
        expect(screen.getAllByText('GitHub').length).toBeGreaterThan(0)
        expect(screen.getByText('Vercel')).toBeDefined()
        expect(screen.getByText('Supabase')).toBeDefined()
        expect(screen.getAllByText('Notion').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Figma').length).toBeGreaterThan(0)

        // GitHub connected status
        expect(screen.getByText('Connected')).toBeDefined()
    })
})
