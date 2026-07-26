import path from 'path'

import dotenv from 'dotenv'
import { z } from 'zod'

const envFile = process.env.NODE_ENV === 'test' || process.env.ENV === 'TEST' ? '.env.test' : '.env'

if (!process.env.ENV_LOADED) {
    dotenv.config({
        path: path.resolve(process.cwd(), `../../${envFile}`),
    })
    process.env.ENV_LOADED = 'true'
}

const envSchema = z
    .object({
        PORT: z.coerce.number().default(4000),
        ENV: z.enum(['DEV', 'PROD', 'TEST']).default('DEV'),
        NODE_ENV: z.string().optional(),
        WEB_URL: z.string().url(),
        SERVER_URL: z.string().url(),
        DOCS_URL: z.string().url().optional(),
        RESEND_API_KEY: z.string().min(1).optional(),
        SENDER_EMAIL: z.string().email().optional(),

        DATABASE_URL: z.string().min(1),
        S3_ENDPOINT: z.string().url(),
        S3_REGION: z.string().default('us-east-1'),
        S3_ACCESS_KEY: z.string().min(1),
        S3_SECRET_KEY: z.string().min(1),
        S3_BUCKET: z.string().default('december-storage'),
        S3_FORCE_PATH_STYLE: z
            .preprocess((val) => val === 'true' || val === true || val === undefined, z.boolean())
            .default(true),

        ACCESS_TOKEN_SECRET: z.string().min(1),
        ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
        REFRESH_TOKEN_SECRET: z.string().min(1),
        REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

        GOOGLE_CLIENT_ID: z.string().min(1).optional(),
        GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
        GITHUB_CLIENT_ID: z.string().min(1).optional(),
        GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
        VERCEL_CLIENT_ID: z.string().min(1).optional(),
        VERCEL_CLIENT_SECRET: z.string().min(1).optional(),
        VERCEL_REDIRECT_URI: z.string().url().optional(),
        VERCEL_WEBHOOK_SECRET: z.string().optional(),
        SUPABASE_CLIENT_ID: z.string().min(1).optional(),
        SUPABASE_CLIENT_SECRET: z.string().min(1).optional(),
        SUPABASE_REDIRECT_URI: z.string().url().optional(),
        NOTION_CLIENT_ID: z.string().min(1).optional(),
        NOTION_CLIENT_SECRET: z.string().min(1).optional(),
        NOTION_REDIRECT_URI: z.string().url().optional(),

        RAZORPAY_KEY_ID: z.string().min(1).optional(),
        RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
        RAZORPAY_PRO_PLAN_ID: z.string().min(1).optional(),
        RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

        COINBASE_API_KEY: z.string().min(1).optional(),
        COINBASE_WEBHOOK_SECRET: z.string().min(1).optional(),

        OPENROUTER_API_KEY: z.string().min(1).optional(),
        AUTO_MODEL: z.string().optional(),
        BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),
        SECRETS_ENC_KEY: z
            .string()
            .min(64)
            .default('0000000000000000000000000000000000000000000000000000000000000000'),
        REDIS_URL: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (
            data.ENV === 'PROD' &&
            data.SECRETS_ENC_KEY ===
                '0000000000000000000000000000000000000000000000000000000000000000'
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    'SECRETS_ENC_KEY must be configured with a unique 64-character secret key in production.',
                path: ['SECRETS_ENC_KEY'],
            })
        }
    })

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.error('Environment validation failed:')
    console.error(JSON.stringify(parsedEnv.error.format(), null, 2))
    process.exit(1)
}

export const env = parsedEnv.data
export type Env = z.infer<typeof envSchema>
