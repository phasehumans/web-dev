export interface BaseEmailOptions {
    previewText: string
    content: string
    supportEmail: string
    webUrl?: string
}

export const renderBaseEmail = ({
    previewText,
    content,
    supportEmail,
}: BaseEmailOptions): string => {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>December</title>
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
  <body class="body-bg" style="margin: 0; padding: 48px 16px; background-color: #ffffff; color: #1c1917; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <!-- Hidden Preheader -->
    <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
      ${previewText}
      &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; margin: 0 auto; text-align: left;">
            ${content}

            <!-- Divider -->
            <tr>
              <td style="padding-top: 16px; padding-bottom: 24px;">
                <div class="divider" style="height: 1px; background-color: #f5f5f4; border-bottom: 1px solid #e7e5e4;"></div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="text-align: center;">
                <p class="text-muted" style="margin: 0 0 6px 0; font-size: 11px; line-height: 16px; color: #a8a29e;">
                  Questions? Reach out to <a class="link" href="mailto:${supportEmail}" style="color: #57534e; text-decoration: underline;">${supportEmail}</a>
                </p>
                <p class="text-muted" style="margin: 0; font-size: 10px; line-height: 14px; color: #a8a29e; letter-spacing: 0.2px;">
                  Automated email from December
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
