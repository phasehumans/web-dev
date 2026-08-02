import { highlight } from 'cli-highlight'
import { Box, Text } from 'ink'
import { marked } from 'marked'
import React from 'react'

import { Mermaid } from './mermaid'

type Props = {
    children: string
}

function renderTableCell(cell: any, index: number): React.ReactNode {
    if (cell?.tokens && Array.isArray(cell.tokens)) {
        return <Text key={index}>{cell.tokens.map((t: any, i: number) => renderToken(t, i))}</Text>
    }
    return <Text key={index}>{cell?.text || cell?.raw || ''}</Text>
}

function getCellTextLength(cell: any): number {
    if (!cell) return 0
    if (typeof cell === 'string') return cell.length
    if (cell.text) return cell.text.length
    if (cell.tokens && Array.isArray(cell.tokens)) {
        return cell.tokens.reduce(
            (acc: number, t: any) => acc + (t.text?.length || t.raw?.length || 0),
            0
        )
    }
    return cell.raw?.length || 0
}

function Table({ token }: { token: any }) {
    const headers = token.header || []
    const rows = token.rows || []

    if (headers.length === 0 && rows.length === 0) {
        return <Text>{token.raw}</Text>
    }

    const colCount = Math.max(headers.length, ...rows.map((r: any[]) => r.length))
    const colWidths: number[] = []

    for (let c = 0; c < colCount; c++) {
        let maxLen = headers[c] ? getCellTextLength(headers[c]) : 0
        for (const row of rows) {
            if (row[c]) {
                maxLen = Math.max(maxLen, getCellTextLength(row[c]))
            }
        }
        colWidths[c] = Math.min(Math.max(maxLen, 3), 40)
    }

    const topBorder = `┌${colWidths.map((w) => '─'.repeat(w + 2)).join('┬')}┐`
    const headerSep = `├${colWidths.map((w) => '─'.repeat(w + 2)).join('┼')}┤`
    const bottomBorder = `└${colWidths.map((w) => '─'.repeat(w + 2)).join('┴')}┘`

    return (
        <Box flexDirection="column" marginY={1}>
            <Text color="#555555">{topBorder}</Text>
            {headers.length > 0 && (
                <>
                    <Box flexDirection="row">
                        <Text color="#555555">│</Text>
                        {headers.map((cell: any, c: number) => (
                            <React.Fragment key={c}>
                                <Box width={colWidths[c] + 2} paddingX={1}>
                                    <Text bold color="white">
                                        {renderTableCell(cell, c)}
                                    </Text>
                                </Box>
                                <Text color="#555555">│</Text>
                            </React.Fragment>
                        ))}
                    </Box>
                    <Text color="#555555">{headerSep}</Text>
                </>
            )}
            {rows.map((row: any[], r: number) => (
                <Box flexDirection="row" key={r}>
                    <Text color="#555555">│</Text>
                    {row.map((cell: any, c: number) => (
                        <React.Fragment key={c}>
                            <Box width={colWidths[c] + 2} paddingX={1}>
                                {renderTableCell(cell, c)}
                            </Box>
                            <Text color="#555555">│</Text>
                        </React.Fragment>
                    ))}
                </Box>
            ))}
            <Text color="#555555">{bottomBorder}</Text>
        </Box>
    )
}

const renderToken = (token: any, index: number): React.ReactNode => {
    switch (token.type) {
        case 'paragraph':
            return (
                <Text key={index}>
                    {token.tokens?.map((t: any, i: number) => renderToken(t, i))}
                </Text>
            )
        case 'text':
            if ('tokens' in token && token.tokens) {
                return (
                    <Text key={index}>
                        {token.tokens.map((t: any, i: number) => renderToken(t, i))}
                    </Text>
                )
            }
            return <Text key={index}>{token.text || token.raw}</Text>
        case 'strong':
            return (
                <Text key={index} bold>
                    {token.tokens?.map((t: any, i: number) => renderToken(t, i))}
                </Text>
            )
        case 'em':
            return (
                <Text key={index} italic>
                    {token.tokens?.map((t: any, i: number) => renderToken(t, i))}
                </Text>
            )
        case 'codespan':
            return (
                <Text key={index} backgroundColor="#303030" color="#89B4F8" bold={false}>
                    {' '}
                    {token.text}{' '}
                </Text>
            )
        case 'space':
            return null
        case 'code':
            if (token.lang === 'mermaid') {
                return <Mermaid key={index} code={token.text} />
            }
            return <CodeBlock token={token} key={index} />
        case 'list':
            return (
                <Box key={index} flexDirection="column" paddingLeft={1}>
                    {token.items.map((item: any, i: number) => (
                        <Box key={i} flexDirection="row">
                            <Text color="gray">{'• '}</Text>
                            <Box flexDirection="column">
                                {item.tokens.map((t: any, j: number) => renderToken(t, j))}
                            </Box>
                        </Box>
                    ))}
                </Box>
            )
        case 'heading':
            return (
                <Box key={index}>
                    <Text bold color="white">
                        {token.tokens?.map((t: any, i: number) => renderToken(t, i))}
                    </Text>
                </Box>
            )
        case 'link':
            return (
                <Text key={index} color="#89B4F8" underline>
                    {token.tokens?.map((t: any, i: number) => renderToken(t, i))}
                </Text>
            )
        case 'hr':
            return null
        case 'blockquote':
            return (
                <Box
                    key={index}
                    borderStyle="single"
                    borderLeft
                    borderRight={false}
                    borderTop={false}
                    borderBottom={false}
                    borderColor="#89B4F8"
                    paddingLeft={1}
                >
                    {token.tokens?.map((t: any, i: number) => renderToken(t, i))}
                </Box>
            )
        case 'html':
            return <Text key={index}>{token.text}</Text>
        case 'escape':
            return <Text key={index}>{token.text}</Text>
        case 'table':
            return <Table key={index} token={token} />
        default:
            return <Text key={index}>{token.raw}</Text>
    }
}

function CodeBlock({ token }: { token: any }) {
    const lang = token.lang || 'typescript'

    const highlighted = React.useMemo(() => {
        if (!token.text) return ''
        return highlight(token.text, {
            language: lang,
            ignoreIllegals: true,
        })
    }, [token.text, lang])

    return (
        <Box flexDirection="column" paddingY={1} paddingLeft={2}>
            <Text>{highlighted}</Text>
        </Box>
    )
}

export function Markdown({ children }: Props) {
    if (!children) return null
    const tokens = marked.lexer(children).filter((t) => t.type !== 'space')
    return (
        <Box flexDirection="column" gap={1}>
            {tokens.map((token, index) => renderToken(token, index))}
        </Box>
    )
}
