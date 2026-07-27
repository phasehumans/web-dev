import { Box, Text } from 'ink'

function getModelLabel(id: string) {
    return id
}
function getModelContextWindow(id: string) {
    return 128000
}

export function ContextSelectMenu(props: any) {
    const { agent, handleContextSelect } = props
    const activeModelId = agent.modelOptions?.model || 'gemini-3.6-flash'
    const currentModelName = getModelLabel(activeModelId)
    const maxTokens = getModelContextWindow(activeModelId)

    const userTokens = Math.round(
        agent.messages
            .filter((m) => m.role === 'user')
            .reduce((acc, m) => acc + (m.content?.length || 0) / 4, 0)
    )
    const agentTokens = Math.round(
        agent.messages
            .filter((m) => m.role === 'assistant')
            .reduce((acc, m) => acc + (m.content?.length || 0) / 4, 0)
    )
    const toolTokens = Math.round(
        agent.messages.reduce(
            (acc, m) => acc + (m.toolCalls ? JSON.stringify(m.toolCalls).length / 4 : 0),
            0
        )
    )
    const sysTokens = Math.round((agent.systemPrompt?.length || 0) / 4)
    const totalTokens = userTokens + agentTokens + toolTokens + sysTokens
    const freeTokens = Math.max(0, maxTokens - totalTokens)

    const pct = (n: number) => ((n / maxTokens) * 100).toFixed(1)
    const formatK = (n: number) => (n > 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString())

    const totalSquares = 200
    const squares = []
    let filled = 0
    const addSquares = (count: number, char: string, color: string) => {
        for (let i = 0; i < count && filled < totalSquares; i++) {
            squares.push(
                <Text key={filled} color={color}>
                    {char}
                </Text>
            )
            filled++
        }
    }
    addSquares(Math.round((userTokens / maxTokens) * totalSquares), '●', '#89B4F8') // blue
    addSquares(Math.round((agentTokens / maxTokens) * totalSquares), '●', '#6EE7B7') // green
    addSquares(Math.round((toolTokens / maxTokens) * totalSquares), '●', '#FCD34D') // yellow
    addSquares(Math.round((sysTokens / maxTokens) * totalSquares), '●', '#AAAAAA') // grey

    while (filled < totalSquares) {
        squares.push(
            <Text key={filled} color="#444444">
                □
            </Text>
        )
        filled++
    }

    const gridRows = []
    for (let i = 0; i < totalSquares; i += 20) {
        gridRows.push(
            <Box key={i} gap={1}>
                {squares.slice(i, i + 20)}
            </Box>
        )
    }

    return (
        <Box flexDirection="column" paddingX={1}>
            <Box marginBottom={1}>
                <Text bold color="white">
                    Context
                </Text>
            </Box>
            <Box flexDirection="row" gap={4}>
                <Box flexDirection="column">{gridRows}</Box>

                <Box flexDirection="column">
                    <Box gap={1}>
                        <Text color="#AAAAAA">
                            {currentModelName} · {formatK(totalTokens)}/{formatK(maxTokens)} tokens
                            ({pct(totalTokens)}%)
                        </Text>
                    </Box>
                    <Box marginTop={1}>
                        <Text color="white">Token usage by category</Text>
                    </Box>
                    <Box flexDirection="column">
                        <Box gap={1}>
                            <Text color="#89B4F8">●</Text>
                            <Text color="#AAAAAA">
                                User messages: {formatK(userTokens)} tokens ({pct(userTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color="#6EE7B7">●</Text>
                            <Text color="#AAAAAA">
                                Agent responses: {formatK(agentTokens)} tokens ({pct(agentTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color="#FCD34D">●</Text>
                            <Text color="#AAAAAA">
                                Tool calls: {formatK(toolTokens)} tokens ({pct(toolTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color="#AAAAAA">●</Text>
                            <Text color="#AAAAAA">
                                System prompt: {formatK(sysTokens)} tokens ({pct(sysTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color="#444444">□</Text>
                            <Text color="#AAAAAA">
                                Free space: {formatK(freeTokens)} ({pct(freeTokens)}%)
                            </Text>
                        </Box>
                    </Box>
                </Box>
            </Box>
            <Box paddingTop={1}>
                <Box gap={1}>
                    <Text color="#89B4F8">esc</Text>
                    <Text color="#AAAAAA">Cancel</Text>
                </Box>
            </Box>
        </Box>
    )
}
