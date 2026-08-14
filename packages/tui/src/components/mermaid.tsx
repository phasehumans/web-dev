import { Box, Text, useFocus, useInput } from 'ink'
import React, { useState } from 'react'

type Props = {
    code: string
}

type Node = {
    id: string
    label: string
    shape: 'box' | 'round' | 'diamond' | 'database'
}

type Edge = {
    from: string
    to: string
    label?: string
    style: 'solid' | 'dashed' | 'thick'
}

type SequenceMessage = {
    from: string
    to: string
    text: string
    style: 'solid' | 'dashed'
}

type PieSlice = {
    label: string
    value: number
}

function parseFlowchart(code: string) {
    const lines = code.split(/\r?\n/)
    let direction = 'TD'
    const nodesMap = new Map<string, Node>()
    const edges: Edge[] = []

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('%%')) continue

        if (line.startsWith('graph') || line.startsWith('flowchart')) {
            const parts = line.split(/\s+/)
            if (parts.length > 1) {
                const dir = parts[1].toUpperCase()
                if (dir === 'LR' || dir === 'RL' || dir === 'TD' || dir === 'TB' || dir === 'BT') {
                    direction = dir
                }
            }
            continue
        }

        // Match edges like A[Client] -->|HTTP| B[Server] or A --> B
        const edgeRegex =
            /^([A-Za-z0-9_]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?\s*(-->|---|==>|-\.->)(?:\|(.*?)\|)?\s*([A-Za-z0-9_]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?/
        const match = line.match(edgeRegex)

        if (match) {
            const fromId = match[1]
            const fromLabel = match[2] || match[3] || match[4] || fromId
            const arrow = match[5]
            const edgeLabel = match[6]
            const toId = match[7]
            const toLabel = match[8] || match[9] || match[10] || toId

            if (!nodesMap.has(fromId)) {
                nodesMap.set(fromId, {
                    id: fromId,
                    label: fromLabel,
                    shape: match[2] ? 'box' : match[3] ? 'round' : match[4] ? 'diamond' : 'box',
                })
            }
            if (!nodesMap.has(toId)) {
                nodesMap.set(toId, {
                    id: toId,
                    label: toLabel,
                    shape: match[8] ? 'box' : match[9] ? 'round' : match[10] ? 'diamond' : 'box',
                })
            }

            edges.push({
                from: fromId,
                to: toId,
                label: edgeLabel,
                style: arrow === '==>' ? 'thick' : arrow === '-.->' ? 'dashed' : 'solid',
            })
            continue
        }

        // Match single node definition like A[Client]
        const nodeRegex = /^([A-Za-z0-9_]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})/
        const nodeMatch = line.match(nodeRegex)
        if (nodeMatch) {
            const id = nodeMatch[1]
            const label = nodeMatch[2] || nodeMatch[3] || nodeMatch[4] || id
            if (!nodesMap.has(id)) {
                nodesMap.set(id, {
                    id,
                    label,
                    shape: nodeMatch[2]
                        ? 'box'
                        : nodeMatch[3]
                          ? 'round'
                          : nodeMatch[4]
                            ? 'diamond'
                            : 'box',
                })
            }
        }
    }

    return { direction, nodes: Array.from(nodesMap.values()), edges }
}

function parseSequence(code: string) {
    const lines = code.split(/\r?\n/)
    const participantsSet = new Set<string>()
    const messages: SequenceMessage[] = []

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('%%') || line.startsWith('sequenceDiagram')) continue

        if (line.startsWith('participant ')) {
            const name = line.replace('participant ', '').trim()
            participantsSet.add(name)
            continue
        }

        // Match A->>B: Message or A-->>B: Message
        const msgMatch = line.match(
            /^([A-Za-z0-9_]+)\s*(->>|-->>|->)\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/
        )
        if (msgMatch) {
            const from = msgMatch[1]
            const arrow = msgMatch[2]
            const to = msgMatch[3]
            const text = msgMatch[4]

            participantsSet.add(from)
            participantsSet.add(to)
            messages.push({
                from,
                to,
                text,
                style: arrow.includes('--') ? 'dashed' : 'solid',
            })
        }
    }

    return { participants: Array.from(participantsSet), messages }
}

