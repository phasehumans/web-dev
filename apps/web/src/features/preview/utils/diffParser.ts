import type { Message } from '@/features/chat/types'

export interface ParsedFileDiff {
    filePath: string
    action: 'created' | 'modified' | 'deleted'
    diff: string
    additions: number
    deletions: number
}

export function parseDiffChunks(targetContent?: string, replacementContent?: string): string {
    const target = (targetContent || '')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => (l.startsWith('-') ? l : `-${l}`))
        .join('\n')

    const replacement = (replacementContent || '')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => (l.startsWith('+') ? l : `+${l}`))
        .join('\n')

    return [target, replacement].filter(Boolean).join('\n')
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

export function extractSessionFileDiffs(messages: Message[]): ParsedFileDiff[] {
    const diffMap = new Map<string, ParsedFileDiff>()

    for (const msg of messages) {
        if (!msg.blocks) continue

        for (const block of msg.blocks) {
            if (block.type === 'file_change') {
                const diff = block.diff || ''
                const { additions, deletions } = extractDiffStats(diff)
                diffMap.set(block.filePath, {
                    filePath: block.filePath,
                    action: block.action,
                    diff,
                    additions,
                    deletions,
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
                    parsedInput.AbsolutePath ||
                    parsedInput.filePath ||
                    parsedInput.filepath ||
                    parsedInput.path ||
                    ''

                if (!path) continue

                let diff = ''
                let action: 'created' | 'modified' | 'deleted' = 'modified'

                if (block.toolName === 'write_file' || block.toolName === 'write_to_file') {
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
                    diffMap.set(path, {
                        filePath: path,
                        action,
                        diff,
                        additions,
                        deletions,
                    })
                }
            }
        }
    }

    return Array.from(diffMap.values())
}
