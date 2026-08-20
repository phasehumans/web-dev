import { Tool, truncateOutput, ToolExecuteContext } from '@december/shared'
import { Type, Static } from '@sinclair/typebox'

const readSchema = Type.Object({
    path: Type.String({ description: 'The file path to read.' }),
    startLine: Type.Optional(Type.Number({ description: 'Optional start line' })),
    endLine: Type.Optional(Type.Number({ description: 'Optional end line' })),
    noTruncate: Type.Optional(Type.Boolean({ description: 'Avoid truncating the output' })),
})

export type ReadFileInput = Static<typeof readSchema>

export const MAX_READ_FILE_BYTES = 500 * 1024 // 500 KB
export const MAX_READ_FILE_LINES = 2000

export const ReadFileTool: Tool<ReadFileInput> = {
    name: 'read_file',
    description:
        'Reads the contents of a file. Automatically truncates and summarizes massive files exceeding 500 KB or 2,000 lines to protect context limits. Use noTruncate: true if you absolutely need the full file for AST rewriting, or use startLine/endLine for pagination.',
    inputSchema: readSchema,
    execute: async ({ path, startLine, endLine, noTruncate }, context: ToolExecuteContext) => {
        try {
            const content = await context.operations.fs.readFile(path)
            const lines = content.split('\n')
            const totalBytes = Buffer.byteLength(content, 'utf8')

            // If file exceeds size limits and no pagination is requested, return header/footer snippets
            if (
                !startLine &&
                !endLine &&
                !noTruncate &&
                (totalBytes > MAX_READ_FILE_BYTES || lines.length > MAX_READ_FILE_LINES)
            ) {
                const snippetLines = 50
                const head = lines.slice(0, snippetLines)
                const tail = lines.slice(-snippetLines)
                const omittedLines = lines.length - snippetLines * 2
                const omittedBytes =
                    totalBytes - Buffer.byteLength(head.join('\n') + '\n' + tail.join('\n'), 'utf8')
                const omittedKb = (omittedBytes / 1024).toFixed(1)

                return `File exceeds size limit (500 KB / 2,000 lines). Showing header and footer snippets. Use 'startLine' and 'endLine' parameters or grep_search for targeted queries.\n\n--- Header Snippet (first ${snippetLines} lines) ---\n${head.join('\n')}\n\n<... ${omittedLines} lines (${omittedKb} KB) omitted ...>\n\n--- Footer Snippet (last ${snippetLines} lines) ---\n${tail.join('\n')}`
            }

            const start = startLine ? Math.max(0, startLine - 1) : 0
            const end = endLine ? Math.min(lines.length, endLine) : lines.length

            const slice = lines.slice(start, end).join('\n')

            if (noTruncate) {
                return slice
            }

            const result = truncateOutput(slice)
            return result.text
        } catch (error: any) {
            return `Failed to read file: ${error.message}`
        }
    },
}
