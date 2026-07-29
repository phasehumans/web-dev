import { execSync, exec, spawn } from 'child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { writeToClipboard } from '../../utils/clipboard'

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
            try {
                const configPath = path.join(os.homedir(), '.config', 'december', 'config.json')
                let config: any = {}
                try {
                    if (fs.existsSync(configPath)) {
                        config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                    }
                } catch {
                    // Ignore unreadable config file
                }

                if (!config.decemberToken) {
                    ctx.toast.show({
                        variant: 'error',
                        message: 'You must be logged in to use handoff.',
                    })
                    return
                }

                ctx.toast.show({ variant: 'info', message: 'Zipping workspace...' })

                const archivePath = '.december-handoff.tar.gz'
                const excludes = [
                    '--exclude=node_modules',
                    '--exclude=.git',
                    `--exclude=${archivePath}`,
                ]
                try {
                    if (fs.existsSync('.gitignore')) {
                        const lines = fs.readFileSync('.gitignore', 'utf8').split('\n')
                        for (const line of lines) {
                            const t = line.trim()
                            if (t && !t.startsWith('#'))
                                excludes.push(`--exclude=${t.endsWith('/') ? t.slice(0, -1) : t}`)
                        }
                    }
                    if (fs.existsSync('.decemberignore')) {
                        const lines = fs.readFileSync('.decemberignore', 'utf8').split('\n')
                        for (const line of lines) {
                            const t = line.trim()
                            if (t && !t.startsWith('#'))
                                excludes.push(`--exclude=${t.endsWith('/') ? t.slice(0, -1) : t}`)
                        }
                    }
                } catch {
                    // Ignore unreadable ignore files
                }

                const excludeArgs = excludes.join(' ')
                try {
                    execSync(`tar -czf ${archivePath} ${excludeArgs} .`, { stdio: 'ignore' })
                } catch (e: any) {
                    if (e.status !== 1) throw e
                }

                ctx.toast.show({ variant: 'info', message: 'Requesting upload URL...' })

                const serverUrl = process.env.DECEMBER_SERVER_URL || 'https://api.trydecember.com'
                const proxyUrl = `${serverUrl}/api/v1`
                const urlRes = await fetch(`${proxyUrl}/cli/handoff/upload-url`, {
                    headers: { Authorization: `Bearer ${config.decemberToken}` },
                })
                if (!urlRes.ok) throw new Error(await urlRes.text())
                const { uploadUrl, objectKey } = (await urlRes.json()) as any

                ctx.toast.show({ variant: 'info', message: 'Uploading to MinIO...' })

                const fileData = fs.readFileSync(archivePath)
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

                fs.unlinkSync(archivePath)

                ctx.toast.show({ variant: 'success', message: 'Handoff complete! Exiting in 3s.' })

                setTimeout(() => ctx.exit(), 3000)
            } catch (e: any) {
                ctx.toast.show({ variant: 'error', message: `Handoff failed: ${e.message}` })
            }
        },
    },

    {
        name: 'init',
        description: 'Create a .december folder with initial rules, skills, and configuration',
        value: '/init',
        action: (ctx) => {
            try {
                const rootDir = process.cwd()
                const decDir = path.join(rootDir, '.december')

                if (fs.existsSync(decDir)) {
                    ctx.toast.show({ message: 'December workspace is already initialized.' })
                    return
                }

                fs.mkdirSync(decDir, { recursive: true })

                const agentsFile = path.join(decDir, 'AGENTS.md')
                const rulesFile = path.join(decDir, 'rules.md')
                const skillsFile = path.join(decDir, 'skills.md')
                const mcpFile = path.join(decDir, 'mcp.json')

                fs.writeFileSync(agentsFile, '# AGENTS.md\n')
                fs.writeFileSync(rulesFile, '# Rules\n')
                fs.writeFileSync(skillsFile, '# Skills\n')

                fs.writeFileSync(
                    mcpFile,
                    '{\n  "mcpServers": {\n    // Add your Model Context Protocol (MCP) servers here\n    // "example-server": {\n    //   "command": "node",\n    //   "args": ["path/to/server.js"]\n    // }\n  }\n}\n'
                )

                ctx.toast.show({
                    variant: 'success',
                    message: 'Initialized December workspace successfully!',
                })
            } catch (err) {
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
        action: (ctx) => {
            ctx.toast.show({ message: 'Opening browser to sign in...' })
        },
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
        description: 'Switch to plan mode',
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
            ctx.toast.show({ message: 'Updating CLI... The app will automatically restart.' })
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

                console.clear()

                const child = spawn(process.argv[0], process.argv.slice(1), {
                    stdio: 'inherit',
                    detached: true,
                })
                child.unref()
                ctx.exit()
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
