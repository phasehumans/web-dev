import { renderBaseEmail } from './base.template'

import type { RenderedEmail } from './otp.template'

export interface RenderWelcomeEmailOptions {
    name?: string
    supportEmail: string
    webUrl: string
    npmUrl?: string
    githubUrl?: string
}

export const renderWelcomeEmail = ({
    name,
    supportEmail,
    webUrl,
    npmUrl = 'https://www.npmjs.com/package/@trydecember/cli',
    githubUrl = 'https://github.com/phasehumans/december',
}: RenderWelcomeEmailOptions): RenderedEmail => {
    const greetingName = name?.trim() ? name.trim() : 'there'
    const subject = 'Welcome to December'
    const previewText = 'December is an AI coding agent that lives in your terminal.'

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
            December is an AI coding agent that lives in your terminal. It understands your codebase and helps you build faster by writing code, fixing bugs, and running commands.
          </p>
          <p class='text-secondary' style='margin: 0 0 10px 0; font-size: 14px; line-height: 22px; color: #57534e; font-weight: 600;'>
            Here is what you can do:
          </p>
          <ul class='text-secondary' style='margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #57534e;'>
            <li style='margin-bottom: 8px;'><strong>Writes code &amp; runs commands:</strong> Ask it to build features, fix bugs, or run tests directly in your terminal or web dashboard.</li>
            <li style='margin-bottom: 8px;'><strong>Cloud Handoff:</strong> Use <code class='otp-box' style='padding: 2px 6px; background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 4px; font-family: Menlo, Monaco, Consolas, monospace; font-size: 13px;'>/handoff</code> in your terminal to continue your session seamlessly on <a class='link' href='${webUrl}' target='_blank' style='color: #1c1917; text-decoration: underline;'>trydecember.com</a>.</li>
            <li style='margin-bottom: 8px;'><strong>Bring your own AI:</strong> Plug in API keys for OpenAI, Anthropic, Gemini, and 20+ others, or use December credits.</li>
          </ul>
          <p class='text-secondary' style='margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #57534e;'>
            Run <code class='otp-box' style='padding: 2px 6px; background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 4px; font-family: Menlo, Monaco, Consolas, monospace; font-size: 13px;'>npm install -g @trydecember/cli</code> to get started locally, or launch a session in your browser:
          </p>
          
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
        footerLinks: [
            { label: 'GitHub', url: githubUrl },
            { label: 'npm', url: npmUrl },
            { label: 'Website', url: webUrl },
        ],
    })

    const text = `Welcome to December

Hi ${greetingName},

December is an AI coding agent that lives in your terminal. It understands your codebase and helps you build faster by writing code, fixing bugs, and running commands.

Here is what you can do:
- Writes code & runs commands: Ask it to build features, fix bugs, or run tests directly in your terminal or web dashboard.
- Cloud Handoff: Use /handoff in your terminal to continue your session seamlessly on trydecember.com.
- Bring your own AI: Plug in API keys for OpenAI, Anthropic, Gemini, and 20+ others, or use December credits.

Run "npm install -g @trydecember/cli" to get started locally, or launch a session in your browser.

Start building now: ${webUrl}

If you ever have any questions or feedback, feel free to reply to this email or reach out to our team at ${supportEmail}.

Welcome aboard,
Chaitanya Sonawane

---
GitHub: ${githubUrl}
npm: ${npmUrl}
December: ${webUrl}
`

    return {
        subject,
        html,
        text,
    }
}
