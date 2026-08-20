import { Tool, ToolExecuteContext } from '@december/shared'
import { Type, Static } from '@sinclair/typebox'

const writeSchema = Type.Object({
    filePath: Type.String({ description: 'The relative or absolute path to the file.' }),
    content: Type.String({ description: 'The complete file contents to write.' }),
})

export type WriteFileInput = Static<typeof writeSchema>

export const WriteFileTool: Tool<WriteFileInput> = {
    name: 'write_file',
    description:
        'Creates a new file or completely overwrites an existing file with the provided content. Note: For modifying existing files, always use edit_file or edit_diff instead to prevent token limit truncation and preserve untouched lines.',
    inputSchema: writeSchema,
    execute: async ({ filePath, content }, context: ToolExecuteContext) => {
        try {
            await context.operations.fs.writeFile(filePath, content)
            return `Successfully wrote to ${filePath}`
        } catch (e: any) {
            return `Failed to write file: ${e.message}`
        }
    },
}
