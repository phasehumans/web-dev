import { SkillDiscoveryEngine } from '@december/shared'

import { COMMANDS } from './commands'

import type { Command } from './types'

export function formatSingleLineDescription(desc: string, maxLen: number = 70): string {
    if (!desc) return ''
    const clean = desc
        .replace(/\r?\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    if (clean.length <= maxLen) return clean
    const sentenceEnd = clean.indexOf('. ')
    if (sentenceEnd > 15 && sentenceEnd <= maxLen) {
        return clean.slice(0, sentenceEnd + 1)
    }
    return clean.slice(0, maxLen - 1).trimEnd() + '…'
}

export function getAllAvailableCommands(workspaceDir: string = process.cwd()): Command[] {
    let skillItems: Command[] = []
    try {
        const engine = new SkillDiscoveryEngine({ workspaceDir })
        const skills = engine.discoverAllSkills()
        skillItems = skills.map((s) => ({
            name: s.name,
            description: formatSingleLineDescription(s.metadata.description),
            value: `/${s.name}`,
        }))
    } catch {
        // Intentionally swallowed: fallback when skills cannot be discovered
    }

    const skillNames = new Set(skillItems.map((c) => c.name.toLowerCase()))
    const filteredBuiltins = COMMANDS.filter((c) => !skillNames.has(c.name.toLowerCase()))
    return [...filteredBuiltins, ...skillItems]
}

export function getFilteredCommands(
    query: string,
    workspaceDir: string = process.cwd()
): Command[] {
    const all = getAllAvailableCommands(workspaceDir)
    if (query.length === 0) return all
    return all.filter((cmd) => cmd.name.toLowerCase().startsWith(query.toLowerCase()))
}
