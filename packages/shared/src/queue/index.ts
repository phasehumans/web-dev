import { Queue } from 'bullmq'
import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let _redisClient: Redis | null = null
export function getRedisClient() {
    if (!_redisClient) {
        _redisClient = new Redis(REDIS_URL, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            enableOfflineQueue: false,
        })
        _redisClient.on('error', (err) => {
            // Intentionally swallowed: handles redis connection errors gracefully when offline in test environment
        })
    }
    return _redisClient
}

let _redisSubClient: Redis | null = null
export function getRedisSubClient() {
    if (!_redisSubClient) {
        _redisSubClient = new Redis(REDIS_URL, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            enableOfflineQueue: false,
        })
        _redisSubClient.on('error', (err) => {
            // Intentionally swallowed: handles redis sub connection errors gracefully when offline in test environment
        })
    }
    return _redisSubClient
}

let _agentQueue: Queue | null = null
export function getAgentQueue() {
    if (!_agentQueue) {
        _agentQueue = new Queue('agent_jobs', { connection: getRedisClient() as any })
    }
    return _agentQueue
}

export async function enqueueJob(jobName: string, jobData: any) {
    return await getAgentQueue().add(jobName, jobData)
}

export async function publishEvent(channel: string, eventData: any) {
    await getRedisClient().publish(channel, JSON.stringify(eventData))
}

export function subscribeToChannel(channel: string, onMessage: (data: any) => void) {
    const subClient = getRedisSubClient()
    subClient.subscribe(channel)
    subClient.on('message', (chan, message) => {
        if (chan === channel) {
            onMessage(JSON.parse(message))
        }
    })
}
