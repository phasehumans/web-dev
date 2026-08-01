import { apiRequest } from '@/shared/api/client'

export type SecretSummary = {
    id: string
    name: string
    note: string | null
    createdAt: string
    updatedAt: string
}

export type SecretWithDecryptedValue = {
    id: string
    name: string
    value: string
    note: string | null
    createdAt: string
    updatedAt: string
}

export type CreateSecretInput = {
    name: string
    value: string
    note?: string
}

export type BulkCreateSecretItem = {
    name: string
    value: string
    note?: string
}

export type BulkCreateSecretsInput = {
    secrets: BulkCreateSecretItem[]
}

const getSecrets = () => {
    return apiRequest<{ secrets: SecretSummary[] }>('/secrets')
}

const getSecretValue = (name: string) => {
    return apiRequest<{ secret: SecretWithDecryptedValue }>(
        `/secrets/${encodeURIComponent(name)}/value`
    )
}

const createSecret = (data: CreateSecretInput) => {
    return apiRequest<{ secret: SecretSummary }>('/secrets', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

const bulkCreateSecrets = (data: BulkCreateSecretsInput) => {
    return apiRequest<null>('/secrets/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

const deleteSecret = (name: string) => {
    return apiRequest<null>(`/secrets/${encodeURIComponent(name)}`, {
        method: 'DELETE',
    })
}

export const secretsAPI = {
    getSecrets,
    getSecretValue,
    createSecret,
    bulkCreateSecrets,
    deleteSecret,
}
