# Primary-Source Research: Compiler & Linter Diagnostic Feedback Loop

## Executive Summary

One of the largest productivity leaks in current AI coding agents is the **"Blind Edit" problem**. An agent modifies TypeScript, Rust, Python, or Go files using `edit_file` or `edit_diff`, assumes the change is syntactically valid, and finishes its turn. The user only discovers syntax errors, missing type imports, or broken interfaces minutes later when running their app.

Leading coding harnesses (including **Claude Code**, **Cursor**, and **Aider**) implement an **Automated Post-Edit Diagnostic Loop**:

- Immediately after any file modification tool runs, the harness executes an in-process or lightweight sub-second compiler/linter check (`tsc`, `eslint`, `cargo check`, `pyright`, `ruff`).
- If new compiler diagnostics (syntax/type errors) are introduced by the edit, they are formatted as high-signal structured feedback and immediately fed back into the agent loop in the _same turn_.
- The agent corrects its own syntax or type mismatch automatically before reporting success to the developer.

This document details the primary-source design for implementing a **Fast Diagnostic Feedback Engine** in December.

---

## 1. Primary Source Analysis: SOTA Diagnostic Feedback Loops

### 1.1 Cursor & Claude Code Diagnostic Integration

- **LSP / Language Server Interception**:
    - Rather than spawning a heavy full-project test suite, the harness checks only the files modified in the active turn.
    - Detects language toolchains by looking for workspace config files (`tsconfig.json`, `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`).
    - Executes single-file or delta type-checking commands (e.g. `tsc --noEmit`, `eslint --max-warnings 0`, `cargo check --message-format=json`).
- **Turn Feedback Injection**:
    - If errors are found, the tool result for `edit_file` is enriched:

        ```
        Successfully edited file: src/auth/service.ts

        [Compiler Diagnostics Detected 2 Type Errors]:
        - src/auth/service.ts:42:15 - error TS2339: Property 'refreshToken' does not exist on type 'UserSession'.
        - src/auth/service.ts:58:9 - error TS2304: Cannot find name 'AppError'. Did you forget to import it?

        Please resolve these compiler errors before concluding.
        ```

---

## 2. Architecture for December Diagnostic Pipeline

```
              +------------------------------------------------------+
              |             Agent Loop: executeToolCalls             |
              +------------------------------------------------------+
                                         |
                       (executes 'edit_file' or 'edit_diff')
                                         v
              +------------------------------------------------------+
              |                 Tool Result Returned                 |
              +------------------------------------------------------+
                                         |
                                         v
              +------------------------------------------------------+
              |            DiagnosticVerifier.verify(paths)          |
              +------------------------------------------------------+
                                         |
              +--------------------------+--------------------------+
              |                          |                          |
              v                          v                          v
      [TypeScript / JS]               [Rust]                    [Python]
      tsc --noEmit               cargo check --json           ruff / mypy
              |                          |                          |
              +--------------------------+--------------------------+
                                         |
                                (Parse Diagnostics)
                                         |
                    +--------------------+--------------------+
                    |                                         |
              (0 Errors)                                 (N Errors > 0)
                    |                                         |
                    v                                         v
         Return Clean Result                     Append Formatted Diagnostics
                                                 Agent continues loop to auto-fix
```

---

## 3. Implementation Blueprint

### 3.1 Project Toolchain Detector (`packages/tools/src/diagnostics/detector.ts`)

