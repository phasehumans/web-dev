import { exec } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { writeToClipboard } from '../../utils/clipboard'
import { createWorkspaceArchive } from '../../utils/handoff'

import type { Command } from './types'

export const COMMANDS: Command[] = [
    {
        name: 'context',
        description: 'Visualize current context usage',
        value: '/context',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'copy',
        description: 'Copy the last planner response to the clipboard',
        value: '/copy',
        action: (ctx) => {
            if (ctx.agent && ctx.agent.messages.length > 0) {
                try {
                    const plannerMessages = ctx.agent.messages.filter((m) => m.role === 'assistant')
                    const lastMsg =
                        plannerMessages.length > 0
                            ? plannerMessages[plannerMessages.length - 1]
                            : null
                    if (lastMsg && lastMsg.content) {
                        writeToClipboard(lastMsg.content)
                        ctx.toast.show({
                            variant: 'success',
                            message: 'Copied last planner response to clipboard!',
                        })
                    } else {
                        ctx.toast.show({
                            variant: 'error',
                            message: 'No planner response found to copy.',
                        })
                    }
                } catch (e) {
                    ctx.toast.show({ variant: 'error', message: 'Failed to write to clipboard.' })
                }
            } else {
                ctx.toast.show({ variant: 'error', message: 'Nothing to copy.' })
            }
        },
    },
    {
        name: 'exit',
        description: 'Exit the CLI',
        value: '/exit',
        action: (ctx) => {
            ctx.exit()
        },
    },
    {
        name: 'feedback',
        description: 'Submit feedback, report a bug, or request a feature',
        value: '/feedback',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'fork',
        description: 'Create a branch of the current conversation at this point',
        value: '/fork',
        action: async (ctx) => {
            if (ctx.agent) {
                const newId = await ctx.agent.forkContext()
                ctx.toast.show({ variant: 'success', message: `Forked to new session: ${newId}` })
            }
        },
    },
    {
        name: 'grill-me',
        description: 'Interview me to align on a plan',
        value: '/grill-me',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'handoff',
        description: 'Hand off a task to a remote December session (cloud)',
        value: '/handoff',
        action: async (ctx) => {
            const archivePath = '.december-handoff.tar.gz'
            try {
                const configPath = path.join(os.homedir(), '.config', 'december', 'config.json')
                let config: any = {}
                try {
                    if (fs.existsSync(configPath)) {
                        config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                    }
                } catch {
                    // Intentionally swallowed: unreadable config file fallback
                }

                if (!config.decemberToken) {
                    ctx.toast.show({
                        variant: 'error',
                        message: 'You must be logged in to use handoff.',
                    })
                    return
                }

                ctx.toast.show({ variant: 'info', message: 'Zipping workspace...' })

                await createWorkspaceArchive(archivePath)

                ctx.toast.show({ variant: 'info', message: 'Requesting upload URL...' })

                const serverUrl = process.env.SERVER_URL || 'https://api.trydecember.com'
                const proxyUrl = `${serverUrl}/api/v1`
                const urlRes = await fetch(`${proxyUrl}/cli/handoff/upload-url`, {
                    headers: { Authorization: `Bearer ${config.decemberToken}` },
                })
                const urlJson = (await urlRes.json()) as any
                const { uploadUrl, objectKey } = urlJson.data || urlJson

                ctx.toast.show({ variant: 'info', message: 'Uploading to MinIO...' })

                const fileData = await fs.promises.readFile(archivePath)
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: fileData,
                })
                if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`)

                ctx.toast.show({ variant: 'info', message: 'Completing handoff...' })

                const sessionRes = await fetch(`${proxyUrl}/cli/handoff/complete`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.decemberToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: 'Handoff from ' + process.cwd().split('/').pop(),
                        messages: ctx.agent ? ctx.agent.messages : [],
                        objectKey,
                    }),
                })
                if (!sessionRes.ok) throw new Error(await sessionRes.text())

                await fs.promises.unlink(archivePath).catch(() => {})

                ctx.toast.show({ variant: 'success', message: 'Handoff complete! Exiting in 3s.' })

                setTimeout(() => ctx.exit(), 3000)
            } catch (e: any) {
                await fs.promises.unlink(archivePath).catch(() => {})
                ctx.toast.show({ variant: 'error', message: `Handoff failed: ${e.message}` })
            }
        },
    },
    {
        name: 'init',
        description: 'Create initial configuration, rules, skills, and .decemberignore',
        value: '/init',
        action: (ctx) => {
            try {
                const rootDir = process.cwd()
                const decDir = path.join(rootDir, '.december')

                const agentsFile = path.join(rootDir, 'AGENTS.md')
                const ignoreFile = path.join(rootDir, '.decemberignore')
                const rulesFile = path.join(decDir, 'rules.md')
                const skillsFile = path.join(decDir, 'skills.md')
                const commandsFile = path.join(decDir, 'commands.json')
                const mcpFile = path.join(decDir, 'mcp.json')
                const settingsFile = path.join(decDir, 'settings.json')

                if (
                    fs.existsSync(agentsFile) &&
                    fs.existsSync(ignoreFile) &&
                    fs.existsSync(rulesFile) &&
                    fs.existsSync(skillsFile) &&
                    fs.existsSync(commandsFile) &&
                    fs.existsSync(mcpFile) &&
                    fs.existsSync(settingsFile)
                ) {
                    ctx.toast.show({ message: 'December workspace is already initialized.' })
                    return
                }

                fs.mkdirSync(decDir, { recursive: true })

                if (!fs.existsSync(agentsFile)) {
                    fs.writeFileSync(
                        agentsFile,
                        '# Agent Guidelines & Project Instructions\n\nAdd project-specific guidelines, testing commands, architecture patterns, and conventions in this file for December to follow.\n'
                    )
                }
                if (!fs.existsSync(ignoreFile)) {
                    fs.writeFileSync(
                        ignoreFile,
                        `# Build outputs and dependencies\nnode_modules/\ndist/\nbuild/\n.next/\n.turbo/\n*.log\n\n# Environment and secrets\n.env*\n*.pem\n*.key\n`
                    )
                }
                if (!fs.existsSync(rulesFile)) {
                    fs.writeFileSync(
                        rulesFile,
                        'Add rules in this file for the agent to use as context.\n'
                    )
                }
                if (!fs.existsSync(skillsFile)) {
                    fs.writeFileSync(
                        skillsFile,
                        'Add skills in this file for the agent to use as context.\n'
                    )
                }
                if (!fs.existsSync(commandsFile)) {
                    fs.writeFileSync(
                        commandsFile,
                        JSON.stringify(
                            {
                                commands: [
                                    {
                                        name: 'test',
                                        description: 'Run tests and fix failures',
                                        prompt: "Run 'bun test $PKG'. If any test fails, fix the root cause and verify.",
                                    },
                                    {
                                        name: 'lint',
                                        description: 'Run linter and fix errors',
                                        prompt: 'Run linter and fix any reported issues in $FILE.',
                                    },
                                    {
                                        name: 'commit',
                                        description: 'Create conventional git commit',
                                        prompt: 'Inspect git status and staged changes, then create a clean git commit adhering strictly to lowercase conventional commits.',
                                    },
                                ],
                            },
                            null,
                            2
                        ) + '\n'
                    )
                }
                if (!fs.existsSync(mcpFile)) {
                    fs.writeFileSync(
                        mcpFile,
                        JSON.stringify(
                            {
                                mcpServers: {},
                            },
                            null,
                            2
                        ) + '\n'
                    )
                }
                if (!fs.existsSync(settingsFile)) {
                    fs.writeFileSync(
                        settingsFile,
                        JSON.stringify(
                            {
                                thinkingLevel: 'low',
                                steeringMode: 'all',
                                toolPermission: 'always-ask',
                                pathGuard: true,
                            },
                            null,
                            2
                        ) + '\n'
                    )
                }

                ctx.toast.show({
                    variant: 'success',
                    message: 'Initialized December workspace successfully!',
                })
            } catch {
                ctx.toast.show({
                    variant: 'error',
                    message: 'Failed to initialize December workspace',
                })
            }
        },
    },
    {
        name: 'login',
        description: 'Configure API keys or Connect via December Cloud',
        value: '/login',
        action: () => {},
    },
    {
        name: 'logout',
        description: 'Clear stored credentials',
        value: '/logout',
        action: (ctx) => {
            ctx.toast.show({ variant: 'success', message: 'Signed out' })
        },
    },
    {
        name: 'mcp',
        description: 'Manage Model Context Protocol (MCP) servers and tools',
        value: '/mcp',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'model',
        description: 'Select a model',
        value: '/model',
        action: (ctx) => {
            ctx.toast.show({ message: 'Use arrow keys to select a model.' })
        },
    },
    {
        name: 'new',
        description: 'Start a new conversation',
        value: '/new',
        action: async (ctx) => {
            if (ctx.agent) {
                await ctx.agent.newContext()
                ctx.resetChat?.()
                ctx.toast.show({ variant: 'success', message: 'Started a new conversation.' })
            }
        },
    },
    {
        name: 'plan',
        description: 'Generate a step-by-step implementation plan',
        value: '/plan',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'resume',
        description: 'Browse and resume past conversations',
        value: '/resume',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'settings',
        description: 'Open settings',
        value: '/settings',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'tasks',
        description: 'View background tasks',
        value: '/tasks',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
    {
        name: 'update',
        description: 'Update to the latest version',
        value: '/update',
        action: (ctx) => {
            ctx.toast.show({ message: 'Updating CLI...' })
            exec('npm install -g @trydecember/cli', async (err) => {
                if (err) {
                    ctx.toast.show({
                        variant: 'error',
                        message: 'Update failed. Check your npm logs.',
                    })
                    return
                }

                if (ctx.agent) {
                    await ctx.agent.saveContext()
                }

                if (ctx.onUpdateSuccess) {
                    await ctx.onUpdateSuccess()
                }

                ctx.toast.show({
                    variant: 'success',
                    message:
                        'December CLI updated successfully! Please restart the CLI in your terminal.',
                })
            })
        },
    },
    {
        name: 'usage',
        description: 'View quota usage',
        value: '/usage',
        action: (ctx) => {
            // forwarded to chat screen
        },
    },
]
