export interface SkillMetadata {
    name: string
    description: string
    argumentHint?: string
    license?: string
    tags?: string[]
    model?: {
        recommended?: string
        temperature?: number
    }
    disable?: boolean
    dependencies?: {
        bins?: string[]
        skills?: string[]
    }
}

export type SkillOrigin =
    | 'workspace'
    | 'declared'
    | 'workspace-plugin'
    | 'global'
    | 'global-plugin'
    | 'builtin'

export interface DiscoveredSkill {
    name: string
    metadata: SkillMetadata
    directoryPath: string
    entryFilePath: string // Absolute path to SKILL.md
    origin: SkillOrigin
    scripts: string[]
    references: string[]
    examples?: string[]
    resources?: string[]
}

export interface SkillsConfigEntry {
    path: string
    include_only?: string[]
    exclude?: string[]
}

export interface SkillsConfigFile {
    inherits?: SkillsConfigEntry[]
    entries?: SkillsConfigEntry[]
}
