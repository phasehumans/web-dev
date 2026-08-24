import fs from 'node:fs/promises'
import path from 'node:path'

export interface ResolvedContext {
    rawPrompt: string
    expandedPrompt: string
    hasMentions: boolean
    files: Array<{ path: string; startLine?: number; endLine?: number }>
    contextBlocks: string[]
}

const MAX_FILE_LINES = 1000
const MAX_FILE_BYTES = 50 * 1024 // 50 KB per mention

export async function resolveContextMentions(
    rawPrompt: string,
    workspaceDir: string = process.cwd()
): Promise<ResolvedContext> {
    const contextBlocks: string[] = []
    const files: Array<{ path: string; startLine?: number; endLine?: number }> = []

    // Matches @file:path/to/file.ext:10-20 or @path/to/file.ext:10-20 or @file.ext
    // Excludes email-like patterns (e.g. user@domain.com) if the file doesn't exist
    const tokenRegex = /(?:^|\s)@(?:file:)?([^\s:]+\.[a-zA-Z0-9_\-]+)(?::(\d+)(?:-(\d+))?)?/g
    let match: RegExpExecArray | null

    const processedFiles = new Set<string>()

    while ((match = tokenRegex.exec(rawPrompt)) !== null) {
        const relPath = match[1]
        const startLineStr = match[2]
        const endLineStr = match[3]

        const startLine = startLineStr ? parseInt(startLineStr, 10) : undefined
        const endLine = endLineStr ? parseInt(endLineStr, 10) : startLine

        const dedupeKey = `${relPath}:${startLine || ''}-${endLine || ''}`
        if (processedFiles.has(dedupeKey)) continue

        const absPath = path.isAbsolute(relPath) ? relPath : path.resolve(workspaceDir, relPath)

        try {
            const stat = await fs.stat(absPath)
            if (!stat.isFile()) continue

            const rawContent = await fs.readFile(absPath, 'utf8')
            const allLines = rawContent.split('\n')

            let selectedContent = ''
            let lineInfo = ''

            if (startLine !== undefined && !isNaN(startLine)) {
                const s = Math.max(1, startLine)
                const e =
                    endLine !== undefined && !isNaN(endLine)
                        ? Math.min(allLines.length, Math.max(s, endLine))
                        : s
                const sliced = allLines.slice(s - 1, e)
                selectedContent = sliced.map((line, idx) => `${s + idx}: ${line}`).join('\n')
                lineInfo = ` lines="${s}-${e}"`
            } else {
                if (
                    allLines.length > MAX_FILE_LINES ||
                    Buffer.byteLength(rawContent, 'utf8') > MAX_FILE_BYTES
                ) {
                    const snippet = allLines.slice(0, MAX_FILE_LINES).join('\n')
                    selectedContent = `${snippet}\n\n<... ${allLines.length - MAX_FILE_LINES} lines omitted ...>`
                } else {
                    selectedContent = rawContent
                }
            }

            const cleanRelPath = path.isAbsolute(relPath)
                ? path.relative(workspaceDir, relPath)
                : relPath
            contextBlocks.push(
                `<context_file path="${cleanRelPath}"${lineInfo}>\n${selectedContent}\n</context_file>`
            )
            files.push({ path: cleanRelPath, startLine, endLine })
            processedFiles.add(dedupeKey)
        } catch {
            // Intentionally swallowed: token did not resolve to a readable workspace file
        }
    }

    const hasMentions = contextBlocks.length > 0
    const expandedPrompt = hasMentions ? `${rawPrompt}\n\n${contextBlocks.join('\n\n')}` : rawPrompt

    return {
        rawPrompt,
        expandedPrompt,
        hasMentions,
        files,
        contextBlocks,
    }
}
