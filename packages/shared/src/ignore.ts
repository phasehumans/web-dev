import fs from 'node:fs'
import path from 'node:path'

export const BASELINE_IGNORES = [
    'node_modules',
    'node_modules/**',
    '.git',
    '.git/**',
    'dist',
    'dist/**',
    'build',
    'build/**',
    '.next',
    '.next/**',
    '.turbo',
    '.turbo/**',
    '.december',
    '.december/**',
]

export function parseIgnoreLines(content: string): string[] {
    const patterns: string[] = []
    const lines = content.split('\n')
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        let clean = trimmed
        if (clean.startsWith('/')) {
            clean = clean.slice(1)
        }
        if (clean.endsWith('/')) {
            clean = clean.slice(0, -1)
        }
        if (clean) {
            patterns.push(clean)
            if (!clean.endsWith('/**')) {
                patterns.push(`${clean}/**`)
            }
            if (!clean.startsWith('**/')) {
                patterns.push(`**/${clean}`)
                patterns.push(`**/${clean}/**`)
            }
        }
    }
    return patterns
}

export function getWorkspaceIgnores(workspaceRoot: string = process.cwd()): string[] {
    const ignores = new Set<string>(BASELINE_IGNORES)

    const readIgnoreFile = (filename: string) => {
        try {
            const filePath = path.resolve(workspaceRoot, filename)
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8')
                for (const pattern of parseIgnoreLines(content)) {
                    ignores.add(pattern)
                }
            }
        } catch {
            // Intentionally swallowed: ignore unreadable ignore files
        }
    }

    readIgnoreFile('.gitignore')
    readIgnoreFile('.decemberignore')

    return Array.from(ignores)
}

export function isPathIgnored(filePath: string, ignorePatterns: string[]): boolean {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '')
    for (const pattern of ignorePatterns) {
        const cleanPattern = pattern.replace(/\\/g, '/').replace(/^\.\//, '')
        if (cleanPattern === normalized) return true
        if (cleanPattern.endsWith('/**')) {
            const prefix = cleanPattern.slice(0, -3)
            if (normalized === prefix || normalized.startsWith(`${prefix}/`)) return true
        }
        if (cleanPattern.startsWith('**/')) {
            const suffix = cleanPattern.slice(3)
            if (suffix.endsWith('/**')) {
                const mid = suffix.slice(0, -3)
                if (
                    normalized.includes(`/${mid}/`) ||
                    normalized.startsWith(`${mid}/`) ||
                    normalized === mid
                )
                    return true
            } else if (suffix.startsWith('*.')) {
                const ext = suffix.slice(1) // e.g. .log
                if (normalized.endsWith(ext)) return true
            } else if (normalized === suffix || normalized.endsWith(`/${suffix}`)) {
                return true
            }
        }
        if (cleanPattern.startsWith('*.')) {
            const ext = cleanPattern.slice(1)
            if (normalized.endsWith(ext)) return true
        }
    }
    return false
}
