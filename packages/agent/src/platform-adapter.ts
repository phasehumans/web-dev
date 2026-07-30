export interface PlatformAdapter {
    fs: {
        readFile: (path: string) => Promise<string>
        writeFile: (path: string, content: string) => Promise<void>
        readdir: (path: string) => Promise<string[]>
        mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
        exists: (path: string) => Promise<boolean>
    }
    bash: {
        exec: (
            command: string,
            onData?: (chunk: string) => void
        ) => Promise<{ exitCode: number | null; output: string; taskId?: string }>
        getTaskStatus?: (taskId: string) => Promise<{ status: string; output: string }>
        killTask?: (taskId: string) => Promise<boolean>
    }
    search: {
        find: (path: string, query: string) => Promise<string>
        grep: (path: string, query: string) => Promise<string>
    }
    ui?: {
        askQuestion: (
            questions: Array<{ question: string; options: string[]; is_multi_select?: boolean }>
        ) => Promise<string>
        requestPermission?: (toolCall: any) => Promise<{ block: boolean; reason?: string }>
    }
    env: {
        cwd: () => string
        get: (key: string) => string | undefined
    }
    browser?: {
        navigate: (url: string) => Promise<{ text: string; vncUrl?: string; error?: string }>
    }
}
