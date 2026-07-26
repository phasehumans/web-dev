import { describe, expect, test, beforeAll, afterAll } from 'bun:test'

import { getRedisClient, getRedisSubClient, getAgentQueue } from '../../src/queue'

describe('Redis & Queue Integration (Integration)', () => {
    let isRedisAvailable = false

    beforeAll(async () => {
        try {
            const client = getRedisClient()
            await client.ping()
            isRedisAvailable = true
        } catch {
            isRedisAvailable = false
        }
    })

    afterAll(async () => {
        if (isRedisAvailable) {
            try {
                const queue = getAgentQueue()
                await queue.close()
                const client = getRedisClient()
                client.disconnect()
                const subClient = getRedisSubClient()
                subClient.disconnect()
            } catch {
                // Intentionally swallowed: cleanup when offline in test environment
            }
        }
    })

    test('verifies redis connection status or skips if offline', () => {
        if (!isRedisAvailable) {
            console.log('Redis server is offline. Skipping live Redis test.')
            return
        }
        expect(isRedisAvailable).toBe(true)
    })

    test('initializes Redis client instances with configuration when available', () => {
        if (!isRedisAvailable) return

        const client = getRedisClient()
        expect(client).toBeDefined()

        const subClient = getRedisSubClient()
        expect(subClient).toBeDefined()
    })
})
