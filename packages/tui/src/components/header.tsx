import { execSync } from 'node:child_process'
import { homedir } from 'node:os'

import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../theme'

function getGitBranch(): string | null {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim()
    } catch {
        // Intentionally swallowed: fallback to null if git command is unavailable or non-git directory
        return null
    }
}

function getCwd(): string {
    try {
        const cwd = process.cwd()
        const home = homedir()
        return cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd
    } catch {
        // Intentionally swallowed: fallback to default home tilde path if process.cwd fails
        return '~'
    }
}

export function Header({
    cliVersion = '0.1.0',
    latestVersion,
    userEmail,
}: {
    cliVersion?: string
    latestVersion?: string
    userEmail?: string
}) {
    const cwd = getCwd()
    const branch = getGitBranch()

    return (
        <Box
            flexDirection="column"
            paddingX={THEME.padding.paddingX}
            paddingTop={1}
            paddingBottom={0}
        >
            <Text bold color={THEME.colors.text}>
                ✱ December CLI {cliVersion.replace(/^v/, '')}
            </Text>
            {userEmail && <Text color={THEME.colors.muted}>{userEmail}</Text>}
            <Box gap={1}>
                <Text color={THEME.colors.muted}>{cwd}</Text>
                {branch && <Text color={THEME.colors.muted}>({branch})</Text>}
            </Box>
            <Box flexDirection="column" marginTop={1}>
                <Text color={THEME.colors.brand}>Tips for getting started</Text>
                <Text color={THEME.colors.muted}>
                    Run /init to scaffold .december workspace for custom rules and skills
                </Text>
                <Text color={THEME.colors.muted}>
                    Use /handoff to continue this session in December (trydecember.com)
                </Text>
                {latestVersion && (
                    <Text color={THEME.colors.muted}>
                        Run /update to install December CLI {latestVersion}
                    </Text>
                )}
            </Box>
        </Box>
    )
}
