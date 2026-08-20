import { loadCustomCommands } from '@december/shared'

import { COMMANDS } from './commands'

import type { Command } from './types'

export function getAllAvailableCommands(): Command[] {
    const custom = loadCustomCommands()
    const customCommandItems: Command[] = custom.map((c) => ({
        name: c.name,
        description: c.description,
        value: `/${c.name}`,
    }))

    const customNames = new Set(customCommandItems.map((c) => c.name.toLowerCase()))
    const filteredBuiltins = COMMANDS.filter((c) => !customNames.has(c.name.toLowerCase()))
    return [...filteredBuiltins, ...customCommandItems]
}

export function getFilteredCommands(query: string): Command[] {
    const all = getAllAvailableCommands()
    if (query.length === 0) return all
    return all.filter((cmd) => cmd.name.toLowerCase().startsWith(query.toLowerCase()))
}
