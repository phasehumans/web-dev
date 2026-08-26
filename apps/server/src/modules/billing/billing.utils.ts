import crypto from 'crypto'

export const getRazorpayKeyId = () => {
    const keyId = process.env.RAZORPAY_KEY_ID

    if (!keyId) {
        throw new Error('RAZORPAY_KEY_ID is not configured')
    }

    return keyId
}

export const getRazorpayKeySecret = () => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
        throw new Error('RAZORPAY_KEY_SECRET is not configured')
    }

    return keySecret
}

export const getRazorpayWebhookSecret = () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!webhookSecret) {
        throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured')
    }

    return webhookSecret
}

export const verifyRazorpayOrderPayment = (data: {
    orderId: string
    paymentId: string
    signature: string
}) => {
    const { orderId, paymentId, signature } = data
    const secret = getRazorpayKeySecret()
    const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

    const a = Buffer.from(generatedSignature, 'utf8')
    const b = Buffer.from(signature, 'utf8')

    if (a.length !== b.length) {
        return false
    }

    return crypto.timingSafeEqual(a, b)
}

export const verifyRazorpayWebhookSignature = (data: {
    rawBody: string | Buffer
    signature: string
    webhookSecret?: string
}) => {
    const { rawBody, signature, webhookSecret } = data
    const secret = webhookSecret || getRazorpayWebhookSecret()
    const generatedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

    const a = Buffer.from(generatedSignature, 'utf8')
    const b = Buffer.from(signature, 'utf8')

    if (a.length !== b.length) {
        return false
    }

    return crypto.timingSafeEqual(a, b)
}
