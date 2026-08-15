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
    totalLines?: number
    bottomContextLines?: number
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

export function parseDiffLines(diffText: string): DiffLine[] {
    const rawLines = diffText.split(/\r?\n/)
    const result: DiffLine[] = []

    let oldLineNum = 58
    let newLineNum = 58

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

export const SAMPLE_FILE_DIFFS: ParsedFileDiff[] = [
    {
        filePath: 'packages/tui/src/components/command-menu/index.tsx',
        directory: 'packages/tui/src/components/command-menu',
        fileName: 'index.tsx',
        repoName: 'december',
        action: 'modified',
        additions: 5,
        deletions: 2,
        totalLines: 57,
        bottomContextLines: 6,
        diff: `@@ -58,15 +58,18 @@
         onMouseDown={() => onExecute(i)}
     >
         <box width={COMMAND_COL_WIDTH} flexShrink={0}>
-            <text selectable={false} fg={isSelected ? 'black' : 'white'}>
+            <text selectable={false} fg={isSelected ? 'white' : colors.primary}>
                 /{cmd.name}
             </text>
         </box>
         <box flexGrow={1} flexShrink={1} overflow="hidden">
-            <text selectable={false} fg={isSelected ? 'black' : 'gray'}>
+            <text
+                selectable={false}
+                fg={isSelected ? 'white' : colors.dimSeparator}
+            >
                 {cmd.description}
             </text>
         </box>`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/components/dialogs/theme-dialog.tsx',
        directory: 'packages/tui/src/components/dialogs',
        fileName: 'theme-dialog.tsx',
        repoName: 'december',
        action: 'modified',
        additions: 2,
        deletions: 2,
        totalLines: 43,
        bottomContextLines: 9,
        diff: `@@ -44,11 +44,11 @@
         onSelect={handleSelect}
         onHighlight={handleHighlight}
         filterFn={(t, query) => t.name.toLowerCase().includes(query.toLowerCase())}
-        renderItem={(theme, isSelected) => (
-            <text selectable={false} fg={isSelected ? 'black' : 'white'}>
+        renderItem={(theme) => (
+            <text selectable={false} fg="white">
+                {theme.name === originalThemeRef.current.name
+                    ? '\\u0020\\u2022\\u0020'
+                    : '\\u0020\\u0020\\u0020'}
             </text>
         )}`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/components/header.tsx',
        directory: 'packages/tui/src/components',
        fileName: 'header.tsx',
        repoName: 'december',
        action: 'modified',
        additions: 43,
        deletions: 4,
        totalLines: 98,
        bottomContextLines: 12,
        diff: `@@ -15,10 +15,18 @@
 export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
-    return (
-        <box className="border-b border-gray-800">
-            <text>{title}</text>
-        </box>
-    )
+    return (
+        <box className="flex flex-row items-center justify-between px-3 py-1 bg-surface border-b border-white/10">
+            <box className="flex items-center gap-2">
+                <text className="font-bold text-white">{title}</text>
+                {subtitle && <text className="text-gray-400 text-xs">{subtitle}</text>}
+            </box>
+            <box className="flex items-center gap-1.5">
+                <text className="text-xs text-emerald-400">● Live</text>
+            </box>
+        </box>
+    )`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/components/input-bar.tsx',
        directory: 'packages/tui/src/components',
        fileName: 'input-bar.tsx',
        repoName: 'december',
        action: 'modified',
        additions: 45,
        deletions: 39,
        totalLines: 120,
        bottomContextLines: 8,
        diff: `@@ -30,12 +30,18 @@
 export const InputBar: React.FC<InputBarProps> = ({ onSubmit, placeholder }) => {
-    const [val, setVal] = useState('')
+    const [value, setValue] = useState('')
+    const [isFocused, setIsFocused] = useState(false)
+    return (
+        <box className={isFocused ? 'border-blue-500' : 'border-gray-700'}>
+            <input value={value} onChange={setValue} placeholder={placeholder} />
+        </box>
+    )`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/components/logo.tsx',
        directory: 'packages/tui/src/components',
        fileName: 'logo.tsx',
        repoName: 'december',
        action: 'created',
        additions: 20,
        deletions: 0,
        totalLines: 20,
        bottomContextLines: 4,
        diff: `@@ -0,0 +1,20 @@
+export const Logo = () => (
+    <box className="flex items-center gap-1">
+        <text className="text-white font-bold">December</text>
+    </box>
+)`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/components/session-shell.tsx',
        directory: 'packages/tui/src/components',
        fileName: 'session-shell.tsx',
        repoName: 'december',
        action: 'modified',
        additions: 1,
        deletions: 22,
        totalLines: 84,
        bottomContextLines: 7,
        diff: `@@ -18,22 +18,1 @@
-const legacyRunner = createRunner({
-    mode: 'headless',
-    timeout: 30000
-})
+const runner = createSessionRunner()`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/components/status-bar.tsx',
        directory: 'packages/tui/src/components',
        fileName: 'status-bar.tsx',
        repoName: 'december',
        action: 'modified',
        additions: 40,
        deletions: 7,
        totalLines: 90,
        bottomContextLines: 6,
        diff: `@@ -10,8 +10,12 @@
 export const StatusBar = ({ status, tokens }: StatusBarProps) => (
-    <box className="bg-black text-gray-400">
-        <text>{status}</text>
-    </box>
+    <box className="flex justify-between px-2 bg-[#121214] text-xs text-gray-400">
+        <text>{status}</text>
+        <text className="font-mono">{tokens} tokens</text>
+    </box>
 )`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/components/tips.tsx',
        directory: 'packages/tui/src/components',
        fileName: 'tips.tsx',
        repoName: 'december',
        action: 'created',
        additions: 28,
        deletions: 0,
        totalLines: 28,
        bottomContextLines: 5,
        diff: `@@ -0,0 +1,28 @@
+export const Tips = () => (
+    <box className="p-2 text-xs text-gray-500">
+        <text>Tip: Press / to open commands menu</text>
+    </box>
+)`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/screens/home.tsx',
        directory: 'packages/tui/src/screens',
        fileName: 'home.tsx',
        repoName: 'december',
        action: 'modified',
        additions: 8,
        deletions: 5,
        totalLines: 60,
        bottomContextLines: 9,
        diff: `@@ -12,6 +12,9 @@
 export const HomeScreen = () => (
-    <box>
-        <text>Home</text>
-    </box>
+    <box className="flex flex-col gap-2 p-4">
+        <Header title="December Workspace" />
+    </box>
 )`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/constants.ts',
        directory: 'packages/tui/src',
        fileName: 'constants.ts',
        repoName: 'december',
        action: 'created',
        additions: 16,
        deletions: 0,
        totalLines: 16,
        bottomContextLines: 4,
        diff: `@@ -0,0 +1,16 @@
+export const COMMAND_COL_WIDTH = 24
+export const MAX_LINES_VISIBLE = 20`,
        lines: [],
    },
    {
        filePath: 'packages/tui/src/theme.ts',
        directory: 'packages/tui/src',
        fileName: 'theme.ts',
        repoName: 'december',
        action: 'modified',
        additions: 18,
        deletions: 1,
        totalLines: 35,
        bottomContextLines: 6,
        diff: `@@ -5,2 +5,19 @@
 export const theme = {
-    primary: '#3B82F6'
+    primary: '#87B2F4',
+    surface: '#141414',
+    text: '#EDEDED'
 }`,
        lines: [],
    },
    {
        filePath: 'tmp/braille2.py',
        directory: 'tmp',
        fileName: 'braille2.py',
        repoName: 'december',
        action: 'created',
        additions: 42,
        deletions: 0,
        totalLines: 42,
        bottomContextLines: 8,
        diff: `@@ -0,0 +1,42 @@
+def render_braille2():
+    pass`,
        lines: [],
    },
    {
        filePath: 'tmp/braille.py',
        directory: 'tmp',
        fileName: 'braille.py',
        repoName: 'december',
        action: 'created',
        additions: 48,
        deletions: 0,
        totalLines: 48,
        bottomContextLines: 8,
        diff: `@@ -0,0 +1,48 @@
+def render_braille():
+    pass`,
        lines: [],
    },
].map((item) => ({
    ...item,
    action: item.action as 'created' | 'modified' | 'deleted',
    lines: parseDiffLines(item.diff),
}))

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

    if (diffMap.size === 0) {
        return SAMPLE_FILE_DIFFS
    }

    return Array.from(diffMap.values())
}
