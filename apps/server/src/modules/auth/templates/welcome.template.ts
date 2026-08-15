import { renderBaseEmail } from './base.template'

import type { RenderedEmail } from './otp.template'

export interface RenderWelcomeEmailOptions {
    name?: string
    supportEmail: string
    webUrl: string
    docsUrl?: string
    npmUrl?: string
}

export const renderWelcomeEmail = ({
    name,
    supportEmail,
    webUrl,
    npmUrl = 'https://www.npmjs.com/package/@trydecember/cli',
}: RenderWelcomeEmailOptions): RenderedEmail => {
    const greetingName = name?.trim() ? name.trim() : 'there'
    const subject = 'Welcome to December'
    const previewText =
        'Welcome to December — your AI software engineer for building and fixing code.'

    const htmlContent = `
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
            Hi ${greetingName},
          </p>
          <p class='text-secondary' style='margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
            We’re thrilled to welcome you to <strong>December</strong>. December is an AI software engineer that helps you plan, build, test, and debug code directly across your projects.
          </p>
          <p class='text-secondary' style='margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
            You can use December in two ways:
          </p>
          <ul class='text-secondary' style='margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #57534e;'>
            <li style='margin-bottom: 8px;'><strong>Terminal-Based:</strong> Install our CLI from npm (<a class='link' href='${npmUrl}' target='_blank' style='color: #1c1917; text-decoration: underline;'>@trydecember/cli</a>) and run tasks directly in your terminal using <code class='otp-box' style='padding: 2px 6px; background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 4px; font-family: Menlo, Monaco, Consolas, monospace; font-size: 13px;'>npm install -g @trydecember/cli</code>.</li>
            <li style='margin-bottom: 8px;'><strong>Cloud-Based:</strong> Start and manage sessions directly in your browser on the web dashboard.</li>
          </ul>
          
          <!-- CTA Button -->
          <table role='presentation' cellspacing='0' cellpadding='0' border='0' style='margin: 24px 0;'>
            <tr>
              <td align='left' style='border-radius: 8px; background-color: #1c1917;' class='btn-bg'>
                <a href='${webUrl}' target='_blank' class='btn-text' style='border: 1px solid #1c1917; border-radius: 8px; color: #fafaf9; display: inline-block; font-size: 14px; font-weight: 600; line-height: 20px; padding: 12px 24px; text-decoration: none;'>
                  Start building now
                </a>
              </td>
            </tr>
          </table>

          <p class='text-secondary' style='margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
            If you ever have any questions or feedback, feel free to reply to this email or reach out to our team at <a class='link' href='mailto:${supportEmail}' style='color: #1c1917; text-decoration: underline; font-weight: 500;'>${supportEmail}</a>.
          </p>
          <p class='text-secondary' style='margin: 0; font-size: 14px; line-height: 22px; color: #57534e;'>
            Welcome aboard,
            <br />
            <span class='text-primary' style='font-weight: 600; color: #1c1917;'>Chaitanya Sonawane</span>
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

    const text = `Welcome to December

Hi ${greetingName},

We’re thrilled to welcome you to December. December is an AI software engineer that helps you plan, build, test, and debug code directly across your projects.

You can use December in two ways:
- Terminal-Based: Install our CLI from npm (@trydecember/cli at ${npmUrl}) and run tasks directly in your terminal using "npm install -g @trydecember/cli".
- Cloud-Based: Start and manage sessions directly in your browser on the web dashboard.

Start building now: ${webUrl}

If you ever have any questions or feedback, feel free to reply to this email or reach out to our team at ${supportEmail}.

Welcome aboard,
Chaitanya Sonawane

---
December: ${webUrl}
`

    return {
        subject,
        html,
        text,
    }
}
