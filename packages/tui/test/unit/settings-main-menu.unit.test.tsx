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
        expect(lastFrame()).toContain('MCP Servers')
        expect(lastFrame()).toContain('[Configure]')
    })
})