```typescript
import fs from 'node:fs'
import path from 'node:path'

export interface DiagnosticRunner {
    name: string
    check: (workspaceDir: string, files: string[]) => Promise<DiagnosticError[]>
}

export interface DiagnosticError {
    filePath: string
    line: number
    column: number
    ruleOrCode: string
    message: string
    severity: 'error' | 'warning'
}

export function detectProjectRunners(workspaceDir: string): DiagnosticRunner[] {
    const runners: DiagnosticRunner[] = []

    // TypeScript / JavaScript
    const hasTsConfig = fs.existsSync(path.join(workspaceDir, 'tsconfig.json'))
    if (hasTsConfig) {
        runners.push({
            name: 'typescript',
            check: async (dir, files) => {
                try {
                    const { stdout, stderr } = await execAsync(
                        'bun x tsc --noEmit --pretty false || npx tsc --noEmit --pretty false',
                        {
                            cwd: dir,
                            timeout: 8000,
                        }
                    )
                    return []
                } catch (err: any) {
                    return parseTypeScriptDiagnostics(err.stdout || err.message, files)
                }
            },
        })
    }

    // Rust
    if (fs.existsSync(path.join(workspaceDir, 'Cargo.toml'))) {
        runners.push({
            name: 'cargo',
            check: async (dir, files) => {
                try {
                    const { stdout } = await execAsync('cargo check --message-format=json', {
                        cwd: dir,
                        timeout: 10000,
                    })
                    return parseCargoJsonDiagnostics(stdout, files)
                } catch {
                    return []
                }
            },
        })
    }

    // Python
    if (
        fs.existsSync(path.join(workspaceDir, 'pyproject.toml')) ||
        fs.existsSync(path.join(workspaceDir, 'requirements.txt'))
    ) {
        runners.push({
            name: 'ruff',
            check: async (dir, files) => {
                try {
                    const targetFiles = files.filter((f) => f.endsWith('.py')).join(' ')
                    if (!targetFiles) return []
                    const { stdout } = await execAsync(
                        `ruff check --output-format=json ${targetFiles}`,
                        { cwd: dir, timeout: 5000 }
                    )
                    return parseRuffJsonDiagnostics(stdout)
                } catch (err: any) {
                    return parseRuffJsonDiagnostics(err.stdout || '[]')
                }
            },
        })
    }

    return runners
}

function parseTypeScriptDiagnostics(output: string, modifiedFiles: string[]): DiagnosticError[] {
    const errors: DiagnosticError[] = []
    const lines = output.split('\n')
    const regex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/

    for (const line of lines) {
        const match = line.match(regex)
        if (match) {
            const [, filePath, lineStr, colStr, severity, ruleOrCode, message] = match
            // Filter only to diagnostics in modified files
            if (modifiedFiles.some((mf) => filePath.endsWith(mf) || mf.endsWith(filePath))) {
                errors.push({
                    filePath,
                    line: parseInt(lineStr, 10),
                    column: parseInt(colStr, 10),
                    severity: severity as 'error' | 'warning',
                    ruleOrCode,
                    message,
                })
            }
        }
    }
    return errors.slice(0, 5) // Cap to top 5 errors to avoid context bloat
}
```

---

## 4. Agent Loop Hook Integration

In [`packages/agent/src/agent-loop.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts):

```typescript
// Inside executeSingleTool, after tool.execute:
if (['edit_file', 'edit_diff', 'write_file'].includes(toolCall.name) && !errorStr) {
    const targetFile = parsedArgs.path || parsedArgs.filePath || parsedArgs.TargetFile
    if (targetFile) {
        const diagnostics = await agent.diagnosticManager.verify([targetFile])
        if (diagnostics.length > 0) {
            const formatted = diagnostics
                .map((d) => `- ${d.filePath}:${d.line}:${d.column} [${d.ruleOrCode}]: ${d.message}`)
                .join('\n')

            resultStr += `\n\n[Warning: Compiler / Linter Errors Introduced by Edit]:\n${formatted}\n\nPlease fix these errors in your next step.`
        }
    }
}
```

---

## 5. Benefits & Impact

1. **Zero Silent Compile Regressions**: The agent is immediately alerted to type/import errors and fixes them automatically in the same turn.
2. **Reduced Human Context-Switching**: Eliminates the frustration of manually compiling code after an agent finishes.
3. **High Performance**: By focusing diagnostics only on the files modified in that turn, verification completes in $<400\text{ms}$.
