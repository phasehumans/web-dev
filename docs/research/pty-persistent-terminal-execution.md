# Primary-Source Research: Pseudo-Terminal (PTY) Harness & Persistent Shell Execution

## Executive Summary

Terminal-based coding agents rely heavily on the shell tool to run builds, execute tests, manage package managers, and trigger migrations. However, a major differentiator between naive AI CLI wrappers and enterprise-grade terminal harnesses (like **Claude Code** and **Codex CLI**) is **terminal execution fidelity**.

Currently, December executes bash commands in [`apps/cli/src/local-operations.ts`](file:///home/chaitanya/code/december/apps/cli/src/local-operations.ts) via `child_process.spawn(command, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] })` and immediately closes `stdin` (`child.stdin?.end?.()`).

This introduces three critical limitations:

1. **Command Incompatibility**: Commands that expect an interactive TTY (such as `npm init`, `bun create`, `yarn upgrade-interactive`, `git add -p`, `git rebase -i`, and Docker/ncurses tools) either immediately crash or hang indefinitely.
2. **State Amnesia**: Every shell command executes in a brand new subprocess. Changing directories (`cd packages/agent`) or exporting environment variables (`export NODE_ENV=development`) does not persist to subsequent tool calls.
3. **Mangled ANSI/Control Characters**: Raw piped streams fail to handle terminal window size adjustments (`SIGWINCH`), progress spinners, and escape sequences properly.

This document details the primary-source architecture for embedding a full **Pseudo-Terminal (PTY)** via `node-pty` with state persistence, interactive input forwarding, and clean ANSI stream management.

---

## 1. Primary Source Analysis: PTY vs Piped Subprocess

| Feature                                      | Standard Piped `spawn` (Current December) | Persistent `node-pty` Harness (Claude Code / SOTA)   |
| :------------------------------------------- | :---------------------------------------- | :--------------------------------------------------- |
| **TTY Emulation**                            | `process.stdout.isTTY === false`          | Real virtual `/dev/pts/*` allocation                 |
| **Interactive Prompts**                      | Hangs / crashes (stdin closed)            | Full bidirectional interactive I/O supported         |
| **State Persistence (`cd`, `export`)**       | Lost immediately upon process exit        | Maintained across consecutive turns in session       |
| **Progress Bars & Curses (ANSI)**            | Cluttered raw carriage returns (`\r`)     | Cleanly stripped or parsed via xterm headless parser |
| **Signal Forwarding (`SIGINT`, `SIGWINCH`)** | Process-group signaling issues            | Accurate POSIX signal propagation                    |

---

## 2. Low-Level Architecture for Persistent PTY Session

```
                                  +------------------------------------+
                                  |    Agent Harness / BashTool        |
                                  +------------------------------------+
                                                    |
                                      (exec: "cd packages/tools && ls")
                                                    v
                                  +------------------------------------+
                                  |    PersistentPtySessionPool        |
                                  +------------------------------------+
                                                    |
                         +--------------------------+--------------------------+
                         |                                                     |
                         v                                                     v
              [Interactive Session PTY]                             [Async Background PTY]
              - Spawned once per workspace                           - Spawned for long-running
              - Default shell (bash/zsh)                             - Task ID allocated
              - Preserves cwd, env, PATH                             - Piped to manage_task
                         |                                                     |
                         v                                                     v
             [Virtual /dev/pts master]                             [Virtual /dev/pts worker]
```

### 2.1 State Persistence Protocol

In a persistent PTY session:

1. When December initializes, it spawns a single persistent background shell:
    ```typescript
    const ptyProcess = pty.spawn(process.env.SHELL || '/bin/bash', [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: workspaceDir,
        env: { ...process.env, TERM: 'xterm-256color', PAGER: 'cat' },
    })
    ```
2. When the agent executes a command, the harness:
    - Writes the command followed by a unique sentinel delimiter:
        ```bash
        <command>; echo -e "\n__DECEMBER_EXIT_CODE__:$?\n__DECEMBER_DONE__"
        ```
    - Collects all streaming output.
    - Parses the exit code from the sentinel marker `__DECEMBER_EXIT_CODE__:<code\>`.
    - Strips the sentinel markers and returns clean output to the agent.
    - Retains the modified working directory and exported environment variables for the next command.

---

## 3. Implementation Blueprint

### 3.1 PTY Shell Runner (`packages/tools/src/pty-session.ts`)

```typescript
import * as pty from 'node-pty'

export interface PtyExecOptions {
    timeoutMs?: number
    onData?: (chunk: string) => void
    signal?: AbortSignal
}

export interface PtyExecResult {
    exitCode: number
    output: string
}

export class PersistentPtySession {
    private ptyProcess: pty.IPty
    private workspaceDir: string
    private isBusy = false

    constructor(workspaceDir: string) {
        this.workspaceDir = workspaceDir
        const shell =
            process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

        this.ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 120,
            rows: 40,
            cwd: workspaceDir,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                PAGER: 'cat',
                CI: 'true',
            },
        })
    }

    public async exec(command: string, options: PtyExecOptions = {}): Promise<PtyExecResult> {
        if (this.isBusy) {
            throw new Error('PTY session is currently busy executing another command.')
        }

        this.isBusy = true
        const delimiter = `__DEC_CMD_${Date.now()}_${Math.random().toString(36).slice(2)}__`
        const fullCommand = `${command}\n echo -e "\\n${delimiter}_CODE:$?\\n${delimiter}_DONE"\n`

        let outputBuffer = ''
        let isResolved = false

        return new Promise<PtyExecResult>((resolve, reject) => {
            let timeoutHandle: NodeJS.Timeout | undefined

            if (options.timeoutMs) {
                timeoutHandle = setTimeout(() => {
                    this.ptyProcess.write('\x03') // Send SIGINT (Ctrl+C)
                    cleanup()
                    reject(new Error(`Command timed out after ${options.timeoutMs}ms`))
                }, options.timeoutMs)
            }

            const disposable = this.ptyProcess.onData((data: string) => {
                outputBuffer += data
                options.onData?.(data)

                if (outputBuffer.includes(`${delimiter}_DONE`)) {
                    cleanup()
                    const regex = new RegExp(`${delimiter}_CODE:(\\d+)`)
                    const match = outputBuffer.match(regex)
                    const exitCode = match ? parseInt(match[1], 10) : 0

                    // Clean delimiters and command echoes from output
                    const cleanOutput = outputBuffer
                        .split(new RegExp(`${delimiter}_CODE:\\d+\\s+${delimiter}_DONE`))[0]
                        .replace(command, '')
                        .trim()

                    resolve({ exitCode, output: cleanOutput })
                }
            })

            const cleanup = () => {
                this.isBusy = false
                if (timeoutHandle) clearTimeout(timeoutHandle)
                disposable.dispose()
            }

            if (options.signal) {
                options.signal.addEventListener('abort', () => {
                    this.ptyProcess.write('\x03')
                    cleanup()
                    reject(new Error('Aborted by user'))
                })
            }

            this.ptyProcess.write(fullCommand)
        })
    }

    public resize(cols: number, rows: number) {
        this.ptyProcess.resize(cols, rows)
    }

    public dispose() {
        this.ptyProcess.kill()
    }
}
```

---

## 4. Interactive Stdin Forwarding for Background Tasks

In [`packages/tools/src/manage_task.ts`](file:///home/chaitanya/code/december/packages/tools/src/manage_task.ts), support sending inputs directly to tasks:

```typescript
const manageTaskSchema = Type.Object({
    action: Type.Union([Type.Literal('status'), Type.Literal('kill'), Type.Literal('send_input')]),
    taskId: Type.String(),
    input: Type.Optional(Type.String({ description: 'Text or keys to write to process stdin' })),
})
```

When an interactive CLI asks `Select package manager (npm/yarn/bun): `, the agent or user can call `manage_task` with `{ action: "send_input", taskId: "task-1", input: "bun\n" }`.

---

## 5. Security & Isolation Controls

1. **Subshell Sandboxing**: By launching the PTY within the workspace directory, `PATH` is scoped to include local `./node_modules/.bin`.
2. **Path Traversal Guard**: Integrated with `checkPathGuard` from [`packages/shared/src/permissions.ts`](file:///home/chaitanya/code/december/packages/shared/src/permissions.ts) to intercept any command targeting sensitive credential directories (`.ssh`, `/etc`).
