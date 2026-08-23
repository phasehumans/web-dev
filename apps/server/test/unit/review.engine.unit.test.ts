import { describe, it, expect } from 'bun:test'

import { E2BGithubBotDispatcher, triggerAsyncReview } from '../../src/modules/review/review.engine'
import * as reviewRepoModule from '../../src/modules/review/review.repository'

describe('Review Engine - Unit Tests', () => {
    it('E2BGithubBotDispatcher should update review status when dispatching review', async () => {
        const originalUpdate = reviewRepoModule.reviewRepository.updateReview
        const updatedStatuses: string[] = []

        reviewRepoModule.reviewRepository.updateReview = (async (_id: string, data: any) => {
            if (data.status) updatedStatuses.push(data.status)
            return {} as any
        }) as any

        try {
            const dispatcher = new E2BGithubBotDispatcher()
            await dispatcher.dispatchReview(
                'rev-1',
                'https://github.com/phasehumans/december/pull/1'
            )

            expect(updatedStatuses).toContain('IN_PROGRESS')
        } finally {
            reviewRepoModule.reviewRepository.updateReview = originalUpdate
        }
    })

    it('triggerAsyncReview should invoke default bot dispatcher without throwing', async () => {
        const originalUpdate = reviewRepoModule.reviewRepository.updateReview
        reviewRepoModule.reviewRepository.updateReview = (async () => ({}) as any) as any

        try {
            await expect(
                triggerAsyncReview('rev-2', 'https://github.com/phasehumans/december/pull/2')
            ).resolves.toBeUndefined()
        } finally {
            reviewRepoModule.reviewRepository.updateReview = originalUpdate
        }
    })
})
