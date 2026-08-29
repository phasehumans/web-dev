export type SecretSummary = {
    id: string
    name: string
    note: string | null
    createdAt: Date
    updatedAt: Date
}

export type SecretWithDecryptedValue = {
    id: string
    name: string
    value: string
    note: string | null
    createdAt: Date
    updatedAt: Date
}

export type EncryptData = {
    text: string
}

export type DecryptData = {
    encryptedText: string
}

export type CreateSecret = {
    userId: string
    name: string
    value: string
    note?: string
}

export type BulkCreateSecretItem = {
    name: string
    value: string
    note?: string
}

export type BulkCreateSecrets = {
    userId: string
    secrets: BulkCreateSecretItem[]
}

export type GetSecrets = {
    userId: string
}

export type GetSecretValue = {
    userId: string
    name: string
}

export type DeleteSecret = {
    userId: string
    name: string
}

export type DecryptedSecretItem = {
    key: string
    value: string
}

export type GetAllDecryptedSecrets = {
    userId: string
}
