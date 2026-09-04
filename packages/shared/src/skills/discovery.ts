import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { parseSkillFile } from './parser'

import type { DiscoveredSkill, SkillOrigin, SkillsConfigFile } from './types'

export interface SkillDiscoveryOptions {
    workspaceDir?: string
    homeDir?: string
    builtinDir?: string
}

export class SkillDiscoveryEngine {
    private workspaceDir: string
    private homeDir: string
    private builtinDir?: string

    constructor(options: SkillDiscoveryOptions = {}) {
        this.workspaceDir = path.resolve(options.workspaceDir || process.cwd())
        this.homeDir = options.homeDir || os.homedir()
        this.builtinDir = options.builtinDir
    }

    public discoverAllSkills(): DiscoveredSkill[] {
        const skillMap = new Map<string, DiscoveredSkill>()

        // 1. Scan Builtin Skills (Lowest Precedence)
        this.scanBuiltinSkills(skillMap)

        // 2. Scan Global Declared Skills (~/.config/december/skills.json)
        this.scanGlobalDeclaredSkills(skillMap)

        // 3. Scan Global Plugins
        this.scanGlobalPluginSkills(skillMap)

        // 4. Scan Global User Skills (~/.config/december/skills, ~/.gemini/config/skills)
        this.scanGlobalUserSkills(skillMap)

        // 5. Scan Workspace Plugins
        this.scanWorkspacePluginSkills(skillMap)

        // 6. Scan Workspace Declared Skills
        this.scanWorkspaceDeclaredSkills(skillMap)

        // 7. Scan Workspace Local Skills (.december/skills, .agents/skills) (Highest Precedence)
        this.scanWorkspaceLocalSkills(skillMap)

        // Sort alphabetically by canonical name for prompt cache stability
        return Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    }

    private scanDirectoryForSkills(
        skillsDir: string,
        origin: SkillOrigin,
        map: Map<string, DiscoveredSkill>
    ) {
        if (!fs.existsSync(skillsDir)) return

        try {
            const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
            for (const entry of entries) {
                if (!entry.isDirectory()) continue
                const skillDir = path.join(skillsDir, entry.name)
                let skillMdPath = path.join(skillDir, 'SKILL.md')
                if (!fs.existsSync(skillMdPath)) {
                    const lowercasePath = path.join(skillDir, 'skill.md')
                    if (fs.existsSync(lowercasePath)) {
                        skillMdPath = lowercasePath
                    }
                }

                if (fs.existsSync(skillMdPath)) {
                    try {
                        const { metadata } = parseSkillFile(skillMdPath)
                        if (metadata.disable) continue

                        const scriptsDir = path.join(skillDir, 'scripts')
                        const referencesDir = path.join(skillDir, 'references')
                        const examplesDir = path.join(skillDir, 'examples')
                        const resourcesDir = path.join(skillDir, 'resources')

                        const listFiles = (dir: string) => {
                            if (!fs.existsSync(dir)) return []
                            try {
                                return fs
                                    .readdirSync(dir)
                                    .map((f) => path.join(dir, f))
                                    .filter((p) => {
                                        try {
                                            return fs.statSync(p).isFile()
                                        } catch {
                                            // Intentionally swallowed: inaccessible stat
                                            return false
                                        }
                                    })
                            } catch {
                                // Intentionally swallowed: unreadable directory
                                return []
                            }
                        }

                        const scripts = listFiles(scriptsDir)
                        const references = listFiles(referencesDir)
                        const examples = listFiles(examplesDir)
                        const resources = listFiles(resourcesDir)

                        map.set(metadata.name, {
                            name: metadata.name,
                            metadata,
                            directoryPath: skillDir,
                            entryFilePath: skillMdPath,
                            origin,
                            scripts,
                            references,
                            examples,
                            resources,
                        })
                    } catch {
                        // Intentionally swallowed: malformed or invalid skill file
                    }
                }
            }
        } catch {
            // Intentionally swallowed: unreadable directory
        }
    }

    private scanBuiltinSkills(map: Map<string, DiscoveredSkill>) {
        // Antigravity builtin CLI skills
        const antigravityBuiltin = path.join(
            this.homeDir,
            '.gemini',
            'antigravity-cli',
            'builtin',
            'skills'
        )
        this.scanDirectoryForSkills(antigravityBuiltin, 'builtin', map)

        if (this.builtinDir && fs.existsSync(this.builtinDir)) {
            this.scanDirectoryForSkills(this.builtinDir, 'builtin', map)
        }
    }

