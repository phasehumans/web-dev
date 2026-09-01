import { execFile } from 'node:child_process'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type BinaryManager = 'bun' | 'npm' | 'pnpm' | 'yarn' | 'brew' | 'source' | 'unknown'

export interface DecemberBinaryInfo {
    path: string
    realPath: string
    manager: BinaryManager
    version?: string
    isSymlink: boolean
    isActive: boolean
    isShadowed: boolean
}

export interface BinaryCollisionDiagnosis {
    activeBinary: DecemberBinaryInfo | null
    allBinaries: DecemberBinaryInfo[]
    shadowedBinaries: DecemberBinaryInfo[]
    hasCollision: boolean
    hasStaleActive: boolean
    latestInstalledVersion?: string
}

export interface DiscoveryOptions {
    envPath?: string
    homeDir?: string
    execPath?: string
    argv1?: string
    env?: Record<string, string | undefined>
}

/**
 * Infer package manager type from binary and target file paths.
 */
export function inferManagerFromPath(filePath: string, realPath: string): BinaryManager {
    const normalized = (filePath + ' ' + realPath).replace(/\\/g, '/').toLowerCase()

    if (
        normalized.includes('/apps/cli/src') ||
        normalized.includes('/apps/cli/dist') ||
        normalized.includes('december/apps/cli')
    ) {
        return 'source'
    }
    if (normalized.includes('/cellar/december') || normalized.includes('/opt/homebrew')) {
        return 'brew'
    }
    if (normalized.includes('/.bun/bin') || normalized.includes('/.bun/')) {
        return 'bun'
    }
    if (normalized.includes('/pnpm') || normalized.includes('/.pnpm')) {
        return 'pnpm'
    }
    if (normalized.includes('/.yarn') || normalized.includes('/yarn/')) {
        return 'yarn'
    }
    if (
        normalized.includes('/.nvm/') ||
        normalized.includes('/node_modules/@trydecember/cli') ||
        normalized.includes('/.npm-global') ||
        normalized.includes('/usr/local/') ||
        normalized.includes('/usr/bin/')
    ) {
        return 'npm'
    }
    return 'unknown'
}

/**
 * Attempt to read package.json version adjacent to the resolved binary target.
 */
async function readVersionFromPackageJson(targetPath: string): Promise<string | undefined> {
    try {
        let dir = path.dirname(targetPath)
        for (let i = 0; i < 4; i++) {
            const candidatePkg = path.join(dir, 'package.json')
            try {
                const content = await fs.readFile(candidatePkg, 'utf-8')
                const parsed = JSON.parse(content)
                if (parsed.name === '@trydecember/cli' && typeof parsed.version === 'string') {
                    return parsed.version
                }
            } catch {
                // Intentionally swallowed: package.json missing or not matching at this level
            }
            const parent = path.dirname(dir)
            if (parent === dir) break
            dir = parent
        }
    } catch {
        // Intentionally swallowed: failed finding package.json
    }
    return undefined
}

/**
 * Fallback: execute binary directly to get version string.
 */
function readVersionFromExecution(binPath: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        execFile(binPath, ['--version'], { timeout: 1500 }, (error, stdout) => {
            if (error || !stdout) {
                resolve(undefined)
                return
            }
            const trimmed = stdout.trim()
            const match = trimmed.match(/\d+\.\d+\.\d+(?:-[\w.]+)?/)
            resolve(match ? match[0] : undefined)
        })
    })
}

/**
 * Find all candidate December CLI binary locations on the system.
 */
export async function findAllDecemberBinaries(
    options?: DiscoveryOptions
): Promise<DecemberBinaryInfo[]> {
    const homeDir = options?.homeDir ?? os.homedir()
    const env = options?.env ?? process.env
    const rawPath = options?.envPath ?? env.PATH ?? ''
    const pathDirs = rawPath.split(path.delimiter).filter(Boolean)

    const candidateFiles: string[] = []

    // 1. Collect from all PATH entries
    const binNames =
        process.platform === 'win32'
            ? ['december.cmd', 'december.exe', 'december.ps1', 'december']
            : ['december']

    for (const dir of pathDirs) {
        for (const name of binNames) {
            candidateFiles.push(path.join(dir, name))
        }
    }

    // 2. Collect from well-known global locations in case not in PATH
    const knownLocations = [
        path.join(homeDir, '.bun', 'bin', 'december'),
        path.join(homeDir, '.local', 'share', 'pnpm', 'december'),
        path.join(homeDir, '.yarn', 'bin', 'december'),
        path.join(homeDir, '.npm-global', 'bin', 'december'),
        '/usr/local/bin/december',
        '/opt/homebrew/bin/december',
    ]

    if (env.PNPM_HOME) {
        knownLocations.push(path.join(env.PNPM_HOME, 'december'))
    }

    // Scan NVM versions if present
    const nvmDir = path.join(homeDir, '.nvm', 'versions', 'node')
    try {
        if (fsSync.existsSync(nvmDir)) {
            const versions = await fs.readdir(nvmDir)
            for (const v of versions) {
                knownLocations.push(path.join(nvmDir, v, 'bin', 'december'))
            }
        }
    } catch {
        // Intentionally swallowed: NVM directory scanning optional
    }

    candidateFiles.push(...knownLocations)

    // Also include current process.argv[1] if specified
    if (options?.argv1) {
        candidateFiles.push(options.argv1)
    }

    // 3. Inspect and verify existing binaries
    const verifiedBinaries: DecemberBinaryInfo[] = []
    const seenPaths = new Set<string>()
    const seenRealPaths = new Set<string>()

    let activeAssigned = false

    for (const candidate of candidateFiles) {
        const normalizedPath = path.normalize(candidate)
        if (seenPaths.has(normalizedPath)) continue
        seenPaths.add(normalizedPath)

        try {
            const lstat = await fs.lstat(normalizedPath)
            const isSymlink = lstat.isSymbolicLink()
            const isExecutable = !lstat.isDirectory()

            if (!isExecutable) continue

            let realPath = normalizedPath
            try {
                realPath = await fs.realpath(normalizedPath)
            } catch {
                // If broken symlink or unreadable realpath, use normalizedPath
            }

            if (seenRealPaths.has(realPath)) {
                // Same target already discovered via another alias
                continue
            }
            seenRealPaths.add(realPath)

            const manager = inferManagerFromPath(normalizedPath, realPath)

            // Try reading version: execution is authoritative because dist might not match package.json
            let version = await readVersionFromExecution(normalizedPath)
            if (!version) {
                version = await readVersionFromPackageJson(realPath)
            }

            const isActive = !activeAssigned
            if (isActive) {
                activeAssigned = true
            }

            verifiedBinaries.push({
                path: normalizedPath,
                realPath,
                manager,
                version,
                isSymlink,
                isActive,
                isShadowed: !isActive,
            })
        } catch {
            // File does not exist at candidate path, ignore
        }
    }

    return verifiedBinaries
}

