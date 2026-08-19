import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { CommandMenu } from '../../src/components/command-menu'
import { COMMANDS } from '../../src/components/command-menu/commands'
import {
    getFilteredCommands,
    getAllAvailableCommands,
} from '../../src/components/command-menu/filter-commands'
import { useCommandMenu } from '../../src/components/command-menu/use-command-menu'
import { KeyboardLayerProvider } from '../../src/providers/keyboard-layer'

function CommandInputHarness({ onAutocomplete }: { onAutocomplete?: (text: string) => void }) {
    const {
        showCommandMenu,
        commandQuery,
        selectedIndex,
        windowStart,
        handleContentChange,
        setSelectedIndex,
    } = useCommandMenu({ onAutocomplete })

    return (
        <>
            {showCommandMenu && (
                <CommandMenu
                    query={commandQuery}
                    selectedIndex={selectedIndex}
                    windowStart={windowStart}
                    totalFiltered={1}
                    onSelect={setSelectedIndex}
                    onExecute={() => {}}
                />
            )}
            <TestTrigger onTrigger={() => handleContentChange('/pl')} />
        </>
    )
}

function TestTrigger({ onTrigger }: { onTrigger: () => void }) {
    React.useLayoutEffect(() => {
        onTrigger()
    }, [onTrigger])
    return null
}

describe('CommandMenu Component (Unit)', () => {
    it('registers /plan slash command', () => {
        const planCmd = COMMANDS.find((c) => c.name === 'plan')
        expect(planCmd).toBeDefined()
        expect(planCmd?.value).toBe('/plan')
    })

    it('registers /mcp slash command', () => {
        const mcpCmd = COMMANDS.find((c) => c.name === 'mcp')
        expect(mcpCmd).toBeDefined()
        expect(mcpCmd?.value).toBe('/mcp')
        expect(mcpCmd?.description).toContain('Model Context Protocol')
    })

    it('autocompletes highlighted command on Tab keypress', () => {
        const onAutocomplete = mock()
        const { stdin } = render(
            <KeyboardLayerProvider>
                <CommandInputHarness onAutocomplete={onAutocomplete} />
            </KeyboardLayerProvider>
        )

        stdin.write('\t')
        expect(onAutocomplete).toHaveBeenCalledWith('/plan ')
    })

    it('filters commands including dynamically loaded custom commands', () => {
        const all = getAllAvailableCommands()
        expect(all.some((c: any) => c.name === 'plan')).toBe(true)

        const filtered = getFilteredCommands('pl')
        expect(filtered.some((c: any) => c.name === 'plan')).toBe(true)
    })
})
