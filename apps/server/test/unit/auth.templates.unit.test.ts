import { describe, it, expect } from 'bun:test'

import { renderBaseEmail } from '../../src/modules/auth/templates/base.template'
import { renderOtpEmail } from '../../src/modules/auth/templates/otp.template'
import { renderWelcomeEmail } from '../../src/modules/auth/templates/welcome.template'

describe('Auth Email Templates - Unit Tests', () => {
    describe('renderBaseEmail', () => {
        it('should render base email wrapper with preview text, content and footer', () => {
            const html = renderBaseEmail({
                previewText: 'Preview text for inbox',
                content: '<p>Main email body</p>',
                supportEmail: 'support@example.com',
                webUrl: 'https://trydecember.com',
            })

            expect(html).toContain('Preview text for inbox')
            expect(html).toContain('<p>Main email body</p>')
            expect(html).toContain('mailto:support@example.com')
            expect(html).toContain('<!DOCTYPE html>')
            expect(html).toContain('prefers-color-scheme: dark')
        })
    })

    describe('renderOtpEmail', () => {
        it('should render verification OTP email correctly with html and plain text', () => {
            const { subject, html, text } = renderOtpEmail({
                otp: '849201',
                type: 'signup',
                supportEmail: 'support@december.com',
                webUrl: 'https://trydecember.com',
            })

            expect(subject).toBe('Your December verification code: 849201')
            expect(html).toContain('Verify your email')
            expect(html).toContain('849201')
            expect(html).toContain('10 minutes')

            expect(text).toContain('Verify your email for December')
            expect(text).toContain('849201')
            expect(text).toContain('10 minutes')
            expect(text).toContain('support@december.com')
        })

        it('should render password reset OTP email with appropriate security notice and subject', () => {
            const { subject, html, text } = renderOtpEmail({
                otp: '123456',
                type: 'password_reset',
                supportEmail: 'support@december.com',
                webUrl: 'https://trydecember.com',
            })

            expect(subject).toBe('Reset your December password: 123456')
            expect(html).toContain('Reset your password')
            expect(html).toContain('123456')
            expect(html).toContain('password reset')
            expect(html).toContain('password will remain unchanged')

            expect(text).toContain('Reset your December password')
            expect(text).toContain('123456')
            expect(text).toContain('password will remain unchanged')
        })
    })

    describe('renderWelcomeEmail', () => {
        it('should render welcome email with user name, CLI README messaging, and footer links', () => {
            const { subject, html, text } = renderWelcomeEmail({
                name: 'Alex Developer',
                supportEmail: 'support@december.com',
                webUrl: 'https://trydecember.com',
            })

            expect(subject).toBe('Welcome to December')
            expect(html).toContain('Hi Alex Developer')
            expect(html).toContain('a coding agent that lives in your terminal')
            expect(html).toContain('Writes code &amp; runs commands:')
            expect(html).toContain('Cloud Handoff:')
            expect(html).toContain('/handoff')
            expect(html).toContain('Bring your own AI:')
            expect(html).toContain('https://www.npmjs.com/package/@trydecember/cli')
            expect(html).toContain('npm install -g @trydecember/cli')
            expect(html).toContain('Start building now')
            expect(html).toContain('https://trydecember.com')
            expect(html).toContain('https://github.com/phasehumans/december')
            expect(html).toContain('Chaitanya Sonawane')

            expect(text).toContain('Hi Alex Developer')
            expect(text).toContain('a coding agent that lives in your terminal')
            expect(text).toContain('Writes code & runs commands:')
            expect(text).toContain('Cloud Handoff:')
            expect(text).toContain('/handoff')
            expect(text).toContain('Bring your own AI:')
            expect(text).toContain('https://www.npmjs.com/package/@trydecember/cli')
            expect(text).toContain('npm install -g @trydecember/cli')
            expect(text).toContain('Start building now: https://trydecember.com')
            expect(text).toContain('GitHub: https://github.com/phasehumans/december')
        })

        it('should default to "there" when name is not provided or empty', () => {
            const { html, text } = renderWelcomeEmail({
                name: '',
                supportEmail: 'support@december.com',
                webUrl: 'https://trydecember.com',
            })

            expect(html).toContain('Hi there')
            expect(text).toContain('Hi there')
        })
    })
})
