import { execFile } from 'node:child_process'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { SkillDiscoveryEngine, parseSkillFile } from '@december/shared'

const execFileAsync = promisify(execFile)

const BLUE = '\x1b[38;2;135;178;244m'
const GREEN = '\x1b[38;2;110;231;183m'
const YELLOW = '\x1b[38;2;253;224;71m'
const GRAY = '\x1b[38;2;161;161;170m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

export interface SkillCommandOptions {
    action?: string
    target?: string
    isGlobal?: boolean
    isLocal?: boolean
    workspaceDir?: string
    homeDir?: string
    positionals?: string[]
    cwd?: string
}

function validateSkillName(name: string): boolean {
    if (!name || typeof name !== 'string') return false
    const trimmed = name.trim()
    if (!trimmed) return false
    if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) return false
    return /^[a-z0-9-_]+$/i.test(trimmed)
}

function resolveWorkspaceSkillsRoot(workspaceDir: string): string {
    const agentsDir = path.join(workspaceDir, '.agents')
    if (fs.existsSync(agentsDir)) {
        return path.join(agentsDir, 'skills')
    }
    return path.join(workspaceDir, '.december', 'skills')
}

export async function handleSkillList(options: {
    workspaceDir?: string
    homeDir?: string
}): Promise<void> {
    const engine = new SkillDiscoveryEngine({
        workspaceDir: options.workspaceDir || process.cwd(),
        homeDir: options.homeDir || os.homedir(),
    })

    const skills = engine.discoverAllSkills()

    if (skills.length === 0) {
        console.log('No skills discovered.')
        console.log(`\nRun '${BLUE}december skill create <name>${RESET}' to scaffold a new skill.`)
        console.log(
            `Run '${BLUE}december skill add <source>${RESET}' to install a skill from GitHub or a local directory.\n`
        )
        return
    }

    console.log(`\n${BOLD}Discovered Skills (${skills.length}):${RESET}\n`)

    for (const skill of skills) {
        const originTag =
            skill.origin === 'workspace'
                ? `${GREEN}[workspace]${RESET}`
                : skill.origin === 'global'
                  ? `${YELLOW}[global]${RESET}`
                  : `${GRAY}[${skill.origin}]${RESET}`

        console.log(`  ${BOLD}/${skill.name}${RESET} ${originTag}`)
        console.log(`    ${GRAY}Path:${RESET} ${skill.entryFilePath}`)
        console.log(`    ${skill.metadata.description}`)
        if (skill.scripts.length > 0) {
            console.log(
                `    ${GRAY}Scripts (${skill.scripts.length}):${RESET} ${skill.scripts.map((s) => path.basename(s)).join(', ')}`
            )
        }
        console.log('')
    }
}

export async function handleSkillCreate(options: {
    name: string
    isGlobal?: boolean
    isLocal?: boolean
    workspaceDir?: string
    homeDir?: string
}): Promise<void> {
    const rawName = options.name?.trim()
    if (!validateSkillName(rawName)) {
        console.error(
            `Invalid skill name '${rawName}'. Names must contain only alphanumeric characters, dashes, and underscores.`
        )
        process.exitCode = 1
        return
    }

    const canonicalName = rawName.toLowerCase()
    const workspaceDir = options.workspaceDir || process.cwd()
    const homeDir = options.homeDir || os.homedir()

    // Default to global configuration unless --local is explicitly requested
    const targetBaseDir = options.isLocal
        ? resolveWorkspaceSkillsRoot(workspaceDir)
        : path.join(homeDir, '.config', 'december', 'skills')

    const skillDir = path.join(targetBaseDir, canonicalName)

    if (fs.existsSync(skillDir)) {
        console.error(`Skill '${canonicalName}' already exists at: ${skillDir}`)
        process.exitCode = 1
        return
    }

    await fsPromises.mkdir(path.join(skillDir, 'scripts'), { recursive: true })

    const starterSkillMd = `---
name: ${canonicalName}
description: >-
  Describe what this skill does and when the agent should use it. Use third-person.
  Example: "Use this skill when the user asks to perform tasks relating to ${canonicalName}."
---

# ${canonicalName}

Provide clear, step-by-step instructions for the agent to execute this runbook.

## Steps

1. Inspect the target environment and relevant files.
2. Execute necessary build or verification commands.
`

    await fsPromises.writeFile(path.join(skillDir, 'SKILL.md'), starterSkillMd, 'utf8')
    console.log(`Created skill '${canonicalName}' at:\n  ${skillDir}\n`)
}

