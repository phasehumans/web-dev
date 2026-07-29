import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
    server: {
        ENV: z.enum(['DEV', 'TEST', 'PROD']).default('DEV'),
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

        JWT_SECRET: z.string().default('default-dev-jwt-secret'),
    },
    clientPrefix: '',
    client: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
})
