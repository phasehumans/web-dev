import crypto from 'crypto'

import { env } from '../../env'
import { AppError } from '../../shared/appError'

import { secretsRepository } from './secrets.repository'

import type {
    EncryptData,
    DecryptData,
    CreateSecret,
    BulkCreateSecrets,
    GetSecrets,
    GetSecretValue,
    DeleteSecret,
} from './secrets.types'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(env.SECRETS_ENC_KEY, 'hex')

const encrypt = (data: EncryptData): string => {
    const { text } = data
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

const decrypt = (data: DecryptData): string => {
    const { encryptedText } = data
    const [ivHex, authTagHex, contentHex] = encryptedText.split(':')
    if (!ivHex || !authTagHex || !contentHex) throw new AppError('Invalid encrypted text', 400)
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(contentHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

const createSecret = async (data: CreateSecret) => {
    const { userId, name, value, note } = data
    const encryptedValue = encrypt({ text: value })
    return secretsRepository.upsertSecret(userId, name, encryptedValue, note)
}

const bulkCreateSecrets = async (data: BulkCreateSecrets) => {
    const { userId, secrets } = data
    const itemsToUpsert = secrets.map((item) => ({
        name: item.name,
        encryptedValue: encrypt({ text: item.value }),
        note: item.note,
    }))
    return secretsRepository.bulkUpsertSecrets(userId, itemsToUpsert)
}

const getSecrets = async (data: GetSecrets) => {
    const { userId } = data
    return secretsRepository.findSecretsByUser(userId)
}

const getSecretValue = async (data: GetSecretValue) => {
    const { userId, name } = data
    const secret = await secretsRepository.findSecretByName(userId, name)
    if (!secret) throw new AppError('Secret not found', 404)
    const decryptedValue = decrypt({ encryptedText: secret.value })
    return {
        id: secret.id,
        name: secret.name,
        value: decryptedValue,
        note: secret.note,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
    }
}

const deleteSecret = async (data: DeleteSecret) => {
    const { userId, name } = data
    const existing = await secretsRepository.findSecretByName(userId, name)
    if (!existing) throw new AppError('Secret not found', 404)
    return secretsRepository.deleteSecret(userId, name)
}

export const secretsService = {
    encrypt,
    decrypt,
    createSecret,
    bulkCreateSecrets,
    getSecrets,
    getSecretValue,
    deleteSecret,
}