export async function handleSkillInfo(options: {
    name: string
    workspaceDir?: string
    homeDir?: string
}): Promise<void> {
    const rawName = options.name?.trim()
    if (!rawName) {
        console.error('Please specify a skill name: december skill info <name>')
        process.exitCode = 1
        return
    }

    const engine = new SkillDiscoveryEngine({
        workspaceDir: options.workspaceDir || process.cwd(),
        homeDir: options.homeDir || os.homedir(),
    })

    const skills = engine.discoverAllSkills()
    const found = skills.find((s) => s.name.toLowerCase() === rawName.toLowerCase())

    if (!found) {
        console.error(`Skill '${rawName}' not found across workspace or global paths.`)
        process.exitCode = 1
        return
    }

    console.log(`\n${BOLD}Skill: ${found.name}${RESET} (${found.origin})`)
    console.log(`${GRAY}Location:${RESET}    ${found.entryFilePath}`)
    console.log(`${GRAY}Description:${RESET} ${found.metadata.description}`)
    if (found.metadata.argumentHint) {
        console.log(`${GRAY}Arguments:${RESET}   ${found.metadata.argumentHint}`)
    }
    if (found.metadata.license) {
        console.log(`${GRAY}License:${RESET}     ${found.metadata.license}`)
    }
    if (found.scripts.length > 0) {
        console.log(
            `${GRAY}Scripts:${RESET}     ${found.scripts.map((s) => path.basename(s)).join(', ')}`
        )
    }
    if (found.references.length > 0) {
        console.log(
            `${GRAY}References:${RESET}  ${found.references.map((r) => path.basename(r)).join(', ')}`
        )
    }

    try {
        const { body } = parseSkillFile(found.entryFilePath)
        console.log(`\n${BOLD}Runbook Instructions:${RESET}\n`)
        console.log(body)
        console.log('')
    } catch {
        // Intentionally swallowed: unreadable instructions body
    }
}

function parseGitSource(source: string): {
    repoUrl: string
    subpath?: string
    suggestedName?: string
} {
    const trimmed = source.trim()

    // Shorthand format: owner/repo or owner/repo/path/to/skill
    // e.g. mattpocock/skills/skills/engineering/tdd
    if (
        !trimmed.startsWith('http://') &&
        !trimmed.startsWith('https://') &&
        !trimmed.startsWith('git@')
    ) {
        const parts = trimmed.split('/')
        if (parts.length >= 2) {
            const owner = parts[0]
            const repo = parts[1]
            const repoUrl = `https://github.com/${owner}/${repo}.git`
            const subpath = parts.length > 2 ? parts.slice(2).join('/') : undefined
            const suggestedName = parts[parts.length - 1]
            return { repoUrl, subpath, suggestedName }
        }
    }

    // GitHub Web URL: e.g. https://github.com/owner/repo/tree/main/path/to/skill
    const ghTreeMatch = trimmed.match(
        /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/[^/]+\/(.+)$/
    )
    if (ghTreeMatch) {
        const owner = ghTreeMatch[1]
        const repo = ghTreeMatch[2]
        const subpath = ghTreeMatch[3]
        const repoUrl = `https://github.com/${owner}/${repo}.git`
        const parts = subpath.split('/')
        const suggestedName = parts[parts.length - 1]
        return { repoUrl, subpath, suggestedName }
    }

    // Direct git URL: https://github.com/owner/repo.git or https://github.com/owner/repo
    const cleanUrl = trimmed.endsWith('.git') ? trimmed : `${trimmed}.git`
    const repoName = path.basename(trimmed, '.git')
    return { repoUrl: cleanUrl, suggestedName: repoName }
}