function parsePie(code: string) {
    const lines = code.split(/\r?\n/)
    let title = 'Chart'
    const slices: PieSlice[] = []

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('%%')) continue

        if (line.startsWith('pie')) {
            if (line.includes('title ')) {
                title = line.split('title ')[1].trim()
            }
            continue
        }

        const sliceMatch = line.match(/^"([^"]+)"\s*:\s*([0-9.]+)/)
        if (sliceMatch) {
            slices.push({
                label: sliceMatch[1],
                value: parseFloat(sliceMatch[2]),
            })
        }
    }

    return { title, slices }
}

export function Mermaid({ code }: Props) {
    const { isFocused } = useFocus({ autoFocus: true })
    const [showRaw, setShowRaw] = useState(false)

    useInput((input, key) => {
        if (
            (key.ctrl && ((key as any).name === 'o' || input?.toLowerCase() === 'o')) ||
            input === '\x0f'
        ) {
            setShowRaw((prev) => !prev)
        }
    })

    const firstLine =
        code
            .split(/\r?\n/)
            .map((l) => l.trim())
            .find((l) => l.length > 0 && !l.startsWith('%%')) || ''

    const isSequence = firstLine.startsWith('sequenceDiagram')
    const isPie = firstLine.startsWith('pie')
    const isFlowchart = firstLine.startsWith('graph') || firstLine.startsWith('flowchart')

    return (
        <Box
            flexDirection="column"
            paddingX={2}
            paddingY={1}
            borderStyle="round"
            borderColor="#A78BFA"
        >
            <Box justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Text color="#A78BFA" bold>
                    ❖ Mermaid Diagram (
                    {isSequence
                        ? 'sequence'
                        : isPie
                          ? 'pie'
                          : isFlowchart
                            ? 'flowchart'
                            : 'diagram'}
                    )
                </Text>
                <Text color="gray">({showRaw ? 'ctrl+o for visual' : 'ctrl+o for code'})</Text>
            </Box>

            {showRaw ? (
                <Box flexDirection="column" paddingLeft={1}>
                    <Text color="#AAAAAA">{code}</Text>
                </Box>
            ) : isSequence ? (
                <RenderSequence code={code} />
            ) : isPie ? (
                <RenderPie code={code} />
            ) : (
                <RenderFlowchart code={code} />
            )}
        </Box>
    )
}

