import { Tool, ToolExecuteContext } from '@december/shared'
import { Type, Static } from '@sinclair/typebox'

const editSchema = Type.Object({
    path: Type.String(),
    targetContent: Type.String(),
    replacementContent: Type.String(),
})

export type EditFileInput = Static<typeof editSchema>

export const EditFileTool: Tool<EditFileInput> = {
    name: 'edit_file',
    description:
        'Edits an existing file by searching for a specific block of text (targetContent) and replacing it with replacementContent. Preserves unchanged lines.',
    inputSchema: editSchema,
    execute: async ({ path, targetContent, replacementContent }, context: ToolExecuteContext) => {
        try {
            const content = await context.operations.fs.readFile(path)
            if (content.includes(targetContent)) {
                const updated = content.replace(targetContent, replacementContent)
                await context.operations.fs.writeFile(path, updated)
                return `Successfully edited file: ${path}`
            }

            // Fallback: line-by-line whitespace-trimmed matching
            const contentLines = content.replace(/\r\n/g, '\n').split('\n')
            const targetLines = targetContent
                .replace(/\r\n/g, '\n')
                .split('\n')
                .map((l) => l.trimEnd())

            if (targetLines.length > 0) {
                const targetLen = targetLines.length
                for (let i = 0; i <= contentLines.length - targetLen; i++) {
                    let match = true
                    for (let j = 0; j < targetLen; j++) {
                        const line = contentLines[i + j]
                        if (!line || line.trimEnd() !== targetLines[j]) {
                            match = false
                            break
                        }
                    }
                    if (match) {
                        const originalLines = content.split(/\r?\n/)
                        originalLines.splice(i, targetLen, ...replacementContent.split(/\r?\n/))
                        const updated = originalLines.join('\n')
                        await context.operations.fs.writeFile(path, updated)
                        return `Successfully edited file (matched with normalized whitespace): ${path}`
                    }
                }
            }

            return `Error: targetContent not found in file '${path}'. Ensure line breaks and indentation match, or view the file using read_file.`
        } catch (error: any) {
            return `Failed to edit file: ${error.message}`
        }
    },
}