export async function handleSkillAdd(options: {
    source: string
    isGlobal?: boolean
    isLocal?: boolean
    workspaceDir?: string
    homeDir?: string
    name?: string
}): Promise<void> {
    const source = options.source?.trim()
    if (!source) {
        console.error(
            'Please specify a source: december skill add <github-shorthand|url|local-path>'
        )
        process.exitCode = 1
        return
    }

    const workspaceDir = options.workspaceDir || process.cwd()
    const homeDir = options.homeDir || os.homedir()

    // Default to global configuration unless --local is explicitly requested
    const targetBaseDir = options.isLocal
        ? resolveWorkspaceSkillsRoot(workspaceDir)
        : path.join(homeDir, '.config', 'december', 'skills')

    // Option A: Local directory install
    if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
        const skillMd = path.join(source, 'SKILL.md')
        if (!fs.existsSync(skillMd)) {
            console.error(`Directory ${source} is not a valid skill: missing SKILL.md`)
            process.exitCode = 1
            return
        }

        const { metadata } = parseSkillFile(skillMd)
        const canonicalName = (options.name || metadata.name).toLowerCase()
        if (!validateSkillName(canonicalName)) {
            console.error(`Invalid skill name '${canonicalName}'.`)
            process.exitCode = 1
            return
        }

        const destDir = path.join(targetBaseDir, canonicalName)
        await fsPromises.mkdir(targetBaseDir, { recursive: true })
        await fsPromises.cp(source, destDir, { recursive: true })

        console.log(
            `Successfully installed skill '${canonicalName}' from local directory to:\n  ${destDir}\n`
        )
        return
    }

    // Option B: Remote Git install via sparse checkout
    const { repoUrl, subpath, suggestedName } = parseGitSource(source)
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'december-skill-add-'))

    try {
        console.log(`Fetching skill from ${repoUrl}...`)

        let extractedPath = tmpDir
        if (subpath) {
            try {
                // High efficiency sparse checkout
                await execFileAsync('git', [
                    'clone',
                    '--filter=blob:none',
                    '--no-checkout',
                    '--depth=1',
                    repoUrl,
                    tmpDir,
                ])
                await execFileAsync('git', ['sparse-checkout', 'init', '--cone'], { cwd: tmpDir })
                await execFileAsync('git', ['sparse-checkout', 'set', subpath], { cwd: tmpDir })
                await execFileAsync('git', ['checkout'], { cwd: tmpDir })
                extractedPath = path.join(tmpDir, subpath)
            } catch {
                // Fallback: shallow full clone if sparse checkout is unavailable
                await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {
                    // Intentionally swallowed: cleanup temporary directory
                })
                await fsPromises.mkdir(tmpDir, { recursive: true })
                await execFileAsync('git', ['clone', '--depth=1', repoUrl, tmpDir])
                extractedPath = path.join(tmpDir, subpath)
            }
        } else {
            await execFileAsync('git', ['clone', '--depth=1', repoUrl, tmpDir])
        }

        const skillMd = path.join(extractedPath, 'SKILL.md')
        if (!fs.existsSync(skillMd)) {
            console.error(
                `Skill entry file 'SKILL.md' not found in downloaded source (${extractedPath}).`
            )
            process.exitCode = 1
            return
        }

        const { metadata } = parseSkillFile(skillMd)
        const canonicalName = (
            options.name ||
            metadata.name ||
            suggestedName ||
            'skill'
        ).toLowerCase()
        if (!validateSkillName(canonicalName)) {
            console.error(`Invalid skill name '${canonicalName}'.`)
            process.exitCode = 1
            return
        }

        const destDir = path.join(targetBaseDir, canonicalName)
        await fsPromises.mkdir(targetBaseDir, { recursive: true })
        await fsPromises.cp(extractedPath, destDir, { recursive: true })

        console.log(
            `Successfully installed skill '${canonicalName}' from ${source} to:\n  ${destDir}\n`
        )
    } catch (err: any) {
        console.error(`Failed to install skill from ${source}: ${err.message || String(err)}`)
        process.exitCode = 1
    } finally {
        await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {
            // Intentionally swallowed: cleanup temporary directory
        })
    }
}

