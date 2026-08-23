import { describe, it, expect } from 'bun:test'

import { secretsRepository } from '../../src/modules/secrets/secrets.repository'
import { secretsService } from '../../src/modules/secrets/secrets.service'
import { AppError } from '../../src/shared/appError'

describe('Secrets Service - Unit Tests', () => {
    describe('encrypt and decrypt', () => {
        it('should encrypt a plaintext string and decrypt it back to original value', () => {
            const originalText = 'my-super-secret-api-key-12345'
            const encrypted = secretsService.encrypt({ text: originalText })

            expect(typeof encrypted).toBe('string')
            expect(encrypted).toContain(':')

            const parts = encrypted.split(':')
            expect(parts.length).toBe(3)

            const decrypted = secretsService.decrypt({ encryptedText: encrypted })
            expect(decrypted).toBe(originalText)
        })

        it('should throw AppError 400 when decrypting malformed ciphertext format', () => {
            expect(() => {
                secretsService.decrypt({ encryptedText: 'invalid-format-without-colons' })
            }).toThrow(new AppError('Invalid encrypted text', 400))

            expect(() => {
                secretsService.decrypt({ encryptedText: 'part1:part2' })
            }).toThrow(new AppError('Invalid encrypted text', 400))
        })
    })

    describe('createSecret', () => {
        it('should encrypt value and call secretsRepository.upsertSecret', async () => {
            const originalUpsert = secretsRepository.upsertSecret
            let calledWith: any = null

            secretsRepository.upsertSecret = (async (userId, name, encryptedValue, note) => {
                calledWith = { userId, name, encryptedValue, note }
                return {
                    id: 'secret-1',
                    name,
                    note: note ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            }) as any

            try {
                const res = await secretsService.createSecret({
                    userId: 'user-1',
                    name: 'API_KEY',
                    value: 'plain-secret-value',
                    note: 'Production API Key',
                })

                expect(calledWith).not.toBeNull()
                expect(calledWith.userId).toBe('user-1')
                expect(calledWith.name).toBe('API_KEY')
                expect(calledWith.note).toBe('Production API Key')
                expect(calledWith.encryptedValue).not.toBe('plain-secret-value')
                expect(calledWith.encryptedValue).toContain(':')
                expect(res.name).toBe('API_KEY')
            } finally {
                secretsRepository.upsertSecret = originalUpsert
            }
        })
    })

    describe('bulkCreateSecrets', () => {
        it('should encrypt multiple secrets and call bulkUpsertSecrets', async () => {
            const originalBulkUpsert = secretsRepository.bulkUpsertSecrets
            let calledWith: any = null

            secretsRepository.bulkUpsertSecrets = (async (userId, items) => {
                calledWith = { userId, items }
                return items.map((it: any, idx: number) => ({
                    id: `secret-${idx}`,
                    name: it.name,
                    note: it.note ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            }) as any

            try {
                const res = await secretsService.bulkCreateSecrets({
                    userId: 'user-1',
                    secrets: [
                        { name: 'K1', value: 'v1', note: 'n1' },
                        { name: 'K2', value: 'v2' },
                    ],
                })

                expect(calledWith.userId).toBe('user-1')
                expect(calledWith.items.length).toBe(2)
                expect(calledWith.items[0].name).toBe('K1')
                expect(calledWith.items[0].encryptedValue).toContain(':')
                expect(calledWith.items[1].name).toBe('K2')
                expect(res.length).toBe(2)
            } finally {
                secretsRepository.bulkUpsertSecrets = originalBulkUpsert
            }
        })
    })

    describe('getSecrets', () => {
        it('should return secret summaries for a user', async () => {
            const originalFind = secretsRepository.findSecretsByUser
            const mockSecrets = [
                {
                    id: 'secret-1',
                    name: 'API_KEY',
                    note: 'test note',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]
            secretsRepository.findSecretsByUser = (async () => mockSecrets) as any

            try {
                const res = await secretsService.getSecrets({ userId: 'user-1' })
                expect(res).toEqual(mockSecrets)
            } finally {
                secretsRepository.findSecretsByUser = originalFind
            }
        })
    })

    describe('getSecretValue', () => {
        it('should throw AppError 404 if secret is not found', async () => {
            const originalFind = secretsRepository.findSecretByName
            secretsRepository.findSecretByName = (async () => null) as any

            try {
                await expect(
                    secretsService.getSecretValue({ userId: 'user-1', name: 'UNKNOWN_KEY' })
                ).rejects.toThrow(new AppError('Secret not found', 404))
            } finally {
                secretsRepository.findSecretByName = originalFind
            }
        })

        it('should decrypt and return secret value if found', async () => {
            const originalFind = secretsRepository.findSecretByName
            const plainValue = 'my-decrypted-secret-token'
            const encryptedValue = secretsService.encrypt({ text: plainValue })

            secretsRepository.findSecretByName = (async () => ({
                id: 'secret-1',
                name: 'MY_TOKEN',
                value: encryptedValue,
                note: 'My token note',
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any

            try {
                const res = await secretsService.getSecretValue({
                    userId: 'user-1',
                    name: 'MY_TOKEN',
                })

                expect(res.id).toBe('secret-1')
                expect(res.name).toBe('MY_TOKEN')
                expect(res.value).toBe(plainValue)
                expect(res.note).toBe('My token note')
            } finally {
                secretsRepository.findSecretByName = originalFind
            }
        })
    })

    describe('deleteSecret', () => {
        it('should throw AppError 404 if secret does not exist', async () => {
            const originalFind = secretsRepository.findSecretByName
            secretsRepository.findSecretByName = (async () => null) as any

            try {
                await expect(
                    secretsService.deleteSecret({ userId: 'user-1', name: 'UNKNOWN' })
                ).rejects.toThrow(new AppError('Secret not found', 404))
            } finally {
                secretsRepository.findSecretByName = originalFind
            }
        })

        it('should delete secret when it exists', async () => {
            const originalFind = secretsRepository.findSecretByName
            const originalDelete = secretsRepository.deleteSecret

            secretsRepository.findSecretByName = (async () => ({
                id: 'secret-1',
                name: 'TO_DELETE',
            })) as any
            secretsRepository.deleteSecret = (async () => ({
                id: 'secret-1',
                name: 'TO_DELETE',
            })) as any

            try {
                const res = await secretsService.deleteSecret({
                    userId: 'user-1',
                    name: 'TO_DELETE',
                })
                expect(res).toEqual({ id: 'secret-1', name: 'TO_DELETE' } as any)
            } finally {
                secretsRepository.findSecretByName = originalFind
                secretsRepository.deleteSecret = originalDelete
            }
        })
    })
})
