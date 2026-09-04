import fs from 'node:fs'

import type { SkillMetadata } from './types'

export interface ParsedSkill {
    metadata: SkillMetadata
    body: string
}

function stripQuotes(str: string): string {
    const trimmed = str.trim()
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1)
    }
    return trimmed
}

export function parseFrontmatterYaml(yamlText: string): Record<string, any> {
    const lines = yamlText.split(/\r?\n/)
    const result: Record<string, any> = {}

    let i = 0
    while (i < lines.length) {
        const line = lines[i]
        if (line === undefined) {
            i++
            continue
        }
        const trimmed = line.trim()

        if (!trimmed || trimmed.startsWith('#')) {
            i++
            continue
        }

        // Top-level key: value
        const topKeyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
        if (!topKeyMatch || !topKeyMatch[1] || topKeyMatch[2] === undefined) {
            i++
            continue
        }

        const rawKey = topKeyMatch[1]
        const key = rawKey.toLowerCase()
        const rawVal = topKeyMatch[2].trim()

        // Handle multiline folded (>) or literal (|) blocks
        if (rawVal === '>' || rawVal === '>-' || rawVal === '|' || rawVal === '|-') {
            const isFolded = rawVal.startsWith('>')
            const blockLines: string[] = []
            i++
            while (i < lines.length) {
                const nextLine = lines[i]
                if (nextLine === undefined) {
                    i++
                    continue
                }
                if (nextLine.trim().length === 0) {
                    blockLines.push('')
                    i++
                    continue
                }
                // Indented line belongs to block
                const indentMatch = nextLine.match(/^\s+(.*)$/)
                if (indentMatch && indentMatch[1] !== undefined) {
                    blockLines.push(indentMatch[1])
                    i++
                } else {
                    break
                }
            }

            if (isFolded) {
                // Folded: join lines with space, consecutive empty lines become paragraph breaks
                const joined = blockLines
                    .join('\n')
                    .replace(/([^\n])\n([^\n])/g, '$1 $2')
                    .trim()
                result[key] = joined
            } else {
                result[key] = blockLines.join('\n').trim()
            }
            continue
        }

        // Check if value starts on next lines as a list or nested object
        if (!rawVal) {
            i++
            const childLines: string[] = []
            while (i < lines.length) {
                const nextLine = lines[i]
                if (nextLine === undefined) {
                    i++
                    continue
                }
                if (nextLine.trim().length === 0) {
                    i++
                    continue
                }
                if (/^\s+/.test(nextLine)) {
                    childLines.push(nextLine)
                    i++
                } else {
                    break
                }
            }

            if (childLines.length > 0) {
                // Determine if it is a list or object
                const firstChild = childLines[0]
                if (firstChild && firstChild.trim().startsWith('-')) {
                    // List
                    const items = childLines
                        .map((l) => l.trim())
                        .filter((l) => l.startsWith('-'))
                        .map((l) => stripQuotes(l.replace(/^-\s*/, '')))
                    result[key] = items
                } else {
                    // Nested map (e.g. model: recommended: ...)
                    const nestedObj: Record<string, any> = {}
                    for (const cl of childLines) {
                        const m = cl.trim().match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
                        if (m && m[1] && m[2] !== undefined) {
                            const subKey = m[1].toLowerCase()
                            const subVal = stripQuotes(m[2].trim())
                            if (subVal === 'true') nestedObj[subKey] = true
                            else if (subVal === 'false') nestedObj[subKey] = false
                            else if (!isNaN(Number(subVal)) && subVal !== '')
                                nestedObj[subKey] = Number(subVal)
                            else nestedObj[subKey] = subVal
                        }
                    }
                    result[key] = nestedObj
                }
            } else {
                result[key] = ''
            }
            continue
        }

        // Inline lists like [a, b, c]
        if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
            const inner = rawVal.slice(1, -1).trim()
            result[key] = inner
                ? inner
                      .split(',')
                      .map((item) => stripQuotes(item.trim()))
                      .filter(Boolean)
                : []
            i++
            continue
        }

        // Inline booleans / numbers
        if (rawVal === 'true') {
            result[key] = true
        } else if (rawVal === 'false') {
            result[key] = false
        } else if (!isNaN(Number(rawVal)) && rawVal !== '') {
            result[key] = Number(rawVal)
        } else {
            result[key] = stripQuotes(rawVal)
        }
        i++
    }

    return result
}

export function parseSkillContent(content: string, filePath?: string): ParsedSkill {
    const trimmed = content.trimStart()
    if (!trimmed.startsWith('---')) {
        throw new Error(
            `Invalid skill format: ${filePath || 'content'} lacks YAML frontmatter opening delimiter (---)`
        )
    }

    const afterOpening = trimmed.slice(3)
    const closingIndex = afterOpening.search(/\r?\n---\r?\n/)
    if (closingIndex === -1) {
        throw new Error(
            `Invalid skill format: ${filePath || 'content'} lacks YAML frontmatter closing delimiter (---)`
        )
    }

    const frontmatterText = afterOpening.slice(0, closingIndex)
    const body = afterOpening
        .slice(closingIndex)
        .replace(/^\r?\n---\r?\n/, '')
        .trim()

    const raw = parseFrontmatterYaml(frontmatterText)

    if (!raw.name || typeof raw.name !== 'string' || !raw.name.trim()) {
        throw new Error(`Skill in ${filePath || 'content'} is missing required 'name' field`)
    }

    if (!raw.description || typeof raw.description !== 'string' || !raw.description.trim()) {
        throw new Error(`Skill in ${filePath || 'content'} is missing required 'description' field`)
    }

    const metadata: SkillMetadata = {
        name: raw.name.toLowerCase().trim(),
        description: raw.description.trim(),
        argumentHint: raw['argument-hint'] || raw.argumenthint || raw['argument_hint'],
        license: raw.license,
        tags: Array.isArray(raw.tags) ? raw.tags : undefined,
        model: raw.model && typeof raw.model === 'object' ? raw.model : undefined,
        disable: Boolean(raw.disable),
        dependencies:
            raw.dependencies && typeof raw.dependencies === 'object' ? raw.dependencies : undefined,
    }

    return {
        metadata,
        body,
    }
}

export function parseSkillFile(skillMdPath: string): ParsedSkill {
    const content = fs.readFileSync(skillMdPath, 'utf8')
    return parseSkillContent(content, skillMdPath)
}
