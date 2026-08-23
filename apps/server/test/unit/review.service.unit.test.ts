import { describe, it, expect } from 'bun:test'

import { reviewRepository } from '../../src/modules/review/review.repository'
import { reviewService } from '../../src/modules/review/review.service'
import { usageService } from '../../src/modules/usage/usage.service'
import { AppError } from '../../src/shared/appError'

describe('Review Service - Unit Tests', () => {
    describe('createPullRequestReview', () => {
        it('should throw AppError 402 if user has insufficient balance (< $0.50)', async () => {
            const originalBalance = usageService.hasMinimumBalance
            usageService.hasMinimumBalance = (async () => false) as any

            try {
                await expect(
                    reviewService.createPullRequestReview({
                        userId: 'u1',
                        data: {
                            prUrl: 'https://github.com/facebook/react/pull/999',
                        },
                    })
                ).rejects.toThrow(
                    new AppError(
                        'Insufficient balance. A minimum balance of $0.50 is required to initiate a PR review.',
                        402
                    )
                )
            } finally {
                usageService.hasMinimumBalance = originalBalance
            }
        })

        it('should parse prUrl, apply preferences, create review, and return it', async () => {
            const originalFindPrefs = reviewRepository.findPreferencesByUserId
            const originalCreate = reviewRepository.createReview
            const originalBalance = usageService.hasMinimumBalance

            usageService.hasMinimumBalance = (async () => true) as any

            reviewRepository.findPreferencesByUserId = (async () => ({
                defaultStrictness: 'STRICT',
                focusAreas: ['SECURITY'],
            })) as any

            let createdPayload: any = null
            reviewRepository.createReview = (async (data: any) => {
                createdPayload = data
                return { id: 'rev-100', ...data }
            }) as any

            try {
                const res = await reviewService.createPullRequestReview({
                    userId: 'u1',
                    data: {
                        prUrl: 'https://github.com/facebook/react/pull/999',
                    },
                })

                expect(res.id).toBe('rev-100')
                expect(createdPayload.repository).toBe('facebook/react')
                expect(createdPayload.prNumber).toBe(999)
                expect(createdPayload.provider).toBe('GITHUB')
                expect(createdPayload.status).toBe('PENDING')
                expect(createdPayload.preferences.strictness).toBe('STRICT')
            } finally {
                reviewRepository.findPreferencesByUserId = originalFindPrefs
                reviewRepository.createReview = originalCreate
                usageService.hasMinimumBalance = originalBalance
            }
        })
    })

    describe('getUserReviews', () => {
        it('should delegate to reviewRepository.findReviewsByUserId with mapped filters', async () => {
            const originalFind = reviewRepository.findReviewsByUserId
            let filtersPassed: any = null

            reviewRepository.findReviewsByUserId = (async (_userId, filters) => {
                filtersPassed = filters
                return { reviews: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }
            }) as any

            try {
                const res = await reviewService.getUserReviews({
                    userId: 'u1',
                    query: {
                        isAutoReview: 'true',
                        page: 2,
                        limit: 10,
                        repository: 'my-org/repo',
                    },
                })

                expect(filtersPassed.isAutoReview).toBe(true)
                expect(filtersPassed.page).toBe(2)
                expect(filtersPassed.limit).toBe(10)
                expect(filtersPassed.repository).toBe('my-org/repo')
                expect(res.reviews).toEqual([])
            } finally {
                reviewRepository.findReviewsByUserId = originalFind
            }
        })
    })

    describe('getReviewById', () => {
        it('should throw AppError 404 if review not found', async () => {
            const originalFind = reviewRepository.findReviewById
            reviewRepository.findReviewById = (async () => null) as any

            try {
                await expect(
                    reviewService.getReviewById({ userId: 'u1', reviewId: 'rev-missing' })
                ).rejects.toThrow(new AppError('Review not found', 404))
            } finally {
                reviewRepository.findReviewById = originalFind
            }
        })

        it('should return review when found', async () => {
            const originalFind = reviewRepository.findReviewById
            reviewRepository.findReviewById = (async (id, userId) => ({
                id,
                userId,
                title: 'Review 1',
            })) as any

            try {
                const res = await reviewService.getReviewById({ userId: 'u1', reviewId: 'rev-1' })
                expect(res.id).toBe('rev-1')
                expect(res.title).toBe('Review 1')
            } finally {
                reviewRepository.findReviewById = originalFind
            }
        })
    })

    describe('deleteReview', () => {
        it('should throw AppError 404 if review not found to delete', async () => {
            const originalDelete = reviewRepository.deleteReview
            reviewRepository.deleteReview = (async () => null) as any

            try {
                await expect(
                    reviewService.deleteReview({ userId: 'u1', reviewId: 'rev-missing' })
                ).rejects.toThrow(new AppError('Review not found', 404))
            } finally {
                reviewRepository.deleteReview = originalDelete
            }
        })

        it('should delete review and return success', async () => {
            const originalDelete = reviewRepository.deleteReview
            reviewRepository.deleteReview = (async (id) => ({ id })) as any

            try {
                const res = await reviewService.deleteReview({ userId: 'u1', reviewId: 'rev-1' })
                expect(res).toEqual({ success: true })
            } finally {
                reviewRepository.deleteReview = originalDelete
            }
        })
    })

    describe('getUserPreferences and updateUserPreferences', () => {
        it('getUserPreferences should create default if missing, or return existing', async () => {
            const originalFind = reviewRepository.findPreferencesByUserId
            const originalUpsert = reviewRepository.upsertPreferences

            reviewRepository.findPreferencesByUserId = (async () => null) as any
            reviewRepository.upsertPreferences = (async (userId) => ({
                userId,
                defaultStrictness: 'STANDARD',
            })) as any

            try {
                const res = await reviewService.getUserPreferences({ userId: 'u1' })
                expect(res.defaultStrictness).toBe('STANDARD')
            } finally {
                reviewRepository.findPreferencesByUserId = originalFind
                reviewRepository.upsertPreferences = originalUpsert
            }
        })

        it('updateUserPreferences should call upsertPreferences', async () => {
            const originalUpsert = reviewRepository.upsertPreferences
            reviewRepository.upsertPreferences = (async (userId, data) => ({
                userId,
                ...data,
            })) as any

            try {
                const res = await reviewService.updateUserPreferences({
                    userId: 'u1',
                    data: { defaultStrictness: 'STRICT' },
                })
                expect(res.defaultStrictness).toBe('STRICT')
            } finally {
                reviewRepository.upsertPreferences = originalUpsert
            }
        })
    })
})
