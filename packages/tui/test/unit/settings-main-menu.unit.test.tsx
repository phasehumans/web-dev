import { describe, expect, it, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { SettingsMainMenu } from '../../src/components/menus/settings-main-menu'

describe('SettingsMainMenu Component (Unit)', () => {
    it('renders MCP Servers entry point', () => {
        const { lastFrame } = render(
            <SettingsMainMenu
                settingsNonWorkspace={false}
                settingsToolPermission="always-proceed"
                settingsThinkingLevel="auto"
                settingsSteeringMode="all"
                settingsFollowUpMode="all"
                handleSettingsMainSelect={mock(() => {})}
            />
        )

        expect(lastFrame()).toContain('Settings')
        expect(lastFrame()).toContain('PathGuard Protection')
        expect(lastFrame()).toContain('MCP Servers')
        expect(lastFrame()).toContain('[Configure]')
    })

    it('renders Monorepo Scope when settingsScope is provided', () => {
        const { lastFrame } = render(
            <SettingsMainMenu
                settingsNonWorkspace={false}
                settingsToolPermission="always-ask"
                settingsThinkingLevel="auto"
                settingsSteeringMode="all"
                settingsFollowUpMode="all"
                settingsPathGuard={true}
                settingsScope="packages/agent"
                handleSettingsMainSelect={mock(() => {})}
            />
        )

        expect(lastFrame()).toContain('Monorepo Scope')
        expect(lastFrame()).toContain('packages/agent')
    })
})
