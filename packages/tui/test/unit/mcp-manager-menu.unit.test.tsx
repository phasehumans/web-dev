import { describe, expect, it, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { McpManagerMenu } from '../../src/components/menus/mcp-manager-menu'

describe('McpManagerMenu Component (Unit)', () => {
    it('renders empty state when no MCP servers are configured', () => {
        const { lastFrame } = render(
            <McpManagerMenu mcpServerInfos={[]} setAuthMode={mock(() => {})} />
        )

        expect(lastFrame()).toContain('MCP Server Manager')
        expect(lastFrame()).toContain('No MCP servers configured')
    })

    it('renders server list with connection badges and tools', () => {
        const mockServers = [
            {
                name: 'github',
                status: 'connected',
                config: { command: 'npx', autoApprove: ['create_issue'] },
                tools: [
                    { name: 'create_issue', description: 'Create a new GitHub issue' },
                    { name: 'list_repos', description: 'List repositories' },
                ],
            },
            {
                name: 'broken_db',
                status: 'failed',
                error: 'Connection refused on port 5432',
                config: { command: 'uvx' },
                tools: [],
            },
            {
                name: 'local_notes',
                status: 'disabled',
                config: { command: 'npx', disabled: true },
                tools: [],
            },
        ]

        const { lastFrame } = render(
            <McpManagerMenu mcpServerInfos={mockServers as any} setAuthMode={mock(() => {})} />
        )

        expect(lastFrame()).toContain('MCP Server Manager')
        expect(lastFrame()).toContain('github')
        expect(lastFrame()).toContain('[connected]')
        expect(lastFrame()).toContain('broken_db')
        expect(lastFrame()).toContain('[failed]')
        expect(lastFrame()).toContain('local_notes')
        expect(lastFrame()).toContain('[disabled]')
        expect(lastFrame()).toContain('create_issue')
        expect(lastFrame()).toContain('Create a new GitHub issue')
    })

    it('navigates to Preset Catalog when pressing "a"', async () => {
        const { lastFrame, stdin } = render(
            <McpManagerMenu mcpServerInfos={[]} setAuthMode={mock(() => {})} />
        )

        stdin.write('a')
        await new Promise((r) => setTimeout(r, 50))

        const output = lastFrame() || ''
        expect(output).toContain('MCP Preset Catalog')
        expect(output).toContain('GitHub')
        expect(output).toContain('PostgreSQL')
        expect(output).toContain('SQLite')
        expect(output).toContain('Brave Search')
    })

    it('shows confirmation screen when pressing "x"', async () => {
        const mockServers = [
            {
                name: 'to_delete',
                status: 'connected',
                config: { command: 'node' },
                tools: [],
            },
        ]
        const { lastFrame, stdin } = render(
            <McpManagerMenu mcpServerInfos={mockServers as any} setAuthMode={mock(() => {})} />
        )

        stdin.write('x')
        await new Promise((r) => setTimeout(r, 50))

        const output = lastFrame() || ''
        expect(output).toContain('Remove MCP Server')
        expect(output).toContain('Are you sure you want to remove server "to_delete"')
    })
})
