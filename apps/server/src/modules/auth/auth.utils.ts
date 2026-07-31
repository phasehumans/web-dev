import crypto from 'crypto'

import jwt, { type SignOptions } from 'jsonwebtoken'

import resend from '../../config/email'
import { env } from '../../env'

import type { TokenPayload } from './auth.types'

export const hashRefreshToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export const getNameFromEmail = (email: string): string => {
    if (!email) return ''
    const parts = email.split('@')
    if (parts.length < 2 || !parts[0]) return ''
    const localPart = parts[0]
    return localPart.replace(/\d/g, '')
}

export const generateUserCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `${result.substring(0, 4)}-${result.substring(4, 8)}`
}

export const sendOTP = async (email: string, otp: string) => {
    const attachments: any[] = []
    const fromEmail = env.SENDER_EMAIL || 'onboarding@resend.dev'

    try {
        await resend.emails.send({
            from: `December<${fromEmail}>`,
            to: email,
            subject: 'Your Verification Code',
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset='UTF-8' />
            <meta name='viewport' content='width=device-width, initial-scale=1.0' />
            <title>December Verification Code</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                width: 100% !important;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
              }
              @media (prefers-color-scheme: dark) {
                .body-bg {
                  background-color: #0c0a09 !important;
                }
                .text-primary {
                  color: #fafaf9 !important;
                }
                .text-secondary {
                  color: #a8a29e !important;
                }
                .text-muted {
                  color: #78716c !important;
                }
                .otp-box {
                  background-color: #1c1917 !important;
                  color: #fafaf9 !important;
                  border-color: #292524 !important;
                }
                .divider {
                  background-color: #292524 !important;
                }
                .link {
                  color: #fafaf9 !important;
                }
              }
            </style>
          </head>
          <body class='body-bg' style='margin: 0; padding: 48px 16px; background-color: #ffffff; color: #1c1917; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
            <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0'>
              <tr>
                <td align='center'>
                  <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='max-width: 520px; margin: 0 auto; text-align: left;'>

                    <!-- Heading -->
                    <tr>
                      <td style='padding-bottom: 16px; text-align: center;'>
                        <h1 class='text-primary' style='margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; color: #1c1917; letter-spacing: -0.3px;'>
                          Verify your email
                        </h1>
                      </td>
                    </tr>
                    <!-- Body Text -->
                    <tr>
                      <td style='padding-bottom: 24px; text-align: center;'>
                        <p class='text-secondary' style='margin: 0; font-size: 14px; line-height: 22px; color: #57534e;'>
                          Use the verification code below to continue to December.
                        </p>
                      </td>
                    </tr>
                    <!-- OTP Box -->
                    <tr>
                      <td align='center' style='padding-bottom: 24px;'>
                        <div class='otp-box' style='display: inline-block; padding: 14px 28px; background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 10px; color: #1c1917; font-size: 30px; line-height: 36px; font-weight: 700; letter-spacing: 8px; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; text-align: center;'>
                          ${otp}
                        </div>
                      </td>
                    </tr>
                    <!-- Expiry & Fallback -->
                    <tr>
                      <td style='padding-bottom: 36px; text-align: center;'>
                        <p class='text-secondary' style='margin: 0; font-size: 13px; line-height: 20px; color: #57534e;'>
                          This code expires in <strong class='text-primary' style='color: #1c1917; font-weight: 600;'>10 minutes</strong>.
                        </p>
                        <p class='text-muted' style='margin: 0; font-size: 12px; line-height: 18px; color: #a8a29e;'>
                          If you didn’t request this code, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <!-- Divider -->
                    <tr>
                      <td style='padding-bottom: 24px;'>
                        <div class='divider' style='height: 1px; background-color: #f5f5f4; border-bottom: 1px solid #e7e5e4;'></div>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style='text-align: center;'>

                        <!-- Support email & copyright -->
                        <p class='text-muted' style='margin: 0 0 6px 0; font-size: 11px; line-height: 16px; color: #a8a29e;'>
                          Questions? Reach out to <a class='link' href='mailto:${fromEmail}' style='color: #57534e; text-decoration: underline;'>${fromEmail}</a>
                        </p>
                        <p class='text-muted' style='margin: 0; font-size: 10px; line-height: 14px; color: #a8a29e; letter-spacing: 0.2px;'>
                          Automated email from December
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
            attachments,
        })
    } catch (error) {
        console.error(`[Email Service] Failed to send OTP email to ${email}:`, error)
        if (env.ENV === 'DEV') {
            console.log(`[DEV OTP Code] Verification code for ${email} is: ${otp}`)
        }
    }
}

