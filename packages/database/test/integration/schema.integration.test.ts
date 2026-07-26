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

    test('enforces RepositoryWiki unique constraint per user and repoFullName', async () => {
        if (!dbAvailable) return

        const uniqueEmail = `test-user-${Date.now()}@example.com`
        const user = await prisma.user.create({
            data: {
                name: 'Test DB User',
                email: uniqueEmail,
                username: `testuser_${Date.now()}`,
            },
        })

        const wiki1 = await prisma.repositoryWiki.create({
            data: {
                userId: user.id,
                repoFullName: 'phasehumans/december',
                repoOwner: 'phasehumans',
                repoName: 'december',
                pages: {
                    create: [
                        { slug: 'overview', title: 'Overview', content: 'Repo overview content' },
                    ],
                },
            },
            include: { pages: true },
        })

        expect(wiki1.pages.length).toBe(1)
        expect(wiki1.pages[0]?.title).toBe('Overview')

        // Attempting to create duplicate wiki for same user and repoFullName should throw unique constraint error
        await expect(
            Promise.resolve(
                prisma.repositoryWiki.create({
                    data: {
                        userId: user.id,
                        repoFullName: 'phasehumans/december',
                        repoOwner: 'phasehumans',
                        repoName: 'december',
                    },
                })
            )
        ).rejects.toThrow()

        // Clean up test records
        await prisma.user.delete({ where: { id: user.id } })
    })
})
