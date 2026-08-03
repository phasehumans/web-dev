import { execSync } from 'node:child_process'
import { homedir } from 'node:os'

import { Box, Text } from 'ink'
import React from 'react'

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
        <Box flexDirection="column" paddingLeft={2} paddingTop={1} paddingBottom={0}>
            <Text bold color="white">
                ✱ December CLI {cliVersion.replace(/^v/, '')}
            </Text>
            {userEmail && <Text color="gray">{userEmail}</Text>}
            <Box gap={1}>
                <Text color="gray">{cwd}</Text>
                {branch && <Text color="gray">({branch})</Text>}
            </Box>
            <Box flexDirection="column" marginTop={1}>
                <Text color="#89B4F8">Tips for getting started</Text>
                <Text color="gray">
                    Run /init to scaffold .december workspace for custom rules and skills
                </Text>
                <Text color="gray">
                    Use /handoff to continue this session in December (trydecember.com)
                </Text>
                {latestVersion && (
                    <Text color="gray">Run /update to upgrade to {latestVersion}</Text>
                )}
            </Box>
        </Box>
    )
}
