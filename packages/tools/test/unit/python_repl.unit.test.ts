import { describe, expect, test } from 'bun:test'

import { PythonReplTool } from '../../src/python_repl'
import { createMockContext } from '../mock-context'

describe('PythonReplTool (Unit)', () => {
    test('should execute python code snippet and return output', async () => {
        const context = createMockContext()

        const result = await PythonReplTool.execute(
            { code: 'a = 10\nb = 20\nprint(a + b)' },
            context
        )

        expect(result).toBe('30')
    })

    test('should maintain state across consecutive REPL executions', async () => {
        const context = createMockContext()

        await PythonReplTool.execute({ code: 'x = 42' }, context)
        const result = await PythonReplTool.execute({ code: 'print(x * 2)' }, context)

        expect(result).toBe('84')
    })

    test('should reset REPL session state when reset is true', async () => {
        const context = createMockContext()

        await PythonReplTool.execute({ code: 'temp_var = "hello"' }, context)
        await PythonReplTool.execute({ code: '', reset: true }, context)

        const result = await PythonReplTool.execute(
            {
                code: 'try:\n    print(temp_var)\nexcept NameError:\n    print("variable not found")',
            },
            context
        )

        expect(result).toBe('variable not found')
    })
})
