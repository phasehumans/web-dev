import { renderBaseEmail } from './base.template'

export type OtpType = 'signup' | 'password_reset' | 'verification'

export interface RenderOtpEmailOptions {
    otp: string
    type?: OtpType
    supportEmail: string
    webUrl: string
}

export interface RenderedEmail {
    subject: string
    html: string
    text: string
}

export const renderOtpEmail = ({
    otp,
    type = 'verification',
    supportEmail,
    webUrl,
}: RenderOtpEmailOptions): RenderedEmail => {
    const isPasswordReset = type === 'password_reset'

    const subject = isPasswordReset
        ? `Reset your December password: ${otp}`
        : `Your December verification code: ${otp}`

    const previewText = isPasswordReset
        ? `Your password reset code is ${otp}. Valid for 10 minutes.`
        : `Your verification code is ${otp}. Valid for 10 minutes.`

    const heading = isPasswordReset ? 'Reset your password' : 'Verify your email'

    const description = isPasswordReset
        ? 'Use the verification code below to reset your December password.'
        : 'Use the verification code below to continue to December.'

    const securityNotice = isPasswordReset
        ? 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.'
        : 'If you didn’t request this code, you can safely ignore this email.'

    const htmlContent = `
      <!-- Heading -->
      <tr>
        <td style='padding-bottom: 16px; text-align: center;'>
          <h1 class='text-primary' style='margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; color: #1c1917; letter-spacing: -0.3px;'>
            ${heading}
          </h1>
        </td>
      </tr>
      <!-- Body Text -->
      <tr>
        <td style='padding-bottom: 24px; text-align: center;'>
          <p class='text-secondary' style='margin: 0; font-size: 14px; line-height: 22px; color: #57534e;'>
            ${description}
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
            ${securityNotice}
          </p>
        </td>
      </tr>
    `

    const html = renderBaseEmail({
        previewText,
        content: htmlContent,
        supportEmail,
        webUrl,
    })

    const text = isPasswordReset
        ? `Reset your December password

${description}

Your verification code: ${otp}

This code expires in 10 minutes.

${securityNotice}

---
December: ${webUrl}
Questions? Reach out to ${supportEmail}`
        : `Verify your email for December

${description}

Your verification code: ${otp}

This code expires in 10 minutes.

${securityNotice}

---
December: ${webUrl}
Questions? Reach out to ${supportEmail}`

    return {
        subject,
        html,
        text,
    }
}