export const sendWelcomeEmail = async (email: string, name: string) => {
    const fromEmail = env.SENDER_EMAIL || 'onboarding@resend.dev'

    await resend.emails.send({
        from: `December <${fromEmail}>`,
        to: email,
        subject: 'Welcome to December',
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset='UTF-8' />
            <meta name='viewport' content='width=device-width, initial-scale=1.0' />
            <title>Welcome to December</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                width: 100% !important;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
              }
              @media (prefers-color-scheme: dark) {
                .body-bg {
                  background-color: #0c0a09 !important;
                }
                .text-primary {
                  color: #fafaf9 !important;
                }
                .text-secondary {
                  color: #a8a29e !important;
                }
                .text-muted {
                  color: #78716c !important;
                }
                .divider {
                  background-color: #292524 !important;
                }
                .link {
                  color: #fafaf9 !important;
                }
                .btn-bg {
                  background-color: #fafaf9 !important;
                }
                .btn-text {
                  color: #1c1917 !important;
                  border-color: #fafaf9 !important;
                }
              }
            </style>
          </head>
          <body class='body-bg' style='margin: 0; padding: 48px 16px; background-color: #ffffff; color: #1c1917; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
            <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0'>
              <tr>
                <td align='center'>
                  <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='max-width: 520px; margin: 0 auto; text-align: left;'>

                    <!-- Heading -->
                    <tr>
                      <td style='padding-bottom: 20px;'>
                        <h1 class='text-primary' style='margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; color: #1c1917; letter-spacing: -0.3px;'>
                          Welcome to December
                        </h1>
                      </td>
                    </tr>
                    <!-- Body Text -->
                    <tr>
                      <td style='padding-bottom: 24px;'>
                        <p class='text-secondary' style='margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
                          Hi ${name || 'there'},
                        </p>
                        <p class='text-secondary' style='margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
                          We’re thrilled to welcome you to <strong>December</strong>. December is a unified development workspace powered by AI, designed to help you design, build, and deploy web applications directly from natural language.
                        </p>
                        <p class='text-secondary' style='margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
                          Here is how you can get started:
                        </p>
                        <ul class='text-secondary' style='margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #57534e;'>
                          <li style='margin-bottom: 8px;'><strong>Interactive Canvas:</strong> Design and iterate on your frontend interface with live, hot-reloaded previews.</li>
                          <li style='margin-bottom: 8px;'><strong>AI-Driven Workspace:</strong> Generate full-stack applications and features with agent assistance.</li>
                          <li style='margin-bottom: 8px;'><strong>Project Management:</strong> Manage, edit, and export your production-ready projects.</li>
                        </ul>
                        
                        <!-- CTA Button -->
                        <table role='presentation' cellspacing='0' cellpadding='0' border='0' style='margin: 24px 0;'>
                          <tr>
                            <td align='left' style='border-radius: 8px; background-color: #1c1917;' class='btn-bg'>
                              <a href='https://trydecember.com' target='_blank' class='btn-text' style='border: 1px solid #1c1917; border-radius: 8px; color: #fafaf9; display: inline-block; font-size: 14px; font-weight: 600; line-height: 20px; padding: 12px 24px; text-decoration: none;'>
                                Start building now
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p class='text-secondary' style='margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
                          If you ever have any questions or feedback, feel free to reply to this email or reach out to our team at <a class='link' href='mailto:${fromEmail}' style='color: #1c1917; text-decoration: underline; font-weight: 500;'>${fromEmail}</a>.
                        </p>
                        <p class='text-secondary' style='margin: 0; font-size: 14px; line-height: 22px; color: #57534e;'>
                          Welcome aboard,
                          <br />
                          <span class='text-primary' style='font-weight: 600; color: #1c1917;'>Chaitanya Sonawane</span>
                        </p>
                      </td>
                    </tr>
                    <!-- Divider -->
                    <tr>
                      <td style='padding-top: 16px; padding-bottom: 24px;'>
                        <div class='divider' style='height: 1px; background-color: #f5f5f4; border-bottom: 1px solid #e7e5e4;'></div>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style='text-align: center;'>

                        <!-- Support email & copyright -->
                        <p class='text-muted' style='margin: 0 0 6px 0; font-size: 11px; line-height: 16px; color: #a8a29e;'>
                          Questions? Reach out to <a class='link' href='mailto:${fromEmail}' style='color: #57534e; text-decoration: underline;'>${fromEmail}</a>
                        </p>
                        <p class='text-muted' style='margin: 0; font-size: 10px; line-height: 14px; color: #a8a29e; letter-spacing: 0.2px;'>
                          Automated email from December
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })
}

export const generateAccessToken = (payload: TokenPayload) => {
    const secret = env.ACCESS_TOKEN_SECRET
    const expiresIn = env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn']

    return jwt.sign(
        {
            userId: payload.userId,
            sessionId: payload.sessionId,
            jti: crypto.randomUUID(),
        },
        secret,
        {
            expiresIn,
        }
    )
}

export const generateRefreshToken = (payload: TokenPayload) => {
    const secret = env.REFRESH_TOKEN_SECRET
    const expiresIn = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']

    return jwt.sign(
        {
            userId: payload.userId,
            sessionId: payload.sessionId,
            jti: crypto.randomUUID(),
        },
        secret,
        {
            expiresIn,
        }
    )
}

export const verifyAccessToken = (token: string) => {
    const secret = env.ACCESS_TOKEN_SECRET
    return jwt.verify(token, secret) as TokenPayload
}

export const verifyRefreshToken = (token: string) => {
    const secret = env.REFRESH_TOKEN_SECRET
    return jwt.verify(token, secret) as TokenPayload
}
