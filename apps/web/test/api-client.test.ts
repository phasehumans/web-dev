import { expect, test, describe, afterEach } from 'bun:test'

import {
    getApiBaseUrl,
    getClientEnv,
    getGithubClientId,
    getGoogleClientId,
    getVercelIntegrationSlug,
    getSupabaseClientId,
    getSupabaseRedirectUri,
    getNotionClientId,
    getNotionRedirectUri,
} from '../src/shared/config/env'

describe('API Client Base URL and Environment Configuration', () => {
    const originalWindow = (globalThis as any).window

    afterEach(() => {
        if (originalWindow !== undefined) {
            ;(globalThis as any).window = originalWindow
        } else {
            delete (globalThis as any).window
        }
    })

    test('resolves production API URL when window hostname is trydecember.com', () => {
        ;(globalThis as any).window = {
            location: {
                hostname: 'trydecember.com',
                origin: 'https://trydecember.com',
            },
        }

        expect(getApiBaseUrl()).toBe('https://api.trydecember.com/api/v1')
    })

    test('resolves production API URL for subdomains of trydecember.com', () => {
        ;(globalThis as any).window = {
            location: {
                hostname: 'app.trydecember.com',
                origin: 'https://app.trydecember.com',
            },
        }

        expect(getApiBaseUrl()).toBe('https://api.trydecember.com/api/v1')
    })

    test('resolves same-origin API URL for custom/staging domains', () => {
        ;(globalThis as any).window = {
            location: {
                hostname: 'december-staging.internal',
                origin: 'https://december-staging.internal',
            },
        }

        expect(getApiBaseUrl()).toBe('https://december-staging.internal/api/v1')
    })

    test('reads runtime window.__ENV__ injection when present', () => {
        ;(globalThis as any).window = {
            __ENV__: {
                GITHUB_CLIENT_ID: 'custom-gh-client-id',
                VERCEL_INTEGRATION_SLUG: 'custom-slug',
            },
            location: {
                hostname: 'localhost',
                origin: 'http://localhost:3000',
            },
        }

        expect(getClientEnv('GITHUB_CLIENT_ID')).toBe('custom-gh-client-id')
        expect(getGithubClientId()).toBe('custom-gh-client-id')
        expect(getVercelIntegrationSlug()).toBe('custom-slug')
    })

    test('falls back to default integration values when env is unset', () => {
        const origSupabase = process.env.SUPABASE_REDIRECT_URI
        const origNotion = process.env.NOTION_REDIRECT_URI
        const origBunSupabase = (globalThis as any).Bun?.env?.SUPABASE_REDIRECT_URI
        const origBunNotion = (globalThis as any).Bun?.env?.NOTION_REDIRECT_URI

        delete process.env.SUPABASE_REDIRECT_URI
        delete process.env.NOTION_REDIRECT_URI
        if ((globalThis as any).Bun?.env) {
            delete (globalThis as any).Bun.env.SUPABASE_REDIRECT_URI
            delete (globalThis as any).Bun.env.NOTION_REDIRECT_URI
        }

        try {
            ;(globalThis as any).window = {
                location: {
                    hostname: 'localhost',
                    origin: 'http://localhost:3000',
                },
            }

            expect(getGithubClientId()).toBe('Ov23liFGkTAwCW7E8gtk')
            expect(getGoogleClientId()).toBe(
                '762203307362-qg77ln4ci9eldv3i0q1smv804epsbhk0.apps.googleusercontent.com'
            )
            expect(getVercelIntegrationSlug()).toBe('december')
            expect(getSupabaseClientId()).toBe('4a0473bb-3c69-4d28-8896-d1d8b6e18347')
            expect(getNotionClientId()).toBe('36ad872b-594c-8101-9e7c-00378ba2e5f6')
            expect(getSupabaseRedirectUri('https://api.trydecember.com/api/v1')).toBe(
                'https://api.trydecember.com/api/v1/integrations/supabase/connect'
            )
            expect(getNotionRedirectUri('https://api.trydecember.com/api/v1')).toBe(
                'https://api.trydecember.com/api/v1/integrations/notion/connect'
            )
        } finally {
            if (origSupabase !== undefined) process.env.SUPABASE_REDIRECT_URI = origSupabase
            if (origNotion !== undefined) process.env.NOTION_REDIRECT_URI = origNotion
            if ((globalThis as any).Bun?.env) {
                if (origBunSupabase !== undefined)
                    (globalThis as any).Bun.env.SUPABASE_REDIRECT_URI = origBunSupabase
                if (origBunNotion !== undefined)
                    (globalThis as any).Bun.env.NOTION_REDIRECT_URI = origBunNotion
            }
        }
    })
})
