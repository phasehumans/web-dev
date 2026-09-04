import { describe, it, expect } from 'bun:test'

import {
    formatSubscriptionDisplayName,
    formatSubscriptionPlan,
    formatSubscriptionToast,
    formatSubscriptionCard,
} from '../src/auth/subscriptions/formatters'

describe('Subscription Formatters (Unit)', () => {
    describe('formatSubscriptionDisplayName', () => {
        it('formats provider names into clean brand display names', () => {
            expect(formatSubscriptionDisplayName('claude')).toBe('Anthropic Claude')
            expect(formatSubscriptionDisplayName('anthropic')).toBe('Anthropic Claude')
            expect(formatSubscriptionDisplayName('copilot')).toBe('GitHub Copilot')
            expect(formatSubscriptionDisplayName('github')).toBe('GitHub Copilot')
            expect(formatSubscriptionDisplayName('codex')).toBe('OpenAI ChatGPT')
            expect(formatSubscriptionDisplayName('chatgpt')).toBe('OpenAI ChatGPT')
            expect(formatSubscriptionDisplayName('openai')).toBe('OpenAI ChatGPT')
            expect(formatSubscriptionDisplayName('gemini')).toBe('Google Gemini')
            expect(formatSubscriptionDisplayName('google')).toBe('Google Gemini')
            expect(formatSubscriptionDisplayName('antigravity')).toBe('Google Gemini')
        })
    })

    describe('formatSubscriptionPlan', () => {
        it('formats Claude plans correctly', () => {
            expect(
                formatSubscriptionPlan({ provider: 'claude', subscriptionType: 'claude_pro' })
            ).toBe('Claude Pro')
            expect(
                formatSubscriptionPlan({ provider: 'claude', subscriptionType: 'claude_team' })
            ).toBe('Claude Team')
            expect(
                formatSubscriptionPlan({
                    provider: 'claude',
                    subscriptionType: 'claude_enterprise',
                })
            ).toBe('Claude Enterprise')
            expect(formatSubscriptionPlan({ provider: 'claude' })).toBe('Claude Pro')
        })

        it('formats ChatGPT plans correctly', () => {
            expect(
                formatSubscriptionPlan({ provider: 'codex', subscriptionType: 'chatgpt_plus' })
            ).toBe('ChatGPT Plus')
            expect(
                formatSubscriptionPlan({ provider: 'codex', subscriptionType: 'chatgpt_pro' })
            ).toBe('ChatGPT Pro')
            expect(
                formatSubscriptionPlan({ provider: 'codex', subscriptionType: 'chatgpt_team' })
            ).toBe('ChatGPT Team')
            expect(formatSubscriptionPlan({ provider: 'chatgpt' })).toBe('ChatGPT Plus')
        })

        it('formats Copilot plans correctly', () => {
            expect(
                formatSubscriptionPlan({ provider: 'copilot', subscriptionType: 'copilot' })
            ).toBe('Copilot Individual')
            expect(
                formatSubscriptionPlan({
                    provider: 'copilot',
                    subscriptionType: 'copilot_business',
                })
            ).toBe('Copilot Business')
            expect(
                formatSubscriptionPlan({
                    provider: 'copilot',
                    subscriptionType: 'copilot_enterprise',
                })
            ).toBe('Copilot Enterprise')
        })

        it('formats Gemini plans correctly', () => {
            expect(
                formatSubscriptionPlan({ provider: 'gemini', subscriptionType: 'gemini_advanced' })
            ).toBe('Gemini Advanced')
            expect(
                formatSubscriptionPlan({ provider: 'gemini', subscriptionType: 'google_one_ai' })
            ).toBe('Google One AI Premium')
            expect(formatSubscriptionPlan({ provider: 'gemini' })).toBe('Gemini Advanced')
        })
    })

    describe('formatSubscriptionToast', () => {
        it('formats Claude toast with email and model, without checkmark symbol', () => {
            const toast = formatSubscriptionToast(
                { provider: 'claude', subscriptionType: 'claude_pro', email: 'alex@example.com' },
                'claude-sonnet-5'
            )
            expect(toast).toBe('Connected to Claude Pro (alex@example.com) • claude-sonnet-5')
            expect(toast).not.toContain('✔')
            expect(toast).not.toContain('CLAUDE')
            expect(toast).not.toContain('claude_pro')
        })

        it('formats Copilot toast with username handle and model, without checkmark symbol', () => {
            const toast = formatSubscriptionToast(
                { provider: 'copilot', subscriptionType: 'copilot', accountName: 'octocat' },
                'gpt-4o'
            )
            expect(toast).toBe('Connected to GitHub Copilot (@octocat) • gpt-4o')
            expect(toast).not.toContain('✔')
            expect(toast).not.toContain('COPILOT')
        })

        it('formats Codex toast with email, without checkmark symbol', () => {
            const toast = formatSubscriptionToast(
                { provider: 'codex', subscriptionType: 'chatgpt_plus', email: 'dev@openai.com' },
                'gpt-5.4'
            )
            expect(toast).toBe('Connected to ChatGPT Plus (dev@openai.com) • gpt-5.4')
            expect(toast).not.toContain('✔')
            expect(toast).not.toContain('CODEX')
            expect(toast).not.toContain('chatgpt_plus')
        })

        it('formats Gemini toast with email and model, without checkmark symbol', () => {
            const toast = formatSubscriptionToast(
                {
                    provider: 'gemini',
                    subscriptionType: 'gemini_advanced',
                    email: 'user@gmail.com',
                },
                'gemini-3.8-flash'
            )
            expect(toast).toBe('Connected to Gemini Advanced (user@gmail.com) • gemini-3.8-flash')
            expect(toast).not.toContain('✔')
            expect(toast).not.toContain('GEMINI')
            expect(toast).not.toContain('gemini_advanced')
        })
    })

    describe('formatSubscriptionCard', () => {
        it('formats full structured card without checkmark symbol', () => {
            const card = formatSubscriptionCard(
                { provider: 'claude', subscriptionType: 'claude_pro', email: 'alex@example.com' },
                'claude-sonnet-5'
            )
            expect(card).not.toContain('✔')
            expect(card).toContain('Linked Anthropic Claude Subscription')
            expect(card).toContain('• Plan:         Claude Pro')
            expect(card).toContain('• Account:      alex@example.com')
            expect(card).not.toContain('Active Model')
            expect(card).not.toContain('Auth Mode')
        })

        it('formats Copilot card with @handle as markdown link', () => {
            const card = formatSubscriptionCard({
                provider: 'copilot',
                subscriptionType: 'copilot',
                accountName: 'octocat',
            })
            expect(card).toContain('Linked GitHub Copilot Subscription')
            expect(card).toContain('• Plan:         Copilot Individual')
            expect(card).toContain('• Account:      [@octocat](https://github.com/octocat)')
        })
    })
})
