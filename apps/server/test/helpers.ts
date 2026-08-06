import { prisma } from '@december/database'

import type { Request, Response } from 'express'

/**
 * Clean up test data for a given user email or ID.
 */
export async function cleanupTestUser(identifier: { email?: string; id?: string }) {
    try {
        if (identifier.id) {
            await prisma.deviceCode.deleteMany({ where: { userId: identifier.id } })
            await prisma.authSession.deleteMany({ where: { userId: identifier.id } })
            await prisma.user.delete({ where: { id: identifier.id } })
        } else if (identifier.email) {
            const user = await prisma.user.findUnique({ where: { email: identifier.email } })
            if (user) {
                await prisma.deviceCode.deleteMany({ where: { userId: user.id } })
                await prisma.authSession.deleteMany({ where: { userId: user.id } })
                await prisma.user.delete({ where: { id: user.id } })
            }
        }
    } catch {
        // Intentionally swallowed: test cleanup fallback
    }
}

/**
 * Mock Response object for Express controller/cookie unit tests.
 */
export function createMockResponse(): Response {
    const mockRes: any = {
        cookies: {},
        headers: {},
        statusCode: 200,
        cookie: function (name: string, value: string, options: any) {
            this.cookies[name] = { value, options }
            return this
        },
        clearCookie: function (name: string, options: any) {
            this.cookies[name] = { value: '', options: { ...options, maxAge: 0 } }
            return this
        },
        status: function (code: number) {
            this.statusCode = code
            return this
        },
        json: function (data: any) {
            this.body = data
            return this
        },
        setHeader: function (name: string, value: any) {
            this.headers[name] = value
            return this
        },
    }
    return mockRes as Response
}

/**
 * Mock Request object for Express unit tests.
 */
export function createMockRequest(options: {
    body?: any
    headers?: Record<string, string>
    cookies?: Record<string, string>
    user?: { userId: string; sessionId: string }
    get?: (header: string) => any
}): Request {
    const mockReq: any = {
        body: options.body || {},
        headers: options.headers || {},
        cookies: options.cookies || {},
        user: options.user,
        get: options.get || ((header: string) => options.headers?.[header.toLowerCase()]),
        socket: { remoteAddress: '127.0.0.1' },
    }
    return mockReq as Request
}

/**
 * Generate a random IP address string to prevent rate-limiter collisions in tests.
 */
export function getRandomIP(): string {
    return `${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`
}