export async function handleSkillRemove(options: {
    name: string
    isGlobal?: boolean
    isLocal?: boolean
    workspaceDir?: string
    homeDir?: string
}): Promise<void> {
    const rawName = options.name?.trim()
    if (!validateSkillName(rawName)) {
        console.error(`Invalid skill name '${rawName}'.`)
        process.exitCode = 1
        return
    }

    const canonicalName = rawName.toLowerCase()
    const workspaceDir = options.workspaceDir || process.cwd()
    const homeDir = options.homeDir || os.homedir()

    const candidateRoots: string[] = []
    if (options.isLocal) {
        candidateRoots.push(
            path.join(workspaceDir, '.december', 'skills', canonicalName),
            path.join(workspaceDir, '.agents', 'skills', canonicalName),
            path.join(workspaceDir, '.agent', 'skills', canonicalName)
        )
    } else {
        candidateRoots.push(
            path.join(homeDir, '.config', 'december', 'skills', canonicalName),
            path.join(homeDir, '.gemini', 'config', 'skills', canonicalName),
            path.join(workspaceDir, '.december', 'skills', canonicalName),
            path.join(workspaceDir, '.agents', 'skills', canonicalName),
            path.join(workspaceDir, '.agent', 'skills', canonicalName)
        )
    }

    let removed = false
    for (const dir of candidateRoots) {
        if (fs.existsSync(dir)) {
            await fsPromises.rm(dir, { recursive: true, force: true })
            console.log(`Removed skill '${canonicalName}' from:\n  ${dir}\n`)
            removed = true
            break
        }
    }

    if (!removed) {
        console.error(`Skill '${canonicalName}' not found to remove.`)
        process.exitCode = 1
    }
}

export function printSkillHelp(): void {
    console.log(`
Usage: december skill <action> [options]

Actions:
  list              List all installed and active skills across workspace and global scopes
  create <name>     Scaffold a new skill directory with template SKILL.md and scripts/
  info <name>       Display full documentation, parameters, and scripts for a skill
  add <source>      Install a skill from GitHub shorthand (owner/repo/path), Git URL, or local dir
  remove <name>     Remove an installed skill from global or workspace directory

Options:
  --global, -g      Target user global configuration (~/.config/december/skills/) [default]
  --local, -l       Target local workspace (.agents/skills/ or .december/skills/)
  --help, -h        Show skill command help

Examples:
  december skill list
  december skill create docker-deploy
  december skill add mattpocock/skills/skills/engineering/tdd
  december skill info tdd
  december skill remove docker-deploy
`)
}

export async function handleSkillCommand(options: SkillCommandOptions): Promise<void> {
    const action = options.action?.toLowerCase().trim() || 'list'
    const target = options.target || (options.positionals && options.positionals[1])

    switch (action) {
        case 'list': {
            await handleSkillList({
                workspaceDir: options.workspaceDir || options.cwd,
                homeDir: options.homeDir,
            })
            break
        }
        case 'create': {
            if (!target) {
                console.error('Please specify a skill name: december skill create <name>')
                process.exitCode = 1
                return
            }
            await handleSkillCreate({
                name: target,
                isGlobal: options.isGlobal,
                isLocal: options.isLocal,
                workspaceDir: options.workspaceDir || options.cwd,
                homeDir: options.homeDir,
            })
            break
        }
        case 'info': {
            if (!target) {
                console.error('Please specify a skill name: december skill info <name>')
                process.exitCode = 1
                return
            }
            await handleSkillInfo({
                name: target,
                workspaceDir: options.workspaceDir || options.cwd,
                homeDir: options.homeDir,
            })
            break
        }
        case 'add': {
            if (!target) {
                console.error('Please specify a source: december skill add <source>')
                process.exitCode = 1
                return
            }
            await handleSkillAdd({
                source: target,
                isGlobal: options.isGlobal,
                isLocal: options.isLocal,
                workspaceDir: options.workspaceDir || options.cwd,
                homeDir: options.homeDir,
            })
            break
        }
        case 'remove':
        case 'rm':
        case 'delete': {
            if (!target) {
                console.error('Please specify a skill name: december skill remove <name>')
                process.exitCode = 1
                return
            }
            await handleSkillRemove({
                name: target,
                isGlobal: options.isGlobal,
                isLocal: options.isLocal,
                workspaceDir: options.workspaceDir || options.cwd,
                homeDir: options.homeDir,
            })
            break
        }
        case 'help':
        default: {
            printSkillHelp()
            break
        }
    }
}
