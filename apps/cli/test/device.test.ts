import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { loginViaDeviceCode } from '../src/auth/device'

describe('loginViaDeviceCode', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('should fetch a device code, poll, and return token on success', async () => {
        // We will mock global fetch
        const fetchMock = vi.fn()
        global.fetch = fetchMock as any

        // 1. Mock the code generation response
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    deviceCode: 'device-123',
                    userCode: 'USER-123',
                    verificationUri: 'https://mock.login/device',
                    expiresIn: 600,
                    interval: 1, // 1 second
                },
            }),
        })

        // 2. Mock the first poll (authorization pending)
        fetchMock.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                success: false,
                message: 'authorization_pending',
            }),
        })

        // 3. Mock the second poll (success)
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: 'mock-token-123',
                    email: 'device@example.com',
                },
            }),
        })

        const onCodeGenerated = vi.fn()

        // We can't await this directly because of fake timers; it will block waiting for polls.
        // Instead, we catch the promise, run timers, and then await it.
        const loginPromise = loginViaDeviceCode('https://api.mock', onCodeGenerated)

        // Wait for the first fetch (code generation) to complete and timers to be scheduled
        for (let i = 0; i < 10; i++) {
            await Promise.resolve()
            if (onCodeGenerated.mock.calls.length > 0) break
        }
        expect(onCodeGenerated).toHaveBeenCalledWith('USER-123', 'https://mock.login/device')

        // Advance timer to trigger the first poll (1 second)
        vi.advanceTimersByTime(1000)
        await Promise.resolve()

        // Advance timer to trigger the second poll (another 1 second)
        vi.advanceTimersByTime(1000)
        await Promise.resolve()

        const result = await loginPromise
        expect(result).toEqual({
            token: 'mock-token-123',
            email: 'device@example.com',
        })

        expect(fetchMock).toHaveBeenCalledTimes(3)
        // Check code generation URL
        expect(fetchMock.mock.calls[0][0]).toBe('https://api.mock/api/v1/auth/device/code')
        // Check polling URL
        expect(fetchMock.mock.calls[1][0]).toBe('https://api.mock/api/v1/auth/device/token')
    })

    it('should throw Unable to connect error on network failure', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed')) as any

        await expect(loginViaDeviceCode('https://api.mock', vi.fn())).rejects.toThrow(
            'Unable to connect. Is the computer able to access the url?'
        )
    })
})
