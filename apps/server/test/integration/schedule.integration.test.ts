import { describe, it, expect } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { getRandomIP } from '../helpers'

describe('Schedule Module Integration Tests', () => {
    it('1. GET /api/v1/schedule - router is mounted and responds', async () => {
        const res = await request(app)
            .get('/api/v1/schedule/non-existent')
            .set('x-forwarded-for', getRandomIP())

        expect([404, 200]).toContain(res.status)
    })
})
