import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
    isSensitiveEnvKey,
    parseEnvKeyNames,
    findProjectEnvFiles,
    purgeProjectEnvApiKeys,
} from '../../src/utils/env-sanitizer'

describe('Project Env Sanitizer (Unit)', () => {
    let tmpDir: string
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        originalEnv = { ...process.env }
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'december-env-test-'))
    })

    afterEach(() => {
        process.env = originalEnv
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        } catch {
            // Intentionally swallowed: cleanup error
        }
    })

    describe('parseEnvKeyNames', () => {
        it('parses standard KEY=value, export KEY=value, and ignores comments', () => {
            const content = `
# Comment line
DATABASE_URL=postgres://localhost:5432/db
export OPENAI_API_KEY=sk-test-12345
GEMINI_API_KEY = AQ.testKey
PORT=4000
  # Indented comment
EMPTY_KEY=
INVALID LINE
`
            const keys = parseEnvKeyNames(content)
            expect(keys).toEqual([
                'DATABASE_URL',
                'OPENAI_API_KEY',
                'GEMINI_API_KEY',
                'PORT',
                'EMPTY_KEY',
            ])
        })
    })

    describe('isSensitiveEnvKey', () => {
        it('identifies standard AI provider keys and token patterns as sensitive', () => {
            expect(isSensitiveEnvKey('OPENAI_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('ANTHROPIC_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('GEMINI_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('GOOGLE_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('OPENROUTER_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('GROQ_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('DEEPSEEK_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('COPILOT_TOKEN')).toBe(true)
            expect(isSensitiveEnvKey('GITHUB_COPILOT_TOKEN')).toBe(true)
            expect(isSensitiveEnvKey('CLAUDE_CODE_OAUTH_TOKEN')).toBe(true)
            expect(isSensitiveEnvKey('ANTIGRAVITY_TOKEN')).toBe(true)
            expect(isSensitiveEnvKey('CUSTOM_LLM_API_KEY')).toBe(true)
            expect(isSensitiveEnvKey('VENDOR_APIKEY')).toBe(true)
            expect(isSensitiveEnvKey('CLIENT_OAUTH_TOKEN')).toBe(true)
        })

        it('does not classify standard application config as sensitive API keys', () => {
            expect(isSensitiveEnvKey('DATABASE_URL')).toBe(false)
            expect(isSensitiveEnvKey('PORT')).toBe(false)
            expect(isSensitiveEnvKey('NODE_ENV')).toBe(false)
            expect(isSensitiveEnvKey('SERVER_URL')).toBe(false)
            expect(isSensitiveEnvKey('WEB_URL')).toBe(false)
            expect(isSensitiveEnvKey('LOG_LEVEL')).toBe(false)
            expect(isSensitiveEnvKey('REDIS_URL')).toBe(false)
        })
    })

    describe('findProjectEnvFiles', () => {
        it('locates project .env files in root and .december directory', () => {
            fs.writeFileSync(path.join(tmpDir, '.env'), 'FOO=1\n')
            fs.writeFileSync(path.join(tmpDir, '.env.local'), 'BAR=2\n')
            fs.mkdirSync(path.join(tmpDir, '.december'))
            fs.writeFileSync(path.join(tmpDir, '.december', '.env'), 'BAZ=3\n')

            const files = findProjectEnvFiles(tmpDir)
            expect(files.some((f) => f.endsWith('.env'))).toBe(true)
            expect(files.some((f) => f.endsWith('.env.local'))).toBe(true)
            expect(files.some((f) => f.includes('.december') && f.endsWith('.env'))).toBe(true)
        })
    })

    describe('purgeProjectEnvApiKeys', () => {
        it('purges sensitive keys found in project .env from process.env, while preserving non-sensitive config', () => {
            const envContent = `
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/december
PORT=4000
GEMINI_API_KEY=AQ.test-project-gemini-key
OPENAI_API_KEY=sk-test-project-openai-key
OPENROUTER_API_KEY=sk-or-v1-test-project-openrouter
`
            fs.writeFileSync(path.join(tmpDir, '.env'), envContent)

            // Simulate Bun having preloaded .env into process.env
            process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/december'
            process.env.PORT = '4000'
            process.env.GEMINI_API_KEY = 'AQ.test-project-gemini-key'
            process.env.OPENAI_API_KEY = 'sk-test-project-openai-key'
            process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-project-openrouter'

            const purged = purgeProjectEnvApiKeys(tmpDir)

            expect(purged).toContain('GEMINI_API_KEY')
            expect(purged).toContain('OPENAI_API_KEY')
            expect(purged).toContain('OPENROUTER_API_KEY')

            // Verify API keys were deleted from process.env
            expect(process.env.GEMINI_API_KEY).toBeUndefined()
            expect(process.env.OPENAI_API_KEY).toBeUndefined()
            expect(process.env.OPENROUTER_API_KEY).toBeUndefined()

            // Verify non-sensitive application variables remain intact
            expect(process.env.DATABASE_URL).toBe(
                'postgresql://postgres:postgres@localhost:5432/december'
            )
            expect(process.env.PORT).toBe('4000')
        })
    })
})
