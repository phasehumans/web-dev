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
