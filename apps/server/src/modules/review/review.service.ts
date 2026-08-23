import { AppError } from '../../shared/appError'
import { usageService } from '../usage/usage.service'

import { triggerAsyncReview } from './review.engine'
import { reviewRepository } from './review.repository'

import type {
    CreatePullRequestReview,
    GetUserReviews,
    GetReviewById,
    DeleteReview,
    GetUserPreferences,
    UpdateUserPreferences,
} from './review.types'

const createPullRequestReview = async (dataInput: CreatePullRequestReview) => {
    const { userId, data } = dataInput
    const { prUrl, sessionId, preferences } = data

    const hasBalance = await usageService.hasMinimumBalance({
        userId,
        minBalanceInCents: 50,
    })
    if (!hasBalance) {
        throw new AppError(
            'Insufficient balance. A minimum balance of $0.50 is required to initiate a PR review.',
            402
        )
    }

    // Extract repo & PR number from URL
    const match = prUrl.match(
        /(?:github\.com|gitlab\.com)\/([^/]+\/[^/]+)\/(?:pull|merge_requests)\/(\d+)/i
    )
    const repository = match && match[1] ? match[1] : 'repository'
    const prNumberStr = match && match[2] ? match[2] : ''
    const prNumber = prNumberStr ? parseInt(prNumberStr, 10) : Math.floor(Math.random() * 800) + 100
    const provider = prUrl.includes('gitlab.com') ? 'GITLAB' : 'GITHUB'

    // Get user preferences
    const userPrefs = await reviewRepository.findPreferencesByUserId(userId)
    const effectivePreferences = preferences || {
        strictness: userPrefs?.defaultStrictness || 'STANDARD',
        focusAreas: userPrefs?.focusAreas || ['SECURITY', 'PERFORMANCE', 'CLEAN_CODE'],
    }

    const title = `Review PR #${prNumber} in ${repository}`
    const author = 'External Author'

    const review = await reviewRepository.createReview({
        userId,
        sessionId,
        prUrl,
        prNumber,
        repository,
        provider,
        title,
        author,
        status: 'PENDING',
        isAutoReview: false,
        preferences: effectivePreferences as any,
    })

    // Trigger async processing
    triggerAsyncReview(review.id, prUrl).catch((err) => {
        console.error('Async review execution error:', err)
    })

    return review
}

const getUserReviews = async (data: GetUserReviews) => {
    const { userId, query } = data
    const filters = {
        repository: query.repository,
        status: query.status,
        isAutoReview:
            query.isAutoReview === 'true'
                ? true
                : query.isAutoReview === 'false'
                  ? false
                  : undefined,
        search: query.search,
        page: query.page,
        limit: query.limit,
    }

    return reviewRepository.findReviewsByUserId(userId, filters)
}

const getReviewById = async (data: GetReviewById) => {
    const { userId, reviewId } = data
    const review = await reviewRepository.findReviewById(reviewId, userId)
    if (!review) throw new AppError('Review not found', 404)
    return review
}

const deleteReview = async (data: DeleteReview) => {
    const { userId, reviewId } = data
    const deleted = await reviewRepository.deleteReview(reviewId, userId)
    if (!deleted) throw new AppError('Review not found', 404)
    return { success: true }
}

const getUserPreferences = async (data: GetUserPreferences) => {
    const { userId } = data
    const prefs = await reviewRepository.findPreferencesByUserId(userId)
    if (!prefs) {
        return reviewRepository.upsertPreferences(userId, {})
    }
    return prefs
}

const updateUserPreferences = async (dataInput: UpdateUserPreferences) => {
    const { userId, data } = dataInput
    return reviewRepository.upsertPreferences(userId, data)
}

export const reviewService = {
    createPullRequestReview,
    getUserReviews,
    getReviewById,
    deleteReview,
    getUserPreferences,
    updateUserPreferences,
}
