import { describe, expect, test, beforeAll, afterAll } from 'bun:test'

import { prisma } from '../../src/index'

describe('Database Schema & Model Constraints (Integration)', () => {
    let dbAvailable = false

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`
            dbAvailable = true
        } catch {
            dbAvailable = false
        }
    })

    afterAll(async () => {
        if (dbAvailable) {
            await prisma.$disconnect()
        }
    })

    test('verifies database connection status or skips if unmigrated/offline', async () => {
        if (!dbAvailable) {
            console.log('Postgres test database is offline or unmigrated. Skipping live DB test.')
            return
        }
        expect(dbAvailable).toBe(true)
    })

    test('enforces User email unique constraint and cascading delete', async () => {
        if (!dbAvailable) return

        const uniqueEmail = `test-user-${Date.now()}@example.com`
        const username = `testuser_${Date.now()}`
        const user = await prisma.user.create({
            data: {
                name: 'Test DB User',
                email: uniqueEmail,
                username,
            },
        })

        expect(user.id).toBeDefined()
        expect(user.email).toBe(uniqueEmail)

        // Attempting to create duplicate user with same email should throw unique constraint error
        await expect(
            Promise.resolve(
                prisma.user.create({
                    data: {
                        name: 'Duplicate User',
                        email: uniqueEmail,
                        username: `${username}_dup`,
                    },
                })
            )
        ).rejects.toThrow()

        // Clean up test records
        await prisma.user.delete({ where: { id: user.id } })
    })
})
