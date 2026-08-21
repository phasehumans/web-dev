import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { getViewForPath } from '../src/app/types'
import { DocsView } from '../src/features/docs/components/DocsView'
import { PrivacyPolicyContent } from '../src/shared/components/legal/PrivacyPolicyContent'
import { TermsOfServiceContent } from '../src/shared/components/legal/TermsOfServiceContent'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, cleanup, fireEvent } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('Google OAuth Verification, Docs, Privacy & Terms', () => {
    test('getViewForPath correctly routes legal and docs URLs to docs view', () => {
        expect(getViewForPath('/docs')).toBe('docs')
        expect(getViewForPath('/docs/')).toBe('docs')
        expect(getViewForPath('/docs/privacy')).toBe('docs')
        expect(getViewForPath('/docs/terms')).toBe('docs')
        expect(getViewForPath('/privacy')).toBe('docs')
        expect(getViewForPath('/terms')).toBe('docs')
        expect(getViewForPath('/docs/quickstart')).toBe('docs')
        expect(getViewForPath('/docs/architecture')).toBe('docs')
        expect(getViewForPath('/docs/cli')).toBe('docs')
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

    test('DocsView renders Privacy Policy tab directly when initial route is /docs/privacy', () => {
        render(
            <MemoryRouter initialEntries={['/docs/privacy']}>
                <DocsView />
            </MemoryRouter>
        )

        expect(screen.getByText(/Google OAuth & API Services User Data Policy/i)).toBeDefined()
    })

    test('DocsView renders Terms of Service tab directly when initial route is /docs/terms', () => {
        render(
            <MemoryRouter initialEntries={['/docs/terms']}>
                <DocsView />
            </MemoryRouter>
        )

        expect(screen.getByText(/Acceptance of Terms/i)).toBeDefined()
    })

    test('DocsView allows switching between Introduction, Privacy, and Terms tabs', () => {
        render(
            <MemoryRouter initialEntries={['/docs']}>
                <DocsView />
            </MemoryRouter>
        )

        expect(screen.getByText(/About December Agent/i)).toBeDefined()

        const privacyButtons = screen.getAllByRole('button', { name: /Privacy Policy/i })
        fireEvent.click(privacyButtons[0])
        expect(screen.getByText(/Google OAuth & API Services User Data Policy/i)).toBeDefined()

        const termsButtons = screen.getAllByRole('button', { name: /Terms of Service/i })
        fireEvent.click(termsButtons[0])
        expect(screen.getByText(/Acceptance of Terms/i)).toBeDefined()
    })
})
