# Primary-Source Research: TUI Developer Ergonomics, Live Diff Previews & External Editor Support

## Executive Summary

Terminal-based AI harnesses must balance rich visual density with terminal performance and smooth developer workflows. Two major ergonomics gaps exist in terminal agent interfaces:

1. **Opaque File Modifications**: When an agent executes `edit_file` or `edit_diff`, naive interfaces show either raw text dumps or terse completion messages. Developers cannot quickly review what changed or catch accidental deletions without leaving the terminal.
2. **Multi-line Prompt Friction**: Composing detailed architectural requests, prompt instructions, or multi-paragraph bug reports in a basic single-line or small terminal text box is painful.

Leading terminal agent harnesses (such as **Claude Code** and **Aider**) solve this through:

- **Interactive Syntax-Highlighted Diff Modal**: Rendering unified or side-by-side terminal diffs with colored line additions/deletions and interactive keybindings (`y` accept, `n` reject, `e` edit in editor).
- **External `$EDITOR` Suspension**: Allowing developers to press `Ctrl+O` or `Ctrl+G` (or type `/editor`) to suspend the TUI and open `$EDITOR` (Vim, Neovim, Nano, VS Code `-w`) for rich prompt editing.
- **Real-Time Token & Cost Decomposition**: Displaying live prompt cache hit rates, input/output token counts, and cost telemetry.

This document details the primary-source implementation for integrating these features into December's [`packages/tui`](file:///home/chaitanya/code/december/packages/tui).

---

## 1. Primary Source Analysis: SOTA TUI Ergonomics

### 1.1 Live Diff Visualization

- **Unified Diff Formatter**:
    - Uses `diff` / `diff-match-patch` to generate unified patch chunks (`@@ -start,count +start,count @@`).
    - Formats additions in green with `+` prefixes and deletions in red with `-` prefixes.
    - SOTA harnesses compute inline word-level diffs for modified lines so developers immediately see changed variable names or arguments.
- **Interactive Approval Flow**:
    - Before applying a file edit, if permission tier requires approval, TUI presents a modal overlay:
        ```
        ┌─ Diff: src/auth/service.ts ───────────────────────────────────┐
        │ 38   export async function validateSession(token: string) {   │
        │ 39 -     const session = await db.session.findUnique({ token }) │
        │ 39 +     const session = await sessionCache.getOrFetch(token)   │
        │ 40       if (!session) throw new AppError('Unauthorized', 401)  │
        └─────────────────────────────────────────────────────────────────┘
        Approve changes? [y] Yes  [n] No  [e] Edit in $EDITOR  [a] Always allow
        ```

### 1.2 External `$EDITOR` Spawning via Process Suspension

- When composing long prompts:
    1. The TUI writes the current input buffer to a temporary file (e.g. `/tmp/december_prompt_123.md`).
    2. TUI temporarily disables raw mode (`process.stdin.setRawMode(false)`) and pauses Ink rendering.
    3. Spawns `process.env.EDITOR || 'vim'` connected to `process.stdin`, `process.stdout`, and `process.stderr`.
    4. Waits for the editor process to exit (`child.on('exit', ...)`).
    5. Re-reads the temporary file, updates the TUI input state, restores raw mode, and resumes Ink rendering.

---

## 2. Architecture & Component Blueprint

```
                      +----------------------------------+
                      |         InputBar Component       |
                      +----------------------------------+
                                        |
                            (User Presses Ctrl+O)
                                        v
                      +----------------------------------+
                      |       openInExternalEditor()     |
                      +----------------------------------+
                                        |
                   1. Write text to /tmp/december_prompt.md
                   2. process.stdin.setRawMode(false)
                   3. spawnSync(process.env.EDITOR, [tempPath], { stdio: 'inherit' })
                   4. Read back updated text
                   5. process.stdin.setRawMode(true)
                   6. Update input bar state with edited prompt
```

---

## 3. Implementation Blueprint

### 3.1 External Editor Launcher (`packages/tui/src/utils/external-editor.ts`)

```typescript
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function openExternalEditor(initialContent: string = ''): string {
    const editor =
        process.env.EDITOR ||
        process.env.VISUAL ||
        (process.platform === 'win32' ? 'notepad.exe' : 'nano')
    const tempFile = path.join(os.tmpdir(), `december_prompt_${Date.now()}.md`)

    try {
        fs.writeFileSync(tempFile, initialContent, 'utf8')

        // Temporarily suspend raw mode for external TUI editor
        const wasRaw = process.stdin.isRaw
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(false)
        }

        spawnSync(editor, [tempFile], {
            stdio: 'inherit',
        })

        if (process.stdin.setRawMode && wasRaw) {
            process.stdin.setRawMode(true)
        }

        const updatedContent = fs.readFileSync(tempFile, 'utf8')
        return updatedContent
    } finally {
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile)
            }
        } catch {
            // ignore
        }
    }
}
```

### 3.2 Terminal Diff Component (`packages/tui/src/components/diff-viewer.tsx`)

```typescript
import React from 'react'
import { Box, Text } from 'ink'
import { structuredPatch } from 'diff'

interface DiffViewerProps {
    filePath: string
    oldContent: string
    newContent: string
    maxLines?: number
}

export function DiffViewer({ filePath, oldContent, newContent, maxLines = 25 }: DiffViewerProps) {
    const patch = structuredPatch(filePath, filePath, oldContent, newContent, '', '', { context: 2 })

    let renderedLines = 0
    const linesToRender: Array<{ text: string; color: string; prefix: string }> = []

    for (const hunk of patch.hunks) {
        linesToRender.push({
            text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
            color: 'cyan',
            prefix: '',
        })

        for (const line of hunk.lines) {
            if (renderedLines >= maxLines) break
            renderedLines++

            if (line.startsWith('+')) {
                linesToRender.push({ text: line.slice(1), color: 'green', prefix: '+ ' })
            } else if (line.startsWith('-')) {
                linesToRender.push({ text: line.slice(1), color: 'red', prefix: '- ' })
            } else {
                linesToRender.push({ text: line.slice(1), color: 'gray', prefix: '  ' })
            }
        }
    }

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} marginY={1}>
            <Text bold color="yellow">Diff Preview: {filePath}</Text>
            {linesToRender.map((l, i) => (
                <Text key={i} color={l.color as any}>
                    {l.prefix}{l.text}
                </Text>
            ))}
            {renderedLines >= maxLines && (
                <Text color="gray" italic>... additional diff lines truncated for display</Text>
            )}
        </Box>
    )
}
```

---

## 4. Real-Time Token & Cost Telemetry Meter

In [`packages/tui/src/components/header.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/header.tsx):

- Display cost telemetry in the header bar:
  `⚡ Gemini 3.6 Flash | Tokens: 12.4k (Cache Hit: 88%) | Est. Cost: $0.0032`
- Dynamically updates as usage events (`AgentUsage`) stream through [`packages/agent/src/agent-loop.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts).

---

## 5. Summary of Added Value

1. **Safety & Clarity**: Developers clearly see what changes are about to be applied line-by-line before confirming.
2. **Effortless Prompt Authoring**: `$EDITOR` integration enables writing extensive PRDs and refactoring specs without fighting terminal line-wrap limitations.
3. **Transparent Economics**: Live prompt cache hit ratios and cost tracking provide immediate visibility into token efficiency.
