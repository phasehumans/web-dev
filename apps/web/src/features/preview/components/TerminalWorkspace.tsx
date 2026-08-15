import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import React, { useEffect, useRef, useMemo } from 'react'
// @ts-expect-error -- CSS file import lacks TypeScript declarations
import '@xterm/xterm/css/xterm.css'

import type { GeneratedProjectFile } from '@/features/preview/types'

import { useAppStore } from '@/app/store'
import { extractSessionFileDiffs } from '@/features/preview/utils/diffParser'

interface TerminalWorkspaceProps {
    previewSessionId?: string | null
    generatedFiles?: Record<string, GeneratedProjectFile>
}

// In-Memory Virtual File System Node
type FSNode =
    | { type: 'file'; content: string; mtime: Date }
    | { type: 'dir'; children: Record<string, FSNode>; mtime: Date }

function createInitialFS(
    fileDiffs: any[],
    generatedFiles?: Record<string, GeneratedProjectFile>
): Record<string, FSNode> {
    const root: Record<string, FSNode> = {
        'package.json': {
            type: 'file',
            content: JSON.stringify(
                {
                    name: 'december-workspace',
                    version: '0.1.0',
                    private: true,
                    scripts: {
                        dev: 'vite dev',
                        build: 'tsc && vite build',
                        test: 'bun test',
                        lint: 'eslint .',
                    },
                    dependencies: {
                        react: '^18.3.1',
                        'react-dom': '^18.3.1',
                        lucide: '^0.468.0',
                    },
                },
                null,
                2
            ),
            mtime: new Date(),
        },
        'tsconfig.json': {
            type: 'file',
            content: JSON.stringify(
                {
                    compilerOptions: {
                        target: 'ES2022',
                        module: 'ESNext',
                        jsx: 'react-jsx',
                        strict: true,
                    },
                },
                null,
                2
            ),
            mtime: new Date(),
        },
        'README.md': {
            type: 'file',
            content: '# Workspace\n\nFull-stack pair programming workspace.\n',
            mtime: new Date(),
        },
        src: {
            type: 'dir',
            children: {
                'App.tsx': {
                    type: 'file',
                    content: 'export function App() {\n  return <div>Workspace</div>\n}\n',
                    mtime: new Date(),
                },
                'index.tsx': {
                    type: 'file',
                    content:
                        "import React from 'react'\nimport ReactDOM from 'react-dom/client'\n\nconsole.log('App ready')\n",
                    mtime: new Date(),
                },
                components: {
                    type: 'dir',
                    children: {
                        'Header.tsx': {
                            type: 'file',
                            content: 'export const Header = () => <header>Workspace</header>\n',
                            mtime: new Date(),
                        },
                    },
                    mtime: new Date(),
                },
            },
            mtime: new Date(),
        },
        packages: {
            type: 'dir',
            children: {
                tui: {
                    type: 'dir',
                    children: {
                        'package.json': {
                            type: 'file',
                            content: '{\n  "name": "@december/tui",\n  "version": "0.1.0"\n}\n',
                            mtime: new Date(),
                        },
                    },
                    mtime: new Date(),
                },
            },
            mtime: new Date(),
        },
    }

    // Populate files from session diffs
    fileDiffs.forEach((fd) => {
        const parts = fd.filePath.split('/').filter(Boolean)
        let current = root
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (!current[part] || current[part].type !== 'dir') {
                current[part] = { type: 'dir', children: {}, mtime: new Date() }
            }
            current = (current[part] as { type: 'dir'; children: Record<string, FSNode> }).children
        }
        const fileName = parts[parts.length - 1]
        if (fileName) {
            current[fileName] = {
                type: 'file',
                content: fd.lines.map((l: any) => l.content).join('\n'),
                mtime: new Date(),
            }
        }
    })

    // Populate files from generatedFiles if present
    if (generatedFiles) {
        Object.entries(generatedFiles).forEach(([filePath, fileObj]) => {
            const parts = filePath
                .replace(/^\.?\//, '')
                .split('/')
                .filter(Boolean)
            let current = root
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i]
                if (!current[part] || current[part].type !== 'dir') {
                    current[part] = { type: 'dir', children: {}, mtime: new Date() }
                }
                current = (current[part] as { type: 'dir'; children: Record<string, FSNode> })
                    .children
            }
            const fileName = parts[parts.length - 1]
            if (fileName) {
                const content =
                    typeof fileObj === 'string' ? fileObj : (fileObj as any)?.content || ''
                current[fileName] = {
                    type: 'file',
                    content,
                    mtime: new Date(),
                }
            }
        })
    }

    return root
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({
    previewSessionId,
    generatedFiles,
}) => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)

    const messages = useAppStore((state) => state.messages)
    const fileDiffs = useMemo(() => extractSessionFileDiffs(messages), [messages])

    useEffect(() => {
        if (!terminalRef.current) return

        // Clean, minimal, non-distracting terminal color theme
        const xterm = new Terminal({
            theme: {
                background: '#141414',
                foreground: '#E4E4E7',
                cursor: '#E4E4E7',
                cursorAccent: '#141414',
                selectionBackground: 'rgba(255, 255, 255, 0.18)',
                black: '#18181B',
                red: '#EF4444',
                green: '#22C55E',
                yellow: '#EAB308',
                blue: '#3B82F6',
                magenta: '#A855F7',
                cyan: '#06B6D4',
                white: '#E4E4E7',
                brightBlack: '#71717A',
                brightRed: '#F87171',
                brightGreen: '#4ADE80',
                brightYellow: '#FDE047',
                brightBlue: '#60A5FA',
                brightMagenta: '#C084FC',
                brightCyan: '#38BDF8',
                brightWhite: '#FFFFFF',
            },
            fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
            fontSize: 13,
            lineHeight: 1.4,
            cursorBlink: true,
            cursorStyle: 'bar',
            cursorWidth: 2,
            cursorInactiveStyle: 'outline',
            convertEol: true,
            allowProposedApi: true,
        })

        const fitAddon = new FitAddon()
        xterm.loadAddon(fitAddon)
        xterm.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current = xterm
        fitAddonRef.current = fitAddon

        // Virtual Filesystem & Shell State
        const fsRoot = createInitialFS(fileDiffs, generatedFiles)
        let currentPath: string[] = [] // empty means ~/project root
        const commandHistory: string[] = []
        let historyIndex = -1
        let inputBuffer = ''
        let cursorPosition = 0

        // Helper to resolve directory node from path
        const resolveDir = (
            pathStr: string
        ): { dir: Record<string, FSNode>; path: string[] } | null => {
            const trimmed = pathStr.trim()
            if (!trimmed || trimmed === '.' || trimmed === './') {
                let curr = fsRoot
                for (const segment of currentPath) {
                    const node = curr[segment]
                    if (!node || node.type !== 'dir') return null
                    curr = node.children
                }
                return { dir: curr, path: [...currentPath] }
            }

            let startPath: string[] = []
            let curr = fsRoot

            if (!trimmed.startsWith('/') && !trimmed.startsWith('~')) {
                startPath = [...currentPath]
                for (const segment of startPath) {
                    const node = curr[segment]
                    if (!node || node.type !== 'dir') return null
                    curr = node.children
                }
            }

            const rawSegments = trimmed
                .replace(/^~?\/?/, '')
                .split('/')
                .filter(Boolean)
            const resolvedPath = [...startPath]

            for (const seg of rawSegments) {
                if (seg === '.') continue
                if (seg === '..') {
                    resolvedPath.pop()
                    curr = fsRoot
                    for (const s of resolvedPath) {
                        const node = curr[s]
                        if (!node || node.type !== 'dir') return null
                        curr = node.children
                    }
                } else {
                    const node = curr[seg]
                    if (!node || node.type !== 'dir') return null
                    curr = node.children
                    resolvedPath.push(seg)
                }
            }

            return { dir: curr, path: resolvedPath }
        }

        const resolveFile = (
            pathStr: string
        ): { parent: Record<string, FSNode>; name: string; node: FSNode | null } => {
            const parts = pathStr.trim().split('/')
            const fileName = parts.pop() || ''
            const dirPath = parts.join('/')
            const dirRes = resolveDir(dirPath)
            if (!dirRes) return { parent: {}, name: fileName, node: null }
            return { parent: dirRes.dir, name: fileName, node: dirRes.dir[fileName] || null }
        }

        const getDisplayPath = () => {
            if (currentPath.length === 0) return '~/project'
            return `~/project/${currentPath.join('/')}`
        }

        // Minimal, subtle terminal prompt (clean grey path, white $)
        const getPrompt = () => `\x1b[90m${getDisplayPath()}\x1b[0m $ `

        const writePrompt = () => {
            xterm.write(getPrompt())
            inputBuffer = ''
            cursorPosition = 0
            historyIndex = -1
        }

        // Check for live socket connection if previewSessionId is provided
        let socket: any = null
        let isConnectedToSocket = false

        if (previewSessionId) {
            import('socket.io-client').then(({ io }) => {
                import('@/shared/api/client').then(({ API_BASE_URL }) => {
                    const baseUrl = API_BASE_URL.replace('/api/v1', '')
                    socket = io(baseUrl, { path: '/socket.io/' })

                    socket.on('connect', () => {
                        isConnectedToSocket = true
                        socket.emit('join_session_terminal', { sessionId: previewSessionId })
                    })

                    socket.on('TERMINAL_DATA', (data: string) => {
                        xterm.write(data)
                    })

                    socket.on('disconnect', () => {
                        isConnectedToSocket = false
                        writePrompt()
                    })

                    socket.on('connect_error', () => {
                        isConnectedToSocket = false
                    })
                })
            })
        }

        // Start directly with the prompt (no banner box!)
        xterm.write(getPrompt())

        // Command Execution Engine
        const executeCommand = (cmdLine: string) => {
            const raw = cmdLine.trim()
            if (!raw) {
                writePrompt()
                return
            }

            commandHistory.push(raw)

            // Handle redirection (e.g. echo "hello" > file.txt)
            let isAppend = false
            let redirectFile: string | null = null
            let commandToRun = raw

            if (raw.includes('>>')) {
                isAppend = true
                const parts = raw.split('>>')
                commandToRun = parts[0].trim()
                redirectFile = parts[1]?.trim() || null
            } else if (raw.includes('>')) {
                const parts = raw.split('>')
                commandToRun = parts[0].trim()
                redirectFile = parts[1]?.trim() || null
            }

            const [cmd, ...args] = commandToRun.split(/\s+/)

            let outputBuffer: string[] = []
            const print = (text: string) => outputBuffer.push(text)

            switch (cmd) {
                case 'clear':
                    xterm.clear()
                    outputBuffer = []
                    xterm.write(getPrompt())
                    inputBuffer = ''
                    cursorPosition = 0
                    historyIndex = -1
                    return

                case 'pwd':
                    print(
                        `/home/december/project${currentPath.length > 0 ? '/' + currentPath.join('/') : ''}`
                    )
                    break

                case 'whoami':
                    print('december')
                    break

                case 'hostname':
                    print('december-workspace')
                    break

                case 'uname':
                    if (args.includes('-a')) {
                        print('Linux december-workspace 6.6.0-generic #1 SMP x86_64 GNU/Linux')
                    } else {
                        print('Linux')
                    }
                    break

                case 'date':
                    print(new Date().toUTCString())
                    break

                case 'uptime':
                    print(' 19:40:00 up 4:12,  1 user,  load average: 0.08, 0.03, 0.01')
                    break

                case 'which': {
                    const target = args[0]
                    const known = [
                        'bash',
                        'sh',
                        'git',
                        'node',
                        'bun',
                        'npm',
                        'pnpm',
                        'yarn',
                        'python',
                        'python3',
                        'cat',
                        'ls',
                        'mkdir',
                        'rm',
                        'cp',
                        'mv',
                        'grep',
                        'tree',
                        'echo',
                    ]
                    if (target && known.includes(target)) {
                        print(`/usr/bin/${target}`)
                    } else {
                        print(`which: no ${target || ''} in (/usr/local/bin:/usr/bin:/bin)`)
                    }
                    break
                }

                case 'cd': {
                    const target = args[0] || '~'
                    if (
                        target === '~' ||
                        target === '~/project' ||
                        target === '/home/december/project'
                    ) {
                        currentPath = []
                    } else {
                        const res = resolveDir(target)
                        if (res) {
                            currentPath = res.path
                        } else {
                            print(`cd: no such file or directory: ${target}`)
                        }
                    }
                    break
                }

                case 'ls':
                case 'll': {
                    const isLong =
                        cmd === 'll' ||
                        args.includes('-la') ||
                        args.includes('-l') ||
                        args.includes('-al')
                    const showAll =
                        isLong ||
                        args.includes('-a') ||
                        args.includes('-la') ||
                        args.includes('-al')
                    const targetPath = args.find((a) => !a.startsWith('-')) || '.'
                    const dirRes = resolveDir(targetPath)

                    if (!dirRes) {
                        print(`ls: cannot access '${targetPath}': No such file or directory`)
                        break
                    }

                    const entries = Object.entries(dirRes.dir)
                    if (entries.length === 0 && !showAll) {
                        break
                    }

                    if (isLong) {
                        print(`total ${entries.length * 4}`)
                        if (showAll) {
                            print(`drwxr-xr-x  2 december staff  128 Aug 14 19:30 .`)
                            print(`drwxr-xr-x  4 december staff  128 Aug 14 19:00 ..`)
                        }
                        entries.forEach(([name, node]) => {
                            const isDir = node.type === 'dir'
                            const perm = isDir ? 'drwxr-xr-x' : '-rw-r--r--'
                            const size = isDir ? 160 : (node as any).content?.length || 240
                            const nameFormatted = isDir ? `\x1b[1;34m${name}\x1b[0m` : name
                            print(
                                `${perm}  1 december staff  ${String(size).padStart(4, ' ')} Aug 14 19:35 ${nameFormatted}`
                            )
                        })
                    } else {
                        const names = entries.map(([name, node]) =>
                            node.type === 'dir' ? `\x1b[1;34m${name}\x1b[0m` : name
                        )
                        if (showAll) {
                            names.unshift('.', '..')
                        }
                        print(names.join('   '))
                    }
                    break
                }

                case 'cat': {
                    if (args.length === 0) {
                        print('cat: missing file operand')
                        break
                    }
                    for (const fileArg of args) {
                        const res = resolveFile(fileArg)
                        if (!res.node) {
                            print(`cat: ${fileArg}: No such file or directory`)
                        } else if (res.node.type === 'dir') {
                            print(`cat: ${fileArg}: Is a directory`)
                        } else {
                            print(res.node.content)
                        }
                    }
                    break
                }

                case 'head':
                case 'tail': {
                    const fileArg = args.find((a) => !a.startsWith('-'))
                    if (!fileArg) {
                        print(`${cmd}: missing file operand`)
                        break
                    }
                    const res = resolveFile(fileArg)
                    if (!res.node || res.node.type !== 'file') {
                        print(`${cmd}: ${fileArg}: No such file`)
                        break
                    }
                    const lines = res.node.content.split('\n')
                    const count = 10
                    const slice = cmd === 'head' ? lines.slice(0, count) : lines.slice(-count)
                    print(slice.join('\n'))
                    break
                }

                case 'grep': {
                    const pattern = args[0]
                    const fileArg = args[1]
                    if (!pattern || !fileArg) {
                        print('usage: grep <pattern> <file>')
                        break
                    }
                    const res = resolveFile(fileArg)
                    if (!res.node || res.node.type !== 'file') {
                        print(`grep: ${fileArg}: No such file`)
                        break
                    }
                    const lines = res.node.content.split('\n')
                    const matches = lines.filter((l) => l.includes(pattern))
                    if (matches.length > 0) {
                        print(matches.join('\n'))
                    }
                    break
                }

                case 'wc': {
                    const fileArg = args[0]
                    if (!fileArg) {
                        print('wc: missing file operand')
                        break
                    }
                    const res = resolveFile(fileArg)
                    if (!res.node || res.node.type !== 'file') {
                        print(`wc: ${fileArg}: No such file`)
                        break
                    }
                    const text = res.node.content
                    const lines = text.split('\n').length
                    const words = text.trim().split(/\s+/).length
                    const bytes = text.length
                    print(`  ${lines}  ${words}  ${bytes} ${fileArg}`)
                    break
                }

                case 'touch': {
                    if (args.length === 0) {
                        print('touch: missing file operand')
                        break
                    }
                    args.forEach((fileArg) => {
                        const res = resolveFile(fileArg)
                        if (res.parent) {
                            res.parent[res.name] = {
                                type: 'file',
                                content:
                                    res.node && res.node.type === 'file' ? res.node.content : '',
                                mtime: new Date(),
                            }
                        }
                    })
                    break
                }

                case 'mkdir': {
                    if (args.length === 0) {
                        print('mkdir: missing operand')
                        break
                    }
                    args.filter((a) => !a.startsWith('-')).forEach((dirArg) => {
                        const res = resolveFile(dirArg)
                        if (res.parent) {
                            if (res.parent[res.name]) {
                                print(`mkdir: cannot create directory '${dirArg}': File exists`)
                            } else {
                                res.parent[res.name] = {
                                    type: 'dir',
                                    children: {},
                                    mtime: new Date(),
                                }
                            }
                        }
                    })
                    break
                }

                case 'rm': {
                    if (args.length === 0) {
                        print('rm: missing operand')
                        break
                    }
                    const isRecursive = args.includes('-r') || args.includes('-rf')
                    args.filter((a) => !a.startsWith('-')).forEach((fileArg) => {
                        const res = resolveFile(fileArg)
                        if (!res.node) {
                            if (!args.includes('-f') && !args.includes('-rf')) {
                                print(`rm: cannot remove '${fileArg}': No such file or directory`)
                            }
                        } else if (res.node.type === 'dir' && !isRecursive) {
                            print(`rm: cannot remove '${fileArg}': Is a directory`)
                        } else {
                            delete res.parent[res.name]
                        }
                    })
                    break
                }

                case 'echo': {
                    const text = args.join(' ').replace(/^["']|["']$/g, '')
                    if (redirectFile) {
                        const res = resolveFile(redirectFile)
                        if (res.parent) {
                            const existing =
                                res.node && res.node.type === 'file' ? res.node.content : ''
                            res.parent[res.name] = {
                                type: 'file',
                                content: isAppend ? `${existing}\n${text}` : text,
                                mtime: new Date(),
                            }
                        }
                    } else {
                        print(text)
                    }
                    break
                }

                case 'tree': {
                    const renderTree = (dir: Record<string, FSNode>, prefix = ''): string[] => {
                        const entries = Object.entries(dir)
                        const lines: string[] = []
                        entries.forEach(([name, node], idx) => {
                            const isLast = idx === entries.length - 1
                            const branch = isLast ? '└── ' : '├── '
                            const subPrefix = isLast ? '    ' : '│   '
                            if (node.type === 'dir') {
                                lines.push(`${prefix}${branch}\x1b[1;34m${name}\x1b[0m`)
                                lines.push(...renderTree(node.children, prefix + subPrefix))
                            } else {
                                lines.push(`${prefix}${branch}${name}`)
                            }
                        })
                        return lines
                    }
                    print('\x1b[1;34m.\x1b[0m')
                    const curr = resolveDir('.')
                    if (curr) {
                        print(renderTree(curr.dir).join('\n'))
                    }
                    break
                }

                case 'git': {
                    const sub = args[0]
                    if (sub === 'status') {
                        print('On branch main')
                        print("Your branch is up to date with 'origin/main'.\n")
                        if (fileDiffs.length > 0) {
                            print('Changes not staged for commit:')
                            print('  (use "git add <file>..." to update what will be committed)\n')
                            fileDiffs.forEach((f) => {
                                const action = f.action === 'created' ? 'untracked' : 'modified'
                                const color = f.action === 'created' ? '\x1b[32m' : '\x1b[33m'
                                print(`\t${color}${action}:   ${f.filePath}\x1b[0m`)
                            })
                        } else {
                            print('nothing to commit, working tree clean')
                        }
                    } else if (sub === 'diff') {
                        if (fileDiffs.length > 0) {
                            fileDiffs.forEach((f) => {
                                print(`diff --git a/${f.filePath} b/${f.filePath}`)
                                print(`--- a/${f.filePath}`)
                                print(`+++ b/${f.filePath}`)
                                f.lines.forEach((line: any) => {
                                    if (line.type === 'added')
                                        print(`\x1b[32m+${line.content}\x1b[0m`)
                                    else if (line.type === 'deleted')
                                        print(`\x1b[31m-${line.content}\x1b[0m`)
                                    else if (line.type === 'context') print(` ${line.content}`)
                                })
                            })
                        } else {
                            print('No changes found.')
                        }
                    } else if (sub === 'log') {
                        print(
                            '\x1b[33mcommit 7e2d19f8a4b6c3d0e2f1a5b8c9d0e1f2a3b4c5d6\x1b[0m (\x1b[36mHEAD -> \x1b[32mmain\x1b[0m)'
                        )
                        print('Author: developer <dev@december.io>')
                        print('Date:   Fri Aug 14 19:30:00 2026 +0530\n')
                        print('    feat: enhance workspace preview and terminal environment\n')
                    } else if (sub === 'branch') {
                        print('* main')
                    } else if (
                        sub === 'add' ||
                        sub === 'commit' ||
                        sub === 'push' ||
                        sub === 'pull'
                    ) {
                        print(`[main] OK`)
                    } else {
                        print('git version 2.45.2')
                        print('Commands: status, diff, log, branch, add, commit, push, pull')
                    }
                    break
                }

                case 'node':
                    if (args.includes('-v') || args.includes('--version')) {
                        print('v22.12.0')
                    } else if (args[0] === '-e' && args[1]) {
                        try {
                            const res = eval(args.slice(1).join(' '))
                            if (res !== undefined) print(String(res))
                        } catch (err: any) {
                            print(err?.message || 'Error executing JS')
                        }
                    } else {
                        print('Welcome to Node.js v22.12.0.')
                    }
                    break

                case 'bun':
                    if (args.includes('-v') || args.includes('--version')) {
                        print('1.3.14')
                    } else if (args[0] === 'test') {
                        print('$ bun test')
                        print('(pass) Workspace > Diff parsing logic [0.2ms]')
                        print('(pass) Workspace > Interactive terminal shell [0.4ms]')
                        print('\n3 pass, 0 fail\nRan 3 tests. [72.00ms]')
                    } else if (args[0] === 'run' || args[0] === 'dev') {
                        print('$ vite dev')
                        print('  VITE v6.0.7  ready in 120 ms\n')
                        print('  ➜  Local:   http://localhost:5173/')
                    } else {
                        print('Bun v1.3.14 (0d9b296a)')
                    }
                    break

                case 'npm':
                    if (args.includes('-v') || args.includes('--version')) {
                        print('10.9.0')
                    } else if (
                        args[0] === 'run' ||
                        args[0] === 'start' ||
                        args[0] === 'build' ||
                        args[0] === 'dev'
                    ) {
                        print(`> workspace@0.1.0 ${args.join(' ')}`)
                        print('Done.')
                    } else {
                        print('npm v10.9.0')
                    }
                    break

                case 'python':
                case 'python3':
                    if (args.includes('--version') || args.includes('-V')) {
                        print('Python 3.12.3')
                    } else {
                        print('Python 3.12.3 (main, Apr 10 2026)')
                    }
                    break

                case 'env':
                case 'printenv':
                    print('SHELL=/bin/bash')
                    print('USER=december')
                    print('HOME=/home/december')
                    print('PATH=/usr/local/bin:/usr/bin:/bin')
                    print('TERM=xterm-256color')
                    print('LANG=en_US.UTF-8')
                    break

                case 'history':
                    commandHistory.forEach((h, idx) => {
                        print(`  ${idx + 1}  ${h}`)
                    })
                    break

                case 'help':
                    print('Available commands:')
                    print('  ls, ll, cd, pwd, cat, head, tail, touch, mkdir, rm, echo')
                    print('  grep, wc, tree, git, bun, node, npm, python, whoami, uname')
                    print('  date, uptime, env, history, clear')
                    break

                default:
                    print(`bash: ${cmd}: command not found`)
                    break
            }

            if (outputBuffer.length > 0) {
                outputBuffer.forEach((line) => xterm.writeln(line))
            }
            writePrompt()
        }

        // Terminal Keyboard Input & Line Editing
        xterm.onData((data) => {
            if (socket && isConnectedToSocket) {
                socket.emit('TERMINAL_INPUT', { sessionId: previewSessionId, data })
                return
            }

            // Enter key
            if (data === '\r') {
                xterm.write('\r\n')
                executeCommand(inputBuffer)
                return
            }

            // Backspace key (\u007F or \b)
            if (data === '\u007F' || data === '\b') {
                if (cursorPosition > 0) {
                    inputBuffer =
                        inputBuffer.slice(0, cursorPosition - 1) + inputBuffer.slice(cursorPosition)
                    cursorPosition--
                    // Redraw rest of the line
                    xterm.write('\b \b')
                }
                return
            }

            // Ctrl+C (Interrupt)
            if (data === '\u0003') {
                xterm.write('^C\r\n')
                writePrompt()
                return
            }

            // Ctrl+L (Clear screen)
            if (data === '\u000c') {
                xterm.clear()
                xterm.write(getPrompt() + inputBuffer)
                return
            }

            // Ctrl+U (Clear line before cursor)
            if (data === '\u0015') {
                while (cursorPosition > 0) {
                    xterm.write('\b \b')
                    cursorPosition--
                }
                inputBuffer = ''
                return
            }

            // Up Arrow (History backward)
            if (data === '\u001b[A') {
                if (commandHistory.length > 0) {
                    if (historyIndex === -1) historyIndex = commandHistory.length - 1
                    else if (historyIndex > 0) historyIndex--
                    const cmd = commandHistory[historyIndex]
                    while (cursorPosition > 0) {
                        xterm.write('\b \b')
                        cursorPosition--
                    }
                    inputBuffer = cmd
                    cursorPosition = cmd.length
                    xterm.write(cmd)
                }
                return
            }

            // Down Arrow (History forward)
            if (data === '\u001b[B') {
                if (historyIndex !== -1) {
                    if (historyIndex < commandHistory.length - 1) {
                        historyIndex++
                        const cmd = commandHistory[historyIndex]
                        while (cursorPosition > 0) {
                            xterm.write('\b \b')
                            cursorPosition--
                        }
                        inputBuffer = cmd
                        cursorPosition = cmd.length
                        xterm.write(cmd)
                    } else {
                        historyIndex = -1
                        while (cursorPosition > 0) {
                            xterm.write('\b \b')
                            cursorPosition--
                        }
                        inputBuffer = ''
                        cursorPosition = 0
                    }
                }
                return
            }

            // Left Arrow
            if (data === '\u001b[D') {
                if (cursorPosition > 0) {
                    cursorPosition--
                    xterm.write(data)
                }
                return
            }

            // Right Arrow
            if (data === '\u001b[C') {
                if (cursorPosition < inputBuffer.length) {
                    cursorPosition++
                    xterm.write(data)
                }
                return
            }

            // Tab (Autocomplete)
            if (data === '\t') {
                const availableCmds = [
                    'help',
                    'clear',
                    'pwd',
                    'cd',
                    'ls',
                    'll',
                    'cat',
                    'touch',
                    'mkdir',
                    'rm',
                    'echo',
                    'head',
                    'tail',
                    'grep',
                    'wc',
                    'tree',
                    'git',
                    'bun',
                    'node',
                    'npm',
                    'python',
                    'whoami',
                    'uname',
                    'date',
                    'uptime',
                    'history',
                ]
                const currDirNode = resolveDir('.')
                const fileNames = currDirNode ? Object.keys(currDirNode.dir) : []
                const candidates = [...availableCmds, ...fileNames]

                const words = inputBuffer.split(/\s+/)
                const lastWord = words[words.length - 1]
                if (lastWord) {
                    const match = candidates.find((c) => c.startsWith(lastWord) && c !== lastWord)
                    if (match) {
                        const completion = match.slice(lastWord.length)
                        inputBuffer += completion
                        cursorPosition = inputBuffer.length
                        xterm.write(completion)
                    }
                }
                return
            }

            // Standard printable characters
            if (data.length === 1 && data.charCodeAt(0) >= 32) {
                inputBuffer =
                    inputBuffer.slice(0, cursorPosition) + data + inputBuffer.slice(cursorPosition)
                cursorPosition++
                xterm.write(data)
            }
        })

        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit()
            }
        })
        resizeObserver.observe(terminalRef.current)

        return () => {
            resizeObserver.disconnect()
            xterm.dispose()
            if (socket) socket.disconnect()
        }
    }, [previewSessionId, fileDiffs, generatedFiles])

    return (
        <div className="flex-1 min-h-0 flex bg-[#141414] text-[#E4E4E7] font-sans w-full h-full select-none overflow-hidden">
            {/* Terminal Main xterm container */}
            <div
                className="flex-1 min-h-0 bg-[#141414] px-4 py-3 overflow-hidden"
                ref={terminalRef}
            />
        </div>
    )
}
