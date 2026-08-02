import { Box, Static } from 'ink'
import React from 'react'

import { Header } from './header'
import { BotMessage } from './messages/bot-message'
import { ErrorMessage } from './messages/error-message'
import { UserMessage } from './messages/user-message'

import type { Message } from '../types'

function renderSingleMessage(
    msg: Message,
    index: number,
    allMessages: Message[],
    cliVersion?: string,
    userEmail?: string,
    expandCommands?: boolean
) {
    const key = msg.id != null ? `${msg.id}-${index}` : `msg-idx-${index}`
    if (msg.role === 'header') {
        return <Header key={key} cliVersion={cliVersion} userEmail={userEmail} />
    }
    if (msg.role === 'user') return <UserMessage key={key} message={msg.text ?? ''} />
    if (msg.role === 'error') {
        const prevRole = index > 0 ? allMessages[index - 1]?.role : null
        const hasTopMargin = prevRole !== 'user'
        return <ErrorMessage key={key} message={msg.text ?? ''} hasTopMargin={hasTopMargin} />
    }
    return (
        <BotMessage
            key={key}
            blocks={msg.blocks ?? []}
            usage={msg.usage}
            expandCommands={expandCommands}
        />
    )
}

export function MessageList({
    staticKey,
    staticMessages,
    activeMessages,
    isAuthenticated,
    cliVersion,
    userEmail,
    expandCommands,
}: {
    staticKey: number
    staticMessages: Message[]
    activeMessages: Message[]
    isAuthenticated: boolean
    cliVersion?: string
    userEmail?: string
    expandCommands?: boolean
}) {
    return (
        <Box flexDirection="column">
            {staticMessages.length > 0 && (
                <Static items={staticMessages}>
                    {(msg, index) =>
                        renderSingleMessage(
                            msg,
                            index,
                            staticMessages,
                            cliVersion,
                            userEmail,
                            expandCommands
                        )
                    }
                </Static>
            )}
            {activeMessages.map((msg, index) =>
                renderSingleMessage(
                    msg,
                    staticMessages.length + index,
                    [...staticMessages, ...activeMessages],
                    cliVersion,
                    userEmail,
                    expandCommands
                )
            )}
        </Box>
    )
}
