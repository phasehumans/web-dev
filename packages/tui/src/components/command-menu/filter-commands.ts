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
            name: `skill:${s.name}`,
            description: formatSingleLineDescription(s.metadata.description),
            value: `/skill:${s.name}`,
        }))
    } catch {
        // Intentionally swallowed: fallback when skills cannot be discovered
    }

    // Core built-in commands (e.g. /handoff) always take precedence and are never overwritten
    return [...COMMANDS, ...skillItems]
}

export function getFilteredCommands(
    query: string,
    workspaceDir: string = process.cwd()
): Command[] {
    const all = getAllAvailableCommands(workspaceDir)
    if (query.length === 0) return all

    const cleanQuery = query.toLowerCase()
    return all.filter((cmd) => {
        const name = cmd.name.toLowerCase()
        if (name.startsWith(cleanQuery)) return true
        // If user typed query without "skill:" prefix, also match against the skill name (e.g. "tdd" matches "skill:tdd")
        if (name.startsWith('skill:') && name.slice('skill:'.length).startsWith(cleanQuery)) {
            return true
        }
        return false
    })
}
