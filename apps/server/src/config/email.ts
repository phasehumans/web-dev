import { Resend } from 'resend'

const resendkey = process.env.RESEND_API_KEY
if (!resendkey && process.env.NODE_ENV !== 'test') {
    console.log('resend key is missing')
}

const resend = new Resend(resendkey || 're_test_key')

if (process.env.NODE_ENV === 'test') {
    resend.emails.send = (async () => {
        return { data: { id: 'test-resend-mock-id' }, error: null }
    }) as any
}

export default resend
