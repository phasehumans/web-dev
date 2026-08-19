import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export const MANDATORY_HANDOFF_EXCLUDES = [
    'node_modules',
    'node_modules/**',
    '.git',
    '.git/**',
    '.december-handoff.tar.gz',
    '.env',
    '.env.*',
    '*.env',
    '*.env.*',
    '*.pem',
    '*.key',
    '*.p12',
    '*.pfx',
    'id_rsa',
    'id_rsa.*',
    'id_ed25519',
    'id_ed25519.*',
    '.aws',
    '.aws/**',
    '.ssh',
    '.ssh/**',
    '.npmrc',
    '.pypirc',
    '.december/config.json',
    '*.log',
    '.next',
    '.next/**',
    'dist',
    'dist/**',
    'build',
    'build/**',
]

export function getHandoffExcludes(baseDir: string = process.cwd()): string[] {
    const excludes = [...MANDATORY_HANDOFF_EXCLUDES]

    const readIgnoreFile = (fileName: string) => {
        const filePath = path.join(baseDir, fileName)
        try {
            if (fs.existsSync(filePath)) {
                const lines = fs.readFileSync(filePath, 'utf8').split('\n')
                for (const line of lines) {
                    const trimmed = line.trim()
                    if (trimmed && !trimmed.startsWith('#')) {
                        const cleanPattern = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
                        excludes.push(cleanPattern)
                    }
                }
            }
        } catch {
            // Intentionally swallowed: ignore unreadable ignore files
        }
    }

    readIgnoreFile('.gitignore')
    readIgnoreFile('.decemberignore')

    return Array.from(new Set(excludes))
}

export async function createWorkspaceArchive(
    archivePath: string = '.december-handoff.tar.gz',
    baseDir: string = process.cwd()
): Promise<void> {
    const excludes = getHandoffExcludes(baseDir)
    const excludeArgs = excludes.map((ex) => `--exclude=${ex}`).join(' ')
    const cmd = `tar -czf ${archivePath} ${excludeArgs} .`

    try {
        await execAsync(cmd, { cwd: baseDir })
    } catch (e: any) {
        // Exit code 1 for tar indicates minor warnings (such as file changed during read)
        if (e && e.code !== 1 && e.status !== 1) {
            throw e
        }
    }
}
