import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, test } from 'bun:test'

import {
    MANDATORY_HANDOFF_EXCLUDES,
    getHandoffExcludes,
    createWorkspaceArchive,
} from '../../src/utils/handoff'

describe('Handoff Secret Redaction and Archiving Utilities (Unit)', () => {
    test('contains mandatory secret blacklist entries', () => {
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('.env')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('.env.*')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('*.pem')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('*.key')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('id_rsa')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('.aws/**')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('.ssh/**')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('.npmrc')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('.december/config.json')
        expect(MANDATORY_HANDOFF_EXCLUDES).toContain('node_modules/**')
    })

    test('getHandoffExcludes merges .gitignore and .decemberignore rules with blacklist', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-test-'))
        try {
            fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'coverage/\n# comment\n*.tmp\n')
            fs.writeFileSync(path.join(tmpDir, '.decemberignore'), 'custom_secret.txt\n')

            const excludes = getHandoffExcludes(tmpDir)

            expect(excludes).toContain('.env')
            expect(excludes).toContain('coverage')
            expect(excludes).toContain('*.tmp')
            expect(excludes).toContain('custom_secret.txt')
            expect(excludes.includes('# comment')).toBe(false)
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })

    test('createWorkspaceArchive creates valid tarball excluding secret files', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-archive-test-'))
        const archivePath = path.join(tmpDir, '.december-handoff.tar.gz')
        const extractDir = path.join(tmpDir, 'extracted')

        try {
            fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'console.log("hello world")')
            fs.writeFileSync(path.join(tmpDir, '.env'), 'SECRET_KEY=12345')
            fs.writeFileSync(path.join(tmpDir, '.env.local'), 'LOCAL_KEY=67890')
            fs.writeFileSync(path.join(tmpDir, 'id_rsa'), 'PRIVATE_KEY_DATA')
            fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true })
            fs.writeFileSync(path.join(tmpDir, 'node_modules', 'dep.js'), '// dep')

            await createWorkspaceArchive(archivePath, tmpDir)

            expect(fs.existsSync(archivePath)).toBe(true)

            fs.mkdirSync(extractDir, { recursive: true })
            const { execSync } = await import('node:child_process')
            execSync(`tar -xzf "${archivePath}" -C "${extractDir}"`)

            expect(fs.existsSync(path.join(extractDir, 'index.ts'))).toBe(true)
            expect(fs.existsSync(path.join(extractDir, '.env'))).toBe(false)
            expect(fs.existsSync(path.join(extractDir, '.env.local'))).toBe(false)
            expect(fs.existsSync(path.join(extractDir, 'id_rsa'))).toBe(false)
            expect(fs.existsSync(path.join(extractDir, 'node_modules'))).toBe(false)
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
