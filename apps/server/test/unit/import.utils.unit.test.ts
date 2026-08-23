import { describe, it, expect } from 'bun:test'

import {
    parseGitHubRepoUrl,
    verifyGitHubRepoAccess,
} from '../../src/modules/platform/import/import.utils'

describe('Import Utils - Unit Tests', () => {
    describe('parseGitHubRepoUrl', () => {
        it('should parse standard HTTPS GitHub URLs', () => {
            const res = parseGitHubRepoUrl('https://github.com/phasehumans/december')
            expect(res.ok).toBe(true)
            if (res.ok) {
                expect(res.owner).toBe('phasehumans')
                expect(res.repo).toBe('december')
                expect(res.normalizedUrl).toBe('https://github.com/phasehumans/december')
            }
        })

        it('should parse SSH GitHub URLs', () => {
            const res = parseGitHubRepoUrl('git@github.com:facebook/react.git')
            expect(res.ok).toBe(true)
            if (res.ok) {
                expect(res.owner).toBe('facebook')
                expect(res.repo).toBe('react')
                expect(res.normalizedUrl).toBe('https://github.com/facebook/react')
            }
        })

        it('should parse naked github.com and www.github.com URLs', () => {
            const res1 = parseGitHubRepoUrl('github.com/vercel/next.js')
            expect(res1.ok).toBe(true)
            if (res1.ok) {
                expect(res1.owner).toBe('vercel')
                expect(res1.repo).toBe('next.js')
            }

            const res2 = parseGitHubRepoUrl('www.github.com/tailwindlabs/tailwindcss')
            expect(res2.ok).toBe(true)
            if (res2.ok) {
                expect(res2.owner).toBe('tailwindlabs')
                expect(res2.repo).toBe('tailwindcss')
            }
        })

        it('should fail with empty input or non-github domain', () => {
            expect(parseGitHubRepoUrl('').ok).toBe(false)
            expect(parseGitHubRepoUrl('https://gitlab.com/group/repo').ok).toBe(false)
            expect(parseGitHubRepoUrl('https://github.com/').ok).toBe(false)
        })
    })

    describe('verifyGitHubRepoAccess', () => {
        it('should return error if GitHub returns 404', async () => {
            const originalFetch = globalThis.fetch
            globalThis.fetch = (async () => ({
                status: 404,
                ok: false,
            })) as any

            try {
                const res = await verifyGitHubRepoAccess('owner', 'repo')
                expect(res.ok).toBe(false)
                if (!res.ok) {
                    expect(res.code).toBe('NOT_FOUND_OR_NO_ACCESS')
                }
            } finally {
                globalThis.fetch = originalFetch
            }
        })

        it('should return verified metadata on successful response', async () => {
            const originalFetch = globalThis.fetch
            globalThis.fetch = (async () => ({
                status: 200,
                ok: true,
                json: async () => ({
                    name: 'december',
                    owner: { login: 'phasehumans' },
                    private: false,
                    html_url: 'https://github.com/phasehumans/december',
                    clone_url: 'https://github.com/phasehumans/december.git',
                    default_branch: 'main',
                    archived: false,
                    disabled: false,
                }),
            })) as any

            try {
                const res = await verifyGitHubRepoAccess('phasehumans', 'december', 'token-123')
                expect(res.ok).toBe(true)
                if (res.ok) {
                    expect(res.owner).toBe('phasehumans')
                    expect(res.repo).toBe('december')
                    expect(res.visibility).toBe('public')
                    expect(res.canAccess).toBe(true)
                }
            } finally {
                globalThis.fetch = originalFetch
            }
        })
    })
})
