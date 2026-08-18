import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export class PromptHistory {
    private historyPath: string
    private entries: string[] = []
    private cursor: number = -1
    private currentDraft: string = ''

    constructor(customPath?: string) {
        this.historyPath = customPath || path.join(os.homedir(), '.december', 'history')
        this.load()
    }

    private load(): void {
        try {
            if (fs.existsSync(this.historyPath)) {
                const raw = fs.readFileSync(this.historyPath, 'utf8')
                this.entries = raw
                    .split(/\r?\n/)
                    .map((l) => l.trim())
                    .filter(Boolean)
            }
        } catch {
            // Intentionally swallowed: fallback to empty history if file is unreadable
            this.entries = []
        }
        this.cursor = this.entries.length
    }

    public append(prompt: string): void {
        const trimmed = prompt.trim()
        if (!trimmed) return

        this.entries.push(trimmed)
        this.cursor = this.entries.length
        this.currentDraft = ''

        try {
            const dir = path.dirname(this.historyPath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            fs.appendFileSync(this.historyPath, trimmed + '\n', 'utf8')
        } catch {
            // Intentionally swallowed: ignore write failures in read-only filesystems
        }
    }

    public getPrevious(draft: string): string {
        if (this.entries.length === 0) return draft

        if (this.cursor === this.entries.length) {
            this.currentDraft = draft
        }

        if (this.cursor > 0) {
            this.cursor--
            return this.entries[this.cursor] || draft
        }

        return this.entries[0] || draft
    }

    public getNext(): string {
        if (this.cursor < this.entries.length - 1) {
            this.cursor++
            return this.entries[this.cursor] || ''
        }

        this.cursor = this.entries.length
        return this.currentDraft
    }

    public resetCursor(): void {
        this.cursor = this.entries.length
        this.currentDraft = ''
    }

    public getEntries(): string[] {
        return [...this.entries]
    }
}

export const defaultPromptHistory = new PromptHistory()
