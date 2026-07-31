import { describe, expect, test, mock } from 'bun:test'

import { COMMANDS } from '../../src/components/command-menu/commands'

describe('/update command action', () => {
    test('should execute npm update without clearing console or exiting process', async () => {
        const updateCmd = COMMANDS.find((c) => c.name === 'update')
        expect(updateCmd).toBeDefined()

        const toastMessages: any[] = []
        let consoleCleared = false
        let exitCalled = false

        const originalClear = console.clear
        console.clear = () => {
            consoleCleared = true
        }

        try {
            const mockContext: any = {
                toast: {
                    show: (msg: any) => toastMessages.push(msg),
                },
                agent: {
                    saveContext: mock(async () => {}),
                },
                exit: () => {
                    exitCalled = true
                },
            }

            updateCmd?.action(mockContext)

            expect(toastMessages[0]).toEqual({ message: 'Updating CLI...' })
            expect(consoleCleared).toBe(false)
            expect(exitCalled).toBe(false)
        } finally {
            console.clear = originalClear
        }
    })
})

describe('/init command action', () => {
    test('scaffolds AGENTS.md in root and rules/skills in .december without headings', async () => {
        const fs = await import('node:fs')
        const path = await import('node:path')
        const os = await import('node:os')

        const initCmd = COMMANDS.find((c) => c.name === 'init')
        expect(initCmd).toBeDefined()

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tui-init-test-'))
        const originalCwd = process.cwd()

        try {
            process.chdir(tmpDir)

            const toastMessages: any[] = []
            const mockContext: any = {
                toast: {
                    show: (msg: any) => toastMessages.push(msg),
                },
            }

            initCmd?.action(mockContext)

            const agentsFile = path.join(tmpDir, 'AGENTS.md')
            const rulesFile = path.join(tmpDir, '.december', 'rules.md')
            const skillsFile = path.join(tmpDir, '.december', 'skills.md')

            expect(fs.existsSync(agentsFile)).toBe(true)
            expect(fs.readFileSync(agentsFile, 'utf8')).toBe('')

            expect(fs.existsSync(rulesFile)).toBe(true)
            const rulesContent = fs.readFileSync(rulesFile, 'utf8')
            expect(rulesContent).not.toContain('#')
            expect(rulesContent).toBe('Add rules in this file for the agent to use as context.\n')

            expect(fs.existsSync(skillsFile)).toBe(true)
            const skillsContent = fs.readFileSync(skillsFile, 'utf8')
            expect(skillsContent).not.toContain('#')
            expect(skillsContent).toBe('Add skills in this file for the agent to use as context.\n')

            expect(toastMessages[0]).toEqual({
                variant: 'success',
                message: 'Initialized December workspace successfully!',
            })

            // Second invocation
            toastMessages.length = 0
            initCmd?.action(mockContext)
            expect(toastMessages[0]).toEqual({
                message: 'December workspace is already initialized.',
            })
        } finally {
            process.chdir(originalCwd)
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
