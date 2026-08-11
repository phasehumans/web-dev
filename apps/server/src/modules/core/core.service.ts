import { enqueueJob } from '@december/shared'

import { AppError } from '../../shared/appError'

import { coreRepository } from './core.repository'

import type { ProcessPromptJob, ProcessPromptJobResult } from './core.types'

const processPromptJob = async (data: ProcessPromptJob): Promise<ProcessPromptJobResult> => {
    const { userId, prompt, projectId, sessionId } = data

    let activeSessionId = sessionId

    if (activeSessionId) {
        const existingSession = await coreRepository.findSessionById({
            sessionId: activeSessionId,
            userId,
        })
        if (!existingSession) {
            throw new AppError('Session not found', 404)
        }
    } else {
        const newSession = await coreRepository.createSessionWithPrompt({
            userId,
            prompt,
            projectId,
        })
        activeSessionId = newSession.id
    }

    const job = await enqueueJob('prompt_job', {
        prompt,
        projectId,
        sessionId: activeSessionId,
        userId,
    })

    return {
        jobId: String(job.id),
        sessionId: activeSessionId,
    }
}

export const coreService = {
    processPromptJob,
}
