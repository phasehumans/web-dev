import { Box } from 'ink'
import React from 'react'

import { Header } from './header'
import { BotMessage } from './messages/bot-message'
import { ErrorMessage } from './messages/error-message'
import { UserMessage } from './messages/user-message'

import type { Message } from '../types'
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
    const allMessages = [...staticMessages, ...activeMessages]

    return (
        <Box flexDirection="column">
            {allMessages.map((msg, index) => {
                const key = msg.id != null ? `${msg.id}-${index}` : `msg-idx-${index}`
                if (msg.role === 'header') {
                    return <Header key={key} cliVersion={cliVersion} userEmail={userEmail} />
                }
                if (msg.role === 'user') return <UserMessage key={key} message={msg.text ?? ''} />
                if (msg.role === 'error') return <ErrorMessage key={key} message={msg.text ?? ''} />
                return (
                    <BotMessage
                        key={key}
                        blocks={msg.blocks ?? []}
                        usage={msg.usage}
                        expandCommands={expandCommands}
                    />
                )
            })}
        </Box>
    )
}