/**
 * Compare two semver strings (returns >0 if a is newer than b).
 */
export function compareVersions(a?: string, b?: string): number {
    if (!a && !b) return 0
    if (!a) return -1
    if (!b) return 1

    const cleanA = a.replace(/^v/, '')
    const cleanB = b.replace(/^v/, '')
    const p1 = cleanA.split('.').map((n) => Number(n) || 0)
    const p2 = cleanB.split('.').map((n) => Number(n) || 0)

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const v1 = p1[i] ?? 0
        const v2 = p2[i] ?? 0
        if (v1 > v2) return 1
        if (v1 < v2) return -1
    }
    return 0
}

/**
 * Run a full diagnostic check on installed December binaries and identify collisions.
 */
export async function diagnoseBinaryCollisions(
    options?: DiscoveryOptions
): Promise<BinaryCollisionDiagnosis> {
    const allBinaries = await findAllDecemberBinaries(options)
    const activeBinary = allBinaries.find((b) => b.isActive) ?? null
    const shadowedBinaries = allBinaries.filter((b) => b.isShadowed)

    // Find the latest installed version across all discovered binaries
    let latestInstalledVersion: string | undefined
    for (const bin of allBinaries) {
        if (bin.version) {
            if (
                !latestInstalledVersion ||
                compareVersions(bin.version, latestInstalledVersion) > 0
            ) {
                latestInstalledVersion = bin.version
            }
        }
    }

    // Has collision if multiple binaries exist
    const hasCollision = allBinaries.length > 1

    // Has stale active if the currently active binary is older than another discovered binary
    const hasStaleActive = Boolean(
        activeBinary?.version &&
        latestInstalledVersion &&
        compareVersions(latestInstalledVersion, activeBinary.version) > 0
    )

    return {
        activeBinary,
        allBinaries,
        shadowedBinaries,
        hasCollision,
        hasStaleActive,
        latestInstalledVersion,
    }
}

/**
 * Safely forward a stale binary path to point directly to the primary target binary.
 * This prevents broken shell hash tables (`bash: ...: No such file or directory`)
 * when an old binary is replaced or superseded.
 */
export async function forwardStaleBinary(
    stalePath: string,
    targetPath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (stalePath === targetPath) {
            return { success: true }
        }

        // Ensure target exists
        await fs.access(targetPath)

        // Remove old stale binary/symlink
        try {
            await fs.unlink(stalePath)
        } catch {
            // If unlink fails, attempt chmod / overwrite
        }

        // On POSIX, create symlink pointing to targetPath
        if (process.platform !== 'win32') {
            await fs.symlink(targetPath, stalePath)
        } else {
            // On Windows, create forwarding .cmd script
            const cmdContent = `@ECHO off\r\n"${targetPath}" %*\r\n`
            await fs.writeFile(stalePath, cmdContent, 'utf-8')
        }

        return { success: true }
    } catch (e: any) {
        return {
            success: false,
            error: e?.message ?? 'Failed to forward stale binary',
        }
    }
}

/**
 * Clean up or forward all stale / competing binaries so that the primary binary takes precedence.
 */
export async function resolveAndCleanStaleBinaries(
    targetPrimaryBinary: DecemberBinaryInfo,
    allBinaries: DecemberBinaryInfo[]
): Promise<string[]> {
    const cleanedOrForwarded: string[] = []

    for (const bin of allBinaries) {
        if (
            bin.path === targetPrimaryBinary.path ||
            bin.realPath === targetPrimaryBinary.realPath
        ) {
            continue
        }

        // If stale binary is in a different manager path (e.g. ~/.bun/bin/december while target is npm)
        const forwardRes = await forwardStaleBinary(bin.path, targetPrimaryBinary.path)
        if (forwardRes.success) {
            cleanedOrForwarded.push(bin.path)
        }
    }

    return cleanedOrForwarded
}
