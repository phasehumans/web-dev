/**
 * Pure TypeScript Fuzzy Myers Patch Engine
 *
 * Applies unified diff patches to target file content with fuzzy context matching,
 * line offset searching, and trailing whitespace tolerance without requiring
 * external C++ build toolchains or native shared libraries.
 */

interface Hunk {
    oldStart: number
    oldCount: number
    newStart: number
    newCount: number
    oldLines: string[]
    newLines: string[]
}

function trimRight(str: string): string {
    return str.replace(/[ \t\r]+$/, '')
}

function splitLines(text: string): string[] {
    const lines = text.split('\n')
    return lines.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))
}

function parseHunkHeader(line: string): Hunk | null {
    if (!line.startsWith('@@')) return null

    const endHunk = line.indexOf('@@', 2)
    if (endHunk === -1) return null

    const header = line.substring(2, endHunk).trim()
    const parts = header.split(/\s+/)
    if (parts.length < 2) return null

    let oldPart = parts[0] || ''
    let newPart = parts[1] || ''

    if (oldPart.startsWith('-')) oldPart = oldPart.slice(1)
    if (newPart.startsWith('+')) newPart = newPart.slice(1)

    let oldStart = 1
    let oldCount = 1
    let newStart = 1
    let newCount = 1

    if (oldPart.includes(',')) {
        const [s, c] = oldPart.split(',')
        oldStart = parseInt(s || '1', 10)
        oldCount = parseInt(c || '0', 10)
    } else if (oldPart) {
        oldStart = parseInt(oldPart, 10)
    }

    if (newPart.includes(',')) {
        const [s, c] = newPart.split(',')
        newStart = parseInt(s || '1', 10)
        newCount = parseInt(c || '0', 10)
    } else if (newPart) {
        newStart = parseInt(newPart, 10)
    }

    return {
        oldStart,
        oldCount,
        newStart,
        newCount,
        oldLines: [],
        newLines: [],
    }
}

function parseDiff(diffStr: string): Hunk[] {
    const hunks: Hunk[] = []
    const lines = splitLines(diffStr)

    let currentHunk: Hunk | null = null

    for (const line of lines) {
        if (line.startsWith('@@ ')) {
            if (currentHunk) {
                hunks.push(currentHunk)
            }
            currentHunk = parseHunkHeader(line)
            continue
        }

        if (!currentHunk) continue

        if (line === '') {
            currentHunk.oldLines.push('')
            currentHunk.newLines.push('')
        } else if (line.startsWith(' ')) {
            const content = line.slice(1)
            currentHunk.oldLines.push(content)
            currentHunk.newLines.push(content)
        } else if (line.startsWith('-')) {
            currentHunk.oldLines.push(line.slice(1))
        } else if (line.startsWith('+')) {
            currentHunk.newLines.push(line.slice(1))
        }
    }

    if (currentHunk) {
        hunks.push(currentHunk)
    }

    return hunks
}

function matchScore(fileLines: string[], fileIdx: number, patternLines: string[]): number {
    if (fileIdx + patternLines.length > fileLines.length) return 0.0

    if (patternLines.length === 0) return 1.0

    let matches = 0
    for (let i = 0; i < patternLines.length; i++) {
        const f = fileLines[fileIdx + i] || ''
        const p = patternLines[i] || ''

        if (f === p) {
            matches += 2
        } else if (trimRight(f) === trimRight(p)) {
            matches += 1
        }
    }

    return matches / (2.0 * patternLines.length)
}

function findBestMatchOffset(fileLines: string[], hunk: Hunk, fuzzFactor: number = 0.5): number {
    const expectedIdx = Math.max(0, hunk.oldStart - 1)

    if (hunk.oldLines.length === 0) {
        return Math.min(expectedIdx, fileLines.length)
    }

    // Try exact position first
    const score = matchScore(fileLines, expectedIdx, hunk.oldLines)
    if (score >= 0.99) return expectedIdx

    // Search outwards from expectedIdx
    const maxRadius = fileLines.length
    let bestIdx = score > fuzzFactor ? expectedIdx : -1
    let bestScore = Math.max(fuzzFactor, score)

    for (let r = 1; r <= maxRadius; r++) {
        const up = expectedIdx - r
        const down = expectedIdx + r

        if (up >= 0) {
            const s = matchScore(fileLines, up, hunk.oldLines)
            if (s > bestScore) {
                bestScore = s
                bestIdx = up
                if (s >= 0.99) return bestIdx
            }
        }

        if (down + hunk.oldLines.length <= fileLines.length) {
            const s = matchScore(fileLines, down, hunk.oldLines)
            if (s > bestScore) {
                bestScore = s
                bestIdx = down
                if (s >= 0.99) return bestIdx
            }
        }
    }

    return bestIdx
}

export function applyFuzzyPatchTS(
    originalContent: string,
    unifiedDiff: string,
    fuzzFactor: number = 0.5
): string | null {
    if (!originalContent || !unifiedDiff) return null

    const hunks = parseDiff(unifiedDiff)
    if (hunks.length === 0) return null

    const fileLines = splitLines(originalContent)

    for (const hunk of hunks) {
        const targetIdx = findBestMatchOffset(fileLines, hunk, fuzzFactor)
        if (targetIdx < 0) {
            return null
        }

        const deleteCount = hunk.oldLines.length
        fileLines.splice(targetIdx, deleteCount, ...hunk.newLines)
    }

    return fileLines.join('\n')
}
