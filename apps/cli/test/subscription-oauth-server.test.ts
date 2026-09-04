import { describe, it, expect } from 'vitest'

import { generatePKCE, startLocalOAuthServer } from '../src/auth/subscriptions/oauth-server'

describe('Subscription Local OAuth Server & PKCE (Unit)', () => {
    it('generates cryptographically secure PKCE code verifier, challenge, and state', () => {
        const pkce = generatePKCE()
        expect(pkce.codeVerifier).toBeDefined()
        expect(pkce.codeChallenge).toBeDefined()
        expect(pkce.state).toBeDefined()
        expect(pkce.codeVerifier.length).toBeGreaterThan(30)
        expect(pkce.codeChallenge.length).toBeGreaterThan(30)
        expect(pkce.state.length).toBe(32)
    })

    it('spins up a local loopback server, captures redirect query parameters, and serves HTML', async () => {
        const server = await startLocalOAuthServer({ timeoutMs: 5000 })
        expect(server.port).toBeGreaterThan(0)
        expect(server.redirectUri).toBe(`http://127.0.0.1:${server.port}/callback`)

        const callbackPromise = server.waitForCallback()

        const testCode = 'auth_code_12345'
        const testState = 'state_67890'
        const callbackUrl = `${server.redirectUri}?code=${testCode}&state=${testState}`

        const res = await fetch(callbackUrl)
        expect(res.status).toBe(200)
        const html = await res.text()
        expect(html).toContain('Authentication Successful')
        expect(html).toContain('December CLI')

        const result = await callbackPromise
        expect(result.code).toBe(testCode)
        expect(result.state).toBe(testState)
    })

    it('handles OAuth error parameters from provider redirect', async () => {
        const server = await startLocalOAuthServer({ timeoutMs: 5000 })
        const callbackPromise = server.waitForCallback()

        const callbackUrl = `${server.redirectUri}?error=access_denied&error_description=User+cancelled`
        const res = await fetch(callbackUrl)
        expect(res.status).toBe(200)

        const result = await callbackPromise
        expect(result.error).toBe('access_denied')
        expect(result.errorDescription).toBe('User cancelled')
    })
})