function RenderFlowchart({ code }: { code: string }) {
    const { direction, nodes, edges } = parseFlowchart(code)

    if (nodes.length === 0) {
        return <Text color="#AAAAAA">{code}</Text>
    }

    const isLR = direction === 'LR' || direction === 'RL'

    return (
        <Box flexDirection="column" gap={1}>
            {isLR ? (
                <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1}>
                    {nodes.map((node, i) => {
                        const outgoingEdges = edges.filter((e) => e.from === node.id)
                        return (
                            <React.Fragment key={node.id}>
                                <Box borderStyle="round" borderColor="#89B4F8" paddingX={1}>
                                    <Text bold color="white">
                                        {node.label}
                                    </Text>
                                </Box>
                                {outgoingEdges.length > 0 && i < nodes.length - 1 && (
                                    <Box flexDirection="column" alignItems="center">
                                        {outgoingEdges[0].label && (
                                            <Text color="#A78BFA" italic>
                                                [{outgoingEdges[0].label}]
                                            </Text>
                                        )}
                                        <Text color="#89B4F8">
                                            {outgoingEdges[0].style === 'dashed'
                                                ? ' ┈► '
                                                : outgoingEdges[0].style === 'thick'
                                                  ? ' ══► '
                                                  : ' ──► '}
                                        </Text>
                                    </Box>
                                )}
                            </React.Fragment>
                        )
                    })}
                </Box>
            ) : (
                <Box flexDirection="column" alignItems="flex-start" gap={0}>
                    {nodes.map((node, i) => {
                        const outgoingEdges = edges.filter((e) => e.from === node.id)
                        return (
                            <Box key={node.id} flexDirection="column">
                                <Box borderStyle="round" borderColor="#89B4F8" paddingX={1}>
                                    <Text bold color="white">
                                        {node.label}
                                    </Text>
                                </Box>
                                {outgoingEdges.length > 0 && (
                                    <Box flexDirection="column" paddingLeft={3}>
                                        {outgoingEdges[0].label && (
                                            <Text color="#A78BFA" italic>
                                                [{outgoingEdges[0].label}]
                                            </Text>
                                        )}
                                        <Text color="#89B4F8">
                                            {outgoingEdges[0].style === 'dashed'
                                                ? '  ┆  \n  ▼  '
                                                : '  │  \n  ▼  '}
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        )
                    })}
                </Box>
            )}

            {edges.length > 0 && (
                <Box flexDirection="column" marginTop={1} paddingLeft={1}>
                    <Text color="gray" bold>
                        Connections:
                    </Text>
                    {edges.map((edge, idx) => {
                        const fromNode = nodes.find((n) => n.id === edge.from)?.label || edge.from
                        const toNode = nodes.find((n) => n.id === edge.to)?.label || edge.to
                        return (
                            <Text key={idx} color="#CCCCCC">
                                • {fromNode}{' '}
                                <Text color="#89B4F8">
                                    {edge.style === 'dashed' ? '┈►' : '──►'}
                                </Text>{' '}
                                {toNode}
                                {edge.label ? ` (${edge.label})` : ''}
                            </Text>
                        )
                    })}
                </Box>
            )}
        </Box>
    )
}

function RenderSequence({ code }: { code: string }) {
    const { participants, messages } = parseSequence(code)

    if (participants.length === 0) {
        return <Text color="#AAAAAA">{code}</Text>
    }

    return (
        <Box flexDirection="column" gap={1}>
            <Box flexDirection="row" gap={2}>
                {participants.map((p) => (
                    <Box key={p} borderStyle="single" borderColor="#89B4F8" paddingX={1}>
                        <Text bold color="white">
                            {p}
                        </Text>
                    </Box>
                ))}
            </Box>
            <Box flexDirection="column" paddingLeft={1} marginTop={1}>
                {messages.map((msg, idx) => (
                    <Text key={idx} color="#DDDDDD">
                        <Text color="#89B4F8" bold>
                            {msg.from}
                        </Text>{' '}
                        <Text color={msg.style === 'dashed' ? '#A78BFA' : '#89B4F8'}>
                            {msg.style === 'dashed' ? '◄┄┄' : '──►'}
                        </Text>{' '}
                        <Text color="#89B4F8" bold>
                            {msg.to}
                        </Text>
                        {': '}
                        <Text color="white">{msg.text}</Text>
                    </Text>
                ))}
            </Box>
        </Box>
    )
}

function RenderPie({ code }: { code: string }) {
    const { title, slices } = parsePie(code)
    const total = slices.reduce((sum, s) => sum + s.value, 0)

    if (slices.length === 0) {
        return <Text color="#AAAAAA">{code}</Text>
    }

    return (
        <Box flexDirection="column" gap={1}>
            <Text bold color="white">
                {title}
            </Text>
            {slices.map((slice, idx) => {
                const percentage = total > 0 ? Math.round((slice.value / total) * 100) : 0
                const filledWidth = Math.round((percentage / 100) * 20)
                const emptyWidth = 20 - filledWidth
                const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth)
                const color = idx % 2 === 0 ? '#89B4F8' : '#A78BFA'

                return (
                    <Box key={idx} flexDirection="row" gap={2}>
                        <Box width={15}>
                            <Text color="white">{slice.label}</Text>
                        </Box>
                        <Text color={color}>{bar}</Text>
                        <Text color="gray">{percentage}%</Text>
                    </Box>
                )
            })}
        </Box>
    )
}
