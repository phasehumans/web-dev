import { Tool, ToolExecuteContext } from '@december/shared'
import { Type, Static } from '@sinclair/typebox'
import { applyPatch } from 'diff'

import { patchFuzzyNative } from './native/myers_patcher'

const diffSchema = Type.Object({
    path: Type.String(),
    diff: Type.String({ description: 'The unified diff patch string.' }),
})

export type EditDiffInput = Static<typeof diffSchema>

export const EditDiffTool: Tool<EditDiffInput> = {
    name: 'edit_diff',
    description:
        'Edits an existing file by applying a unified diff patch. Use standard unified diff format. This is the preferred way to refactor files.',
    inputSchema: diffSchema,
    execute: async ({ path, diff }, context: ToolExecuteContext) => {
        try {
            const content = await context.operations.fs.readFile(path)

            let formattedDiff = diff.replace(/\r\n/g, '\n')
            if (!formattedDiff.startsWith('--- ')) {
                formattedDiff = `--- a/${path}\n+++ b/${path}\n` + formattedDiff
            }

            const normalizedContent = content.replace(/\r\n/g, '\n')

            // Try native C++ Myers fuzzy patcher first
            let updated: string | boolean | null = patchFuzzyNative(
                normalizedContent,
                formattedDiff
            )

            // Fall back to JS diff applyPatch if native patching is unavailable or fails
            if (updated === null) {
                updated = applyPatch(normalizedContent, formattedDiff)
            }

            if (updated === false || updated === null) {
                return `Error: Failed to apply unified diff patch to '${path}'. Ensure context lines match the existing file exactly, or use edit_file instead.`
            }

            await context.operations.fs.writeFile(path, updated)
            return `Successfully patched file: ${path}`
        } catch (error: any) {
            return `Failed to patch file: ${error.message}`
        }
    },
}
