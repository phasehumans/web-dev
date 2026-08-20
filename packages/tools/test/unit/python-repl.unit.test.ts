import { describe, expect, it } from 'bun:test'

import { PythonReplTool } from '../../src/python_repl'
import { createMockContext } from '../mock-context'

describe('Python REPL Tool (Unit)', () => {
    it('has valid tool metadata and TypeBox input schema', () => {
        expect(PythonReplTool.name).toBe('python_repl')
        expect(PythonReplTool.description).toContain('REPL')
        expect(PythonReplTool.inputSchema).toBeDefined()
    })

    it('handles reset flag when code is empty', async () => {
        const context = createMockContext()
        const result = await PythonReplTool.execute({ code: '', reset: true }, context)
        expect(result).toBe('Python REPL session reset successfully.')
    })
})
