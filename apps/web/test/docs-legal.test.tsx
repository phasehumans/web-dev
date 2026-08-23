import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'

import { getViewForPath } from '../src/app/types'
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
    test('getViewForPath correctly routes legal URLs to profile / settings view', () => {
        expect(getViewForPath('/settings/privacy')).toBe('profile')
        expect(getViewForPath('/settings/terms')).toBe('profile')
        expect(getViewForPath('/privacy')).toBe('profile')
        expect(getViewForPath('/terms')).toBe('profile')
    })

    test('PrivacyPolicyContent contains all mandatory Google OAuth verification disclosures', () => {
        render(<PrivacyPolicyContent />)

        // App Name and website
        expect(screen.getAllByText(/December Agent/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/https:\/\/trydecember\.com/i).length).toBeGreaterThan(0)

        // Google OAuth & Limited Use compliance statement
        expect(screen.getByText(/Google API Services User Data Policy/i)).toBeDefined()
        expect(screen.getByText(/Limited Use/i)).toBeDefined()

        // Privacy contact email
        expect(screen.getAllByText(/privacy@trydecember.com/i).length).toBeGreaterThan(0)

        // No model training on private user data
        expect(screen.getByText(/No Model Training:/i)).toBeDefined()
    })

    test('TermsOfServiceContent contains December Agent terms and code ownership terms', () => {
        render(<TermsOfServiceContent />)

        // App Name and website
        expect(screen.getAllByText(/December Agent/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/https:\/\/trydecember\.com/i).length).toBeGreaterThan(0)

        // Ownership clause
        expect(screen.getByText(/Ownership of Code & Intellectual Property/i)).toBeDefined()

        // Support contact email
        expect(screen.getAllByText(/support@trydecember.com/i).length).toBeGreaterThan(0)
    })
})
