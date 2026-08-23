# Primary-Source Research: Rich Context Expansion (@ Mentions), Multi-Modal Vision & Unix Piping

## Executive Summary

Developers interacting with a CLI agent frequently need to reference specific context: files, line ranges, directory trees, git diffs, web documentation, or compiler error outputs. Moreover, command-line power users expect seamless integration with standard Unix pipelines (e.g. `cat crash.log | december "diagnose this"` or `git diff | december -p "generate PR summary"`).

In December's current implementation:

1. In [`packages/tui/src/components/input-bar.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/input-bar.tsx), typing `@filename` triggers visual autocomplete, but the prompt submitted to the agent is simply the literal string `"@src/index.ts"`. The actual file contents are not expanded or injected into context prior to LLM dispatch.
2. In [`apps/cli/src/headless-runner.ts`](file:///home/chaitanya/code/december/apps/cli/src/headless-runner.ts), piping data from `stdin` is not automatically bundled into the prompt payload.
3. Multi-modal inputs (e.g. referencing UI bug screenshots or design mockups for multimodal models like Claude 3.7 Sonnet, GPT-4o, or Gemini 2.0) are unsupported.

This document analyzes primary-source implementations in **Claude Code** and **Codex CLI** and provides a full specification for **Rich Context Expansion, Multimodal Image Ingestion, and Unix Piping** in December.

---

## 1. Primary Source Analysis: SOTA Mention & Ingestion Protocols

### 1.1 Context Mention Syntax (`@` Tokens)

SOTA terminal coding harnesses resolve and inline `@` tokens dynamically on client submission:

- `@file:src/auth/service.ts`: Inlines the complete file content enclosed in `<context_file path="...">` tags.
- `@file:src/auth/service.ts:10-45`: Inlines only lines 10 through 45 with line numbers.
- `@dir:packages/agent` or `@folder:apps/cli`: Inlines the directory file tree with relative sizes.
- `@git` or `@diff`: Inlines `git status` + `git diff` (staged and unstaged changes).
- `@problems` or `@diagnostics`: Inlines active compiler or linter errors.
- `@url:https://docs.anthropic.com/...`: Fetches URL content, converts HTML to clean Markdown, and inlines as documentation context.

### 1.2 Unix Pipeline Ingestion (`stdin` streaming)

When December is invoked in a pipe:

```bash
cat server-error.log | december "What caused this 500 error?"
git diff HEAD~1 | december "Write release notes for this change"
```

The CLI should automatically detect that `process.stdin` is not a TTY, drain `stdin` into a `<piped_stdin>` block, and append it to the user prompt.

### 1.3 Multi-Modal Vision Attachments

Modern models (Claude 3.7 Sonnet, GPT-4o, Gemini 2.5 Pro) have vision capabilities. When users provide an image path or paste a screenshot:

- `@image:./screenshot.png` or drag-and-dropping an image path into the TUI input bar encodes the image to Base64 with appropriate MIME types (`image/png`, `image/jpeg`, `image/webp`).
- Dispatches as standard multimodal content blocks to the provider.

---

## 2. Architecture for Context Resolver Engine

```
                             User Types:
   "Fix the auth error in @file:src/auth.ts:20-50 and review @diff with @image:./error.png"
                                  |
                                  v
                +------------------------------------+
                |       ContextMentionResolver       |
                +------------------------------------+
                                  |
         +------------------------+------------------------+
         |                        |                        |
         v                        v                        v
  [File / Range Resolver]   [Git Diff Resolver]    [Multimodal Image Encoder]
  - Reads src/auth.ts       - Runs 'git diff'      - Reads error.png
  - Slices lines 20-50      - Formats diff chunk   - Encodes base64 payload
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
              +----------------------------------------+
              |           Enriched LLM Prompt          |
              | - Clean user query text                |
              | - <context_file path="...">...</file>  |
              | - <git_diff>...</git_diff>             |
              | - Multimodal image payload blocks      |
              +----------------------------------------+
```

---

## 3. Implementation Blueprint

### 3.1 Context Mention Resolver (`packages/shared/src/context-resolver.ts`)

```typescript
import fs from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface ResolvedContext {
    cleanedPrompt: string
    contextBlocks: string[]
    images: Array<{ mimeType: string; base64: string }>
}

export async function resolveContextMentions(
    rawPrompt: string,
    workspaceDir: string = process.cwd()
): Promise<ResolvedContext> {
    const contextBlocks: string[] = []
    const images: Array<{ mimeType: string; base64: string }> = []
    let cleanedPrompt = rawPrompt

    // 1. Resolve @file:path[:startLine-endLine]
    const fileRegex = /@(?:file:)?([^\s:]+\.[a-zA-Z0-9]+)(?::(\d+)(?:-(\d+))?)?/g
    let fileMatch: RegExpExecArray | null

    while ((fileMatch = fileRegex.exec(rawPrompt)) !== null) {
        const fullToken = fileMatch[0]
        const relPath = fileMatch[1]
        const startLine = fileMatch[2] ? parseInt(fileMatch[2], 10) : undefined
        const endLine = fileMatch[3] ? parseInt(fileMatch[3], 10) : startLine

        const absPath = path.resolve(workspaceDir, relPath)
        try {
            const content = await fs.readFile(absPath, 'utf8')
            const lines = content.split('\n')

            let selectedContent = content
            let lineInfo = ''

            if (startLine !== undefined) {
                const start = Math.max(0, startLine - 1)
                const end = endLine !== undefined ? Math.min(lines.length, endLine) : start + 1
                selectedContent = lines
                    .slice(start, end)
                    .map((l, idx) => `${start + idx + 1}: ${l}`)
                    .join('\n')
                lineInfo = ` lines ${startLine}-${endLine || startLine}`
            }

            contextBlocks.push(
                `<context_file path="${relPath}"${lineInfo}>\n${selectedContent}\n</context_file>`
            )
        } catch {
            // Ignore missing file errors
        }
    }

    // 2. Resolve @diff / @git
    if (/@(diff|git)\b/i.test(rawPrompt)) {
        try {
            const { stdout: diffOut } = await execAsync('git diff HEAD', { cwd: workspaceDir })
            const { stdout: statusOut } = await execAsync('git status --short', {
                cwd: workspaceDir,
            })
            contextBlocks.push(
                `<git_context>\n[Git Status]:\n${statusOut}\n\n[Git Diff]:\n${diffOut}\n</git_context>`
            )
        } catch {
            // Not a git repo
        }
    }

    // 3. Resolve @image:path.(png|jpg|jpeg|webp)
    const imageRegex = /@image:([^\s]+\.(png|jpe?g|webp|gif))/gi
    let imgMatch: RegExpExecArray | null

    while ((imgMatch = imageRegex.exec(rawPrompt)) !== null) {
        const imgRelPath = imgMatch[1]
        const ext = imgMatch[2].toLowerCase()
        const imgAbsPath = path.resolve(workspaceDir, imgRelPath)

        try {
            const buffer = await fs.readFile(imgAbsPath)
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
            images.push({
                mimeType,
                base64: buffer.toString('base64'),
            })
        } catch {
            // Ignore missing image
        }
    }

    return {
        cleanedPrompt,
        contextBlocks,
        images,
    }
}
```

---

## 4. Stdin Piped Ingestion Blueprint (`apps/cli/src/index.ts`)

```typescript
async function readPipedStdin(): Promise<string | null> {
    if (process.stdin.isTTY) return null

    return new Promise((resolve) => {
        let data = ''
        process.stdin.setEncoding('utf8')
        process.stdin.on('data', (chunk) => {
            data += chunk
        })
        process.stdin.on('end', () => {
            resolve(data.trim() ? data : null)
        })
        process.stdin.on('error', () => {
            resolve(null)
        })
    })
}

// In main():
const pipedInput = await readPipedStdin()
if (pipedInput) {
    if (parsedArgs.prompt) {
        parsedArgs.prompt = `${parsedArgs.prompt}\n\n<piped_stdin>\n${pipedInput}\n</piped_stdin>`
    } else {
        parsedArgs.prompt = `<piped_stdin>\n${pipedInput}\n</piped_stdin>`
    }
}
```

---

## 5. Summary of Added Capabilities

1. **Instant Context Pulling**: Users no longer have to ask the agent to "read file X and then do Y"—they can type `"refactor @file:src/auth.ts"` and the agent immediately receives the content in turn 1.
2. **Terminal Workflow Integration**: Support for Unix pipes (`cat log | december ...`) enables seamless scriptability in Bash, Zsh, and CI pipelines.
3. **Multimodal Diagnostic Support**: Enables debugging UI and visual bugs directly by referencing screenshot files in the terminal.
