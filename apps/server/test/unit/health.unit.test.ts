import { describe, it, expect } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'

describe('Server Health Check Endpoints', () => {
    it('GET /health returns 200 OK with service status payload', async () => {
        const res = await request(app).get('/health')
        expect(res.status).toBe(200)
        expect(res.body).toBeDefined()
        expect(res.body.status).toBe('ok')
        expect(res.body.service).toBe('december-server')
        expect(res.body.timestamp).toBeDefined()
        expect(typeof res.body.uptime).toBe('number')
    })

    it('GET /api/health returns 200 OK', async () => {
        const res = await request(app).get('/api/health')
        expect(res.status).toBe(200)
        expect(res.body).toBeDefined()
        expect(res.body.status).toBe('ok')
    })

    it('GET /api/v1/health returns 200 OK', async () => {
        const res = await request(app).get('/api/v1/health')
        expect(res.status).toBe(200)
        expect(res.body).toBeDefined()
        expect(res.body.status).toBe('ok')
    })
})
