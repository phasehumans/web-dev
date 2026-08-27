import type { Message } from '@/features/chat/types'
import type { BackendMessage } from '@/features/sessions/api/session'

export const getUserFacingGenerationError = (message: string) => {
    const normalizedMessage = message.toLowerCase()

    if (normalizedMessage.includes('sign in')) {
        return 'Please sign in and try again.'
    }

    if (
        normalizedMessage.includes('insufficient') ||
        normalizedMessage.includes('wallet') ||
        normalizedMessage.includes('credit') ||
        normalizedMessage.includes('balance') ||
        normalizedMessage.includes('billing')
    ) {
        return 'Insufficient credits. Please add credits to your account in Settings > Billing to continue using December Cloud.'
    }

    if (normalizedMessage.includes('implementation plan')) {
        return "I couldn't turn that request into a reliable implementation plan. Try again or simplify the prompt to the essential pages and flows."
    }

    if (normalizedMessage.includes('understand the request')) {
        return "I couldn't understand the request clearly enough to start the project. Try rephrasing it with the main pages, style, and core features."
    }

    if (normalizedMessage.includes('edit agent')) {
        return 'I hit an issue while applying that change. Try again with a narrower follow-up request.'
    }

    if (normalizedMessage.includes('fix agent')) {
        return 'I found the preview error but could not repair it automatically. Try a manual follow-up edit instead.'
    }

    if (
        normalizedMessage.includes('project files') ||
        normalizedMessage.includes('retry the build')
    ) {
        return 'I started the build but hit an issue while generating the project files. Please retry the build.'
    }

    if (
        normalizedMessage.includes('connection was interrupted') ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('stream body is missing')
    ) {
        return 'The generation connection was interrupted. Please try again.'
    }

    return 'Something went wrong while generating this project. Please try again.'
}

export const mapBackendMessageToUIMessage = (message: BackendMessage): Message => {
    const isAssistant = message.role !== 'USER' && message.role !== 'SYSTEM'
    let thoughts: string | undefined = undefined
    let plan: string | undefined = undefined
    let summary: string | undefined = undefined

    if (message.blocks && Array.isArray(message.blocks) && message.blocks.length > 0) {
        return {
            id: message.id,
            role:
                message.role === 'USER'
                    ? 'user'
                    : message.role === 'SYSTEM'
                      ? 'system'
                      : 'assistant',
            content: message.content,
            blocks: message.blocks,
            type: 'text',
            status: message.status ?? 'done',
        }
    }

    if (isAssistant && message.content) {
        if (message.content.includes('### Project Metadata')) {
            const index = message.content.indexOf('### Project Metadata')
            thoughts = message.content.slice(0, index).trim()
            plan = message.content.slice(index).trim()
            summary = ''
        } else {
            const parts = message.content.split('\n\n')
            if (parts.length > 1) {
                thoughts = parts[0]
                plan = parts.slice(1).join('\n\n')
                summary = '' // we don't use summary anymore
            } else {
                plan = message.content
                summary = ''
            }
        }
    }

    return {
        id: message.id,
        role: message.role === 'USER' ? 'user' : message.role === 'SYSTEM' ? 'system' : 'assistant',
        content: message.content,
        type: 'text',
        status: message.status ?? 'done',
        thoughts,
        plan,
        summary,
    }
}
