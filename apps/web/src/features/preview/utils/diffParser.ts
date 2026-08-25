import type { Message } from '@/features/chat/types'

export interface DiffLine {
    type: 'added' | 'deleted' | 'context' | 'hunk'
    content: string
    oldLine?: number
    newLine?: number
    highlightRanges?: Array<{ start: number; end: number }>
}

export interface ParsedFileDiff {
    filePath: string
    directory: string
    fileName: string
    repoName?: string
    action: 'created' | 'modified' | 'deleted'
    diff: string
    additions: number
    deletions: number
    lines: DiffLine[]
}

export interface TreeNode {
    name: string
    path: string
    isFolder: boolean
    children?: TreeNode[]
    file?: ParsedFileDiff
    hasChanges?: boolean
    action?: 'created' | 'modified' | 'deleted'
}

export function parseDiffChunks(targetContent?: string, replacementContent?: string): string {
    const target =
        targetContent !== undefined && targetContent !== ''
            ? targetContent
                  .split(/\r?\n/)
                  .map((l) => (l.startsWith('-') ? l : `-${l}`))
                  .join('\n')
            : ''

    const replacement =
        replacementContent !== undefined && replacementContent !== ''
            ? replacementContent
                  .split(/\r?\n/)
                  .map((l) => (l.startsWith('+') ? l : `+${l}`))
                  .join('\n')
            : ''

    return [target, replacement].filter((s) => s.length > 0).join('\n')
}

export function extractDiffStats(diffText: string): { additions: number; deletions: number } {
    let additions = 0
    let deletions = 0

    const lines = diffText.split(/\r?\n/)
    for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++
        }
    }

    return { additions, deletions }
}

export function parseDiffLines(diffText: string): DiffLine[] {
    const rawLines = diffText.split(/\r?\n/)
    const result: DiffLine[] = []

    let oldLineNum = 1
    let newLineNum = 1

    for (const line of rawLines) {
        if (line.startsWith('@@')) {
            const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
            if (match) {
                oldLineNum = parseInt(match[1], 10)
                newLineNum = parseInt(match[2], 10)
            }
        } else if (line.startsWith('---') || line.startsWith('+++')) {
            // skip header
        } else if (line.startsWith('+')) {
            result.push({
                type: 'added',
                content: line.slice(1),
                newLine: newLineNum++,
            })
        } else if (line.startsWith('-')) {
            result.push({
                type: 'deleted',
                content: line.slice(1),
                oldLine: oldLineNum++,
            })
        } else {
            result.push({
                type: 'context',
                content: line.startsWith(' ') ? line.slice(1) : line,
                oldLine: oldLineNum++,
                newLine: newLineNum++,
            })
        }
    }

    return result
}

export function splitFilePath(fullPath: string): {
    directory: string
    fileName: string
    repoName: string
} {
    const normalized = fullPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const parts = normalized.split('/')
    const fileName = parts.pop() || normalized
    const directory = parts.join('/')
    const repoName = 'december'

    return { directory, fileName, repoName }
}

export function extractSessionFileDiffs(messages: Message[]): ParsedFileDiff[] {
    const diffMap = new Map<string, ParsedFileDiff>()

    for (const msg of messages) {
        if (!msg.blocks) continue

        for (const block of msg.blocks) {
            if (block.type === 'file_change') {
                const diff = block.diff || ''
                const { additions, deletions } = extractDiffStats(diff)
                const { directory, fileName, repoName } = splitFilePath(block.filePath)
                diffMap.set(block.filePath, {
                    filePath: block.filePath,
                    directory,
                    fileName,
                    repoName,
                    action: block.action,
                    diff,
                    additions,
                    deletions,
                    lines: parseDiffLines(diff),
                })
            } else if (block.type === 'command') {
                let parsedInput: any = {}
                if (typeof block.toolInput === 'string') {
                    try {
                        parsedInput = JSON.parse(block.toolInput)
                    } catch {
                        parsedInput = {}
                    }
                } else if (block.toolInput && typeof block.toolInput === 'object') {
                    parsedInput = block.toolInput
                }

                const path =
                    parsedInput.TargetFile ||
                    parsedInput.targetFile ||
                    parsedInput.target_file ||
                    parsedInput.AbsolutePath ||
                    parsedInput.filePath ||
                    parsedInput.filepath ||
                    parsedInput.path ||
                    parsedInput.file ||
                    parsedInput.fileName ||
                    ''

                if (!path) continue

                let diff = ''
                let action: 'created' | 'modified' | 'deleted' = 'modified'

                const toolName = (block.toolName || '').toLowerCase()

                if (
                    toolName === 'write_file' ||
                    toolName === 'write_to_file' ||
                    toolName === 'create_file'
                ) {
                    action = 'created'
                    const code =
                        parsedInput.codeContent ??
                        parsedInput.CodeContent ??
                        parsedInput.content ??
                        parsedInput.code ??
                        ''
                    diff = (code || '')
                        .split(/\r?\n/)
                        .map((l: string) => (l.startsWith('+') ? l : `+${l}`))
                        .join('\n')
                } else if (
                    block.toolName === 'replace_file_content' ||
                    block.toolName === 'multi_replace_file_content' ||
                    block.toolName === 'edit_file' ||
                    block.toolName === 'edit_diff'
                ) {
                    action = 'modified'
                    const targetContent = parsedInput.targetContent ?? parsedInput.TargetContent
                    const replacementContent =
                        parsedInput.replacementContent ?? parsedInput.ReplacementContent

                    if (targetContent !== undefined || replacementContent !== undefined) {
                        diff = parseDiffChunks(targetContent, replacementContent)
                    } else if (
                        parsedInput.ReplacementChunks &&
                        Array.isArray(parsedInput.ReplacementChunks)
                    ) {
                        diff = parsedInput.ReplacementChunks.map((chunk: any) => {
                            const tContent = chunk.targetContent ?? chunk.TargetContent ?? ''
                            const rContent =
                                chunk.replacementContent ?? chunk.ReplacementContent ?? ''
                            return parseDiffChunks(tContent, rContent)
                        }).join('\n')
                    } else if (parsedInput.diff) {
                        diff = parsedInput.diff
                    } else if (block.output) {
                        diff = block.output
                    }
                }

                if (diff) {
                    const { additions, deletions } = extractDiffStats(diff)
                    const { directory, fileName, repoName } = splitFilePath(path)
                    diffMap.set(path, {
                        filePath: path,
                        directory,
                        fileName,
                        repoName,
                        action,
                        diff,
                        additions,
                        deletions,
                        lines: parseDiffLines(diff),
                    })
                }
            }
        }
    }

    return Array.from(diffMap.values())
}
