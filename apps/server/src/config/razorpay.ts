import Razorpay from 'razorpay'

import { env } from '../env'

export const razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
    key_secret: env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '',
})
