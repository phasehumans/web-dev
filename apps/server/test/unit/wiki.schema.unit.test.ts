import { describe, it, expect } from 'bun:test'

import {
    GenerateWikiSchema,
    CreatePageSchema,
    UpdatePageSchema,
    WikiChatSchema,
} from '../../src/modules/wiki/wiki.schema'

describe('Wiki Schema - Unit Tests', () => {
    describe('GenerateWikiSchema', () => {
        it('should pass with valid repoOwner and repoName', () => {
            const valid = {
                repoOwner: 'phasehumans',
                repoName: 'december',
                repoUrl: 'https://github.com/phasehumans/december',
            }
            expect(GenerateWikiSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail if repoOwner or repoName is empty or missing', () => {
            expect(GenerateWikiSchema.safeParse({ repoOwner: '', repoName: 'repo' }).success).toBe(
                false
            )
            expect(GenerateWikiSchema.safeParse({ repoOwner: 'owner' }).success).toBe(false)
        })
    })

    describe('CreatePageSchema', () => {
        it('should pass with valid wikiId (UUID), title, and content', () => {
            const valid = {
                wikiId: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Architecture Overview',
                content: '# Architecture\nDetailed info',
                slug: 'architecture-overview',
                order: 1,
            }
            expect(CreatePageSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail with invalid UUID or empty title', () => {
            expect(
                CreatePageSchema.safeParse({
                    wikiId: 'invalid-uuid',
                    title: 'Title',
                    content: 'Content',
                }).success
            ).toBe(false)

            expect(
                CreatePageSchema.safeParse({
                    wikiId: '123e4567-e89b-12d3-a456-426614174000',
                    title: '',
                    content: 'Content',
                }).success
            ).toBe(false)
        })
    })

    describe('UpdatePageSchema', () => {
        it('should pass with partial valid updates', () => {
            expect(UpdatePageSchema.safeParse({ title: 'New Title' }).success).toBe(true)
            expect(UpdatePageSchema.safeParse({ content: 'New Content', order: 2 }).success).toBe(
                true
            )
            expect(UpdatePageSchema.safeParse({}).success).toBe(true)
        })

        it('should fail if title is provided as empty string', () => {
            expect(UpdatePageSchema.safeParse({ title: '' }).success).toBe(false)
        })
    })

    describe('WikiChatSchema', () => {
        it('should pass with valid prompt and optional wiki context', () => {
            expect(WikiChatSchema.safeParse({ prompt: 'How does auth work?' }).success).toBe(true)
            expect(
                WikiChatSchema.safeParse({
                    repoFullName: 'owner/repo',
                    prompt: 'Explain the API architecture',
                }).success
            ).toBe(true)
            expect(
                WikiChatSchema.safeParse({
                    wikiId: 'wiki-1',
                    prompt: 'Summarize components',
                }).success
            ).toBe(true)
        })

        it('should fail if prompt is empty or missing', () => {
            expect(WikiChatSchema.safeParse({ prompt: '' }).success).toBe(false)
            expect(WikiChatSchema.safeParse({ repoFullName: 'owner/repo' }).success).toBe(false)
        })
    })
})
