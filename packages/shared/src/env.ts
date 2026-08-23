import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
    server: {
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        PORT: z.coerce.number().default(3000),
        LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

        DATABASE_URL: z.string().optional(),
        TEST_DATABASE_URL: z.string().optional(),
        REDIS_URL: z.string().optional(),

        OPENAI_API_KEY: z.string().optional(),
        ANTHROPIC_API_KEY: z.string().optional(),
        GEMINI_API_KEY: z.string().optional(),

        FIRECRACKER_BINARY: z.string().default('./firecracker'),
        FIRECRACKER_KERNEL_PATH: z.string().default('./vmlinux.bin'),
        FIRECRACKER_ROOTFS_PATH: z.string().default('./ubuntu-rootfs.ext4'),

        JWT_SECRET: z.string().default(process.env.ACCESS_TOKEN_SECRET || 'default-dev-jwt-secret'),
    },
    clientPrefix: '',
    client: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    onValidationError: (error) => {
        console.error('Shared environment validation error:', error)
        throw new Error('Invalid shared environment variables')
    },
})

const effectiveJwtSecret = env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET
if (
    env.NODE_ENV === 'production' &&
    (!effectiveJwtSecret || effectiveJwtSecret === 'default-dev-jwt-secret')
) {
    throw new Error(
        'JWT_SECRET or ACCESS_TOKEN_SECRET must be configured with a secure secret in production.'
    )
}
