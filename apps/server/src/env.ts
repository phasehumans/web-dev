import path from 'path'

import dotenv from 'dotenv'
import { z } from 'zod'

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env'

if (!process.env.ENV_LOADED) {
    dotenv.config({
        path: path.resolve(process.cwd(), `../../${envFile}`),
    })
    process.env.ENV_LOADED = 'true'
}

const emptyAsUndefined = z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().min(1).optional()
)

const envSchema = z
    .object({
        PORT: z.coerce.number().default(4000),
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        WEB_URL: z.string().url(),
        SERVER_URL: z.string().url(),
        RESEND_API_KEY: emptyAsUndefined,
        SENDER_EMAIL: z.preprocess(
            (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
            z.string().email().optional()
        ),

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

        GOOGLE_CLIENT_ID: emptyAsUndefined,
        GOOGLE_CLIENT_SECRET: emptyAsUndefined,
        GITHUB_CLIENT_ID: emptyAsUndefined,
        GITHUB_CLIENT_SECRET: emptyAsUndefined,
        VERCEL_CLIENT_ID: emptyAsUndefined,
        VERCEL_CLIENT_SECRET: emptyAsUndefined,
        VERCEL_REDIRECT_URI: z.preprocess(
            (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
            z.string().url().optional()
        ),
        VERCEL_WEBHOOK_SECRET: emptyAsUndefined,
        SUPABASE_CLIENT_ID: emptyAsUndefined,
        SUPABASE_CLIENT_SECRET: emptyAsUndefined,
        SUPABASE_REDIRECT_URI: z.preprocess(
            (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
            z.string().url().optional()
        ),
        NOTION_CLIENT_ID: emptyAsUndefined,
        NOTION_CLIENT_SECRET: emptyAsUndefined,
        NOTION_REDIRECT_URI: z.preprocess(
            (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
            z.string().url().optional()
        ),

        RAZORPAY_KEY_ID: emptyAsUndefined,
        RAZORPAY_KEY_SECRET: emptyAsUndefined,
        RAZORPAY_PRO_PLAN_ID: emptyAsUndefined,
        RAZORPAY_WEBHOOK_SECRET: emptyAsUndefined,

        COINBASE_API_KEY: emptyAsUndefined,
        COINBASE_WEBHOOK_SECRET: emptyAsUndefined,

        GEMINI_API_KEY: emptyAsUndefined,
        OPENAI_API_KEY: emptyAsUndefined,
        ANTHROPIC_API_KEY: emptyAsUndefined,
        DEEPSEEK_API_KEY: emptyAsUndefined,
        OPENROUTER_API_KEY: emptyAsUndefined,
        AUTO_MODEL: emptyAsUndefined,
        DEFAULT_MODEL: emptyAsUndefined,
        BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),
        SECRETS_ENC_KEY: z
            .string()
            .min(64)
            .default('0000000000000000000000000000000000000000000000000000000000000000'),
        REDIS_URL: emptyAsUndefined,
        AGENT_TOKEN_SECRET: emptyAsUndefined,
        GITHUB_APP_NAME: emptyAsUndefined,
        GITHUB_APP_WEBHOOK_SECRET: emptyAsUndefined,
        USD_TO_INR_RATE: z.coerce.number().default(84),
    })
    .superRefine((data, ctx) => {
        if (data.NODE_ENV === 'production') {
            if (
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

            if (!data.REDIS_URL) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'REDIS_URL must be configured in production.',
                    path: ['REDIS_URL'],
                })
            }

            if (!data.AGENT_TOKEN_SECRET) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'AGENT_TOKEN_SECRET must be configured in production.',
                    path: ['AGENT_TOKEN_SECRET'],
                })
            }
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
