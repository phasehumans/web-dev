import { createTwoFilesPatch } from 'diff'

export function generateUnifiedDiff(
    filePath: string,
    oldContent: string,
    newContent: string
): string {
    const patch = createTwoFilesPatch(
        `a/${filePath}`,
        `b/${filePath}`,
        oldContent,
        newContent,
        '',
        '',
        { context: 3 }
    )
    const lines = patch.split('\n')
    const cleaned = lines.filter((line) => !line.startsWith('====='))
    return cleaned.join('\n').trim()
}
