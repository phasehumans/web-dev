import { Box, Text } from 'ink'

export function TasksModeMenu(props: any) {
    const { tasksData, taskViewingId, taskScrollOffset, taskSelectedIndex } = props
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return '#fef08a'
            case 'completed':
                return '#6EE7B7'
            case 'failed':
            case 'killed':
                return '#FCA5A5'
            default:
                return 'white'
        }
    }

    if (taskViewingId) {
        const task = tasksData.find((t) => t.id === taskViewingId)
        if (task) {
            const outputLines = task.output.split('\\n')
            const visibleLines = outputLines.slice(taskScrollOffset, taskScrollOffset + 15)
            return (
                <Box flexDirection="column" paddingX={1}>
                    <Box marginBottom={1} justifyContent="space-between">
                        <Text bold color="white">
                            Task: {task.id}
                        </Text>
                        <Text bold color={getStatusColor(task.status)}>
                            [{task.status.toUpperCase()}]
                        </Text>
                    </Box>
                    <Box marginBottom={1}>
                        <Text color="#AAAAAA" bold>
                            Cmd: {task.command}
                        </Text>
                    </Box>
                    <Box
                        borderColor="#333333"
                        borderStyle="round"
                        flexDirection="column"
                        minHeight={8}
                        paddingX={1}
                    >
                        {visibleLines.length === 0 ||
                        (visibleLines.length === 1 && visibleLines[0] === '') ? (
                            <Text color="gray">[No output recorded yet]</Text>
                        ) : (
                            visibleLines.map((line, idx) => (
                                <Text key={idx} color="white">
                                    {line}
                                </Text>
                            ))
                        )}
                    </Box>
                    <Box marginTop={1} justifyContent="space-between">
                        <Text color="gray">
                            Showing lines {Math.min(outputLines.length, taskScrollOffset + 1)}-
                            {Math.min(outputLines.length, taskScrollOffset + visibleLines.length)}{' '}
                            of {outputLines.length}
                        </Text>
                    </Box>
                    <Box paddingTop={1}>
                        <Text color="#555555">↑/↓ Scroll Line · ←/→ Page · esc Cancel</Text>
                    </Box>
                </Box>
            )
        }
    } else {
        return (
            <Box flexDirection="column" paddingX={1}>
                <Box marginBottom={1}>
                    <Text bold color="white">
                        Tasks
                    </Text>
                </Box>
                {tasksData.length === 0 ? (
                    <Box paddingLeft={2}>
                        <Text color="#555555">No background tasks.</Text>
                    </Box>
                ) : (
                    tasksData.map((task, idx) => {
                        const isSelected = idx === taskSelectedIndex
                        const truncatedCommand =
                            task.command.length > 50
                                ? task.command.slice(0, 47) + '...'
                                : task.command
                        return (
                            <Box key={task.id} flexDirection="row">
                                <Box width={2}>
                                    <Text color={isSelected ? '#89B4F8' : 'white'}>
                                        {isSelected ? '> ' : '  '}
                                    </Text>
                                </Box>
                                <Box width={25}>
                                    <Text color={isSelected ? 'white' : '#AAAAAA'} wrap="truncate">
                                        {task.id}
                                    </Text>
                                </Box>
                                <Box width={15}>
                                    <Text color={getStatusColor(task.status)}>
                                        [{task.status.toUpperCase()}]
                                    </Text>
                                </Box>
                                <Box>
                                    <Text color={isSelected ? 'white' : 'gray'}>
                                        {truncatedCommand}
                                    </Text>
                                </Box>
                            </Box>
                        )
                    })
                )}
                <Box paddingTop={1}>
                    <Box gap={1}>
                        <Text color="#89B4F8">↑/↓</Text>
                        <Text color="#AAAAAA">Navigate</Text>
                        <Text color="#AAAAAA">·</Text>
                        <Text color="#89B4F8">←/→</Text>
                        <Text color="#AAAAAA">Page</Text>
                        <Text color="#AAAAAA">·</Text>
                        <Text color="#89B4F8">enter</Text>
                        <Text color="#AAAAAA">View output</Text>
                        <Text color="#AAAAAA">·</Text>
                        <Text color="#89B4F8">k</Text>
                        <Text color="#AAAAAA">Kill Task</Text>
                        <Text color="#AAAAAA">·</Text>
                        <Text color="#89B4F8">esc</Text>
                        <Text color="#AAAAAA">Cancel</Text>
                    </Box>
                </Box>
            </Box>
        )
    }
}