    private scanGlobalDeclaredSkills(map: Map<string, DiscoveredSkill>) {
        const globalJson = path.join(this.homeDir, '.config', 'december', 'skills.json')
        this.scanDeclaredConfigFile(globalJson, 'declared', map)
    }

    private scanGlobalPluginSkills(map: Map<string, DiscoveredSkill>) {
        const decemberPlugins = path.join(this.homeDir, '.config', 'december', 'plugins')
        const geminiPlugins = path.join(this.homeDir, '.gemini', 'config', 'plugins')
        this.scanPluginsDir(decemberPlugins, 'global-plugin', map)
        this.scanPluginsDir(geminiPlugins, 'global-plugin', map)
    }

    private scanGlobalUserSkills(map: Map<string, DiscoveredSkill>) {
        const candidateGlobalDirs = [
            path.join(this.homeDir, '.config', 'devin', 'skills'),
            path.join(this.homeDir, '.claude', 'skills'),
            path.join(this.homeDir, '.gemini', 'skills'),
            path.join(this.homeDir, '.gemini', 'antigravity-cli', 'skills'),
            path.join(this.homeDir, '.gemini', 'config', 'skills'),
            path.join(this.homeDir, '.agents', 'skills'),
            path.join(this.homeDir, '.agent', 'skills'),
            path.join(this.homeDir, '.config', 'december', 'skills'),
        ]

        for (const dir of candidateGlobalDirs) {
            this.scanDirectoryForSkills(dir, 'global', map)
        }
    }

    private getWorkspaceRoots(): string[] {
        const roots: string[] = []
        let currentDir = this.workspaceDir

        while (true) {
            roots.push(currentDir)
            if (fs.existsSync(path.join(currentDir, '.git'))) break
            const parent = path.dirname(currentDir)
            if (parent === currentDir) break
            currentDir = parent
        }

        // Return from root down to workspaceDir so deeper workspace directories override upper roots
        return roots.reverse()
    }

    private scanWorkspacePluginSkills(map: Map<string, DiscoveredSkill>) {
        for (const root of this.getWorkspaceRoots()) {
            this.scanPluginsDir(path.join(root, '.agents', 'plugins'), 'workspace-plugin', map)
            this.scanPluginsDir(path.join(root, '.december', 'plugins'), 'workspace-plugin', map)
        }
    }

    private scanWorkspaceDeclaredSkills(map: Map<string, DiscoveredSkill>) {
        for (const root of this.getWorkspaceRoots()) {
            this.scanDeclaredConfigFile(path.join(root, '.agents', 'skills.json'), 'declared', map)
            this.scanDeclaredConfigFile(
                path.join(root, '.december', 'skills.json'),
                'declared',
                map
            )
        }
    }

    private scanWorkspaceLocalSkills(map: Map<string, DiscoveredSkill>) {
        for (const root of this.getWorkspaceRoots()) {
            this.scanDirectoryForSkills(path.join(root, '.claude', 'skills'), 'workspace', map)
            this.scanDirectoryForSkills(path.join(root, '.agent', 'skills'), 'workspace', map)
            this.scanDirectoryForSkills(path.join(root, '.agents', 'skills'), 'workspace', map)
            this.scanDirectoryForSkills(path.join(root, '.december', 'skills'), 'workspace', map)
        }
    }

    private scanPluginsDir(
        pluginsDir: string,
        origin: SkillOrigin,
        map: Map<string, DiscoveredSkill>
    ) {
        if (!fs.existsSync(pluginsDir)) return
        try {
            const pluginEntries = fs.readdirSync(pluginsDir, { withFileTypes: true })
            for (const p of pluginEntries) {
                if (!p.isDirectory()) continue
                const pluginSkillsDir = path.join(pluginsDir, p.name, 'skills')
                this.scanDirectoryForSkills(pluginSkillsDir, origin, map)
            }
        } catch {
            // Intentionally swallowed: unreadable plugins directory
        }
    }

    private scanDeclaredConfigFile(
        configPath: string,
        origin: SkillOrigin,
        map: Map<string, DiscoveredSkill>
    ) {
        if (!fs.existsSync(configPath)) return
        try {
            const content = fs.readFileSync(configPath, 'utf8')
            const parsed = JSON.parse(content) as SkillsConfigFile
            if (Array.isArray(parsed.entries)) {
                const baseDir = path.dirname(configPath)
                for (const entry of parsed.entries) {
                    if (entry.path) {
                        const targetDir = path.isAbsolute(entry.path)
                            ? entry.path
                            : path.resolve(baseDir, entry.path)
                        this.scanDirectoryForSkills(targetDir, origin, map)
                    }
                }
            }
        } catch {
            // Intentionally swallowed: unparseable skills.json config
        }
    }
}
