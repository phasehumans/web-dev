import React from 'react'

export const PrivacyPolicyContent: React.FC = () => {
    return (
        <div className="flex flex-col w-full max-w-[840px] text-[#D6D5C9] space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col border-b border-[#242323] pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#87B2F4]/10 text-[#87B2F4] border border-[#87B2F4]/20">
                        Legal & Compliance
                    </span>
                </div>
                <h1 className="text-[26px] md:text-[30px] font-semibold text-white tracking-tight mb-2">
                    Privacy Policy
                </h1>
                <p className="text-[13.5px] text-[#8F8E8D]">
                    Effective Date: July 1, 2026 &bull; Last Updated: August 21, 2026
                </p>
            </div>

            {/* Overview / Introduction */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">1. Introduction & Scope</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    This Privacy Policy explains how{' '}
                    <strong className="text-white">December Agent</strong> (&quot;December&quot;,
                    &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operated by Phase Humans
                    Inc. and accessible at{' '}
                    <a href="https://trydecember.com" className="text-[#87B2F4] hover:underline">
                        https://trydecember.com
                    </a>
                    , collects, uses, protects, and discloses information when you use our
                    autonomous AI software engineering platform, web applications, APIs, and CLI
                    tools (collectively, the &quot;Service&quot;).
                </p>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    By accessing or using December Agent, you consent to the practices described in
                    this Privacy Policy. If you do not agree with this policy, please do not access
                    or use our Service.
                </p>
            </section>

            {/* Google OAuth & User Data Policy Compliance */}
            <section className="flex flex-col gap-3 bg-[#171717] border border-[#2B2B2B] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#87B2F4]">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <h2 className="text-[16px] font-semibold text-white">
                        2. Google OAuth & API Services User Data Policy
                    </h2>
                </div>
                <p className="text-[14px] text-[#D6D5C9] leading-relaxed font-medium">
                    December Agent&apos;s use and transfer to any other app of information received
                    from Google APIs will adhere to the{' '}
                    <a
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#87B2F4] underline hover:text-white"
                    >
                        Google API Services User Data Policy
                    </a>
                    , including the <strong className="text-white">Limited Use</strong>{' '}
                    requirements.
                </p>
                <div className="flex flex-col gap-2 text-[13.5px] text-[#A3A29E] mt-2">
                    <p>
                        When you choose to sign in to December Agent using Google OAuth, we access:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-white">Google Profile Data:</strong> Your basic
                            profile information including your full name, email address, profile
                            photo URL, and unique Google account identifier.
                        </li>
                    </ul>
                    <p className="mt-1">
                        <strong className="text-white">Purpose of Google Data:</strong> This
                        information is strictly utilized to authenticate your identity, create and
                        maintain your user account, personalize your development workspace, and
                        communicate vital account notifications.
                    </p>
                    <p className="mt-1">
                        <strong className="text-white">No Advertising or Sale:</strong> We do NOT
                        sell Google user data, share Google user data with data brokers, or use
                        Google user data for serving targeted advertisements.
                    </p>
                </div>
            </section>

            {/* Information We Collect */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">3. Information We Collect</h2>
                <div className="space-y-3 text-[14px] text-[#A3A29E] leading-relaxed">
                    <div>
                        <h3 className="text-[14.5px] font-medium text-[#E0DFD5] mb-1">
                            A. Information You Provide
                        </h3>
                        <p>
                            We collect information you provide directly, including account
                            credentials (email, name, password), project prompts, natural language
                            instructions, feedback, and workspace configurations.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-[14.5px] font-medium text-[#E0DFD5] mb-1">
                            B. Connected Third-Party Integrations
                        </h3>
                        <p>
                            When you connect third-party platforms such as GitHub, Vercel, or
                            Supabase, we store encrypted access tokens solely to perform the actions
                            you authorize (e.g., creating repositories, opening pull requests, and
                            deploying applications).
                        </p>
                    </div>
                    <div>
                        <h3 className="text-[14.5px] font-medium text-[#E0DFD5] mb-1">
                            C. Automated Usage & Telemetry
                        </h3>
                        <p>
                            We collect standard operational telemetry (such as browser type, IP
                            address, device details, and API latency) to detect bugs, enforce rate
                            limits, and maintain service security and reliability.
                        </p>
                    </div>
                </div>
            </section>

            {/* Code Privacy & Model Isolation */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    4. Code Privacy & AI Model Isolation
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    Your code and workspace data belong exclusively to you:
                </p>
                <div className="bg-[#1A191B] border border-[#2D2C2F] rounded-lg p-4 space-y-2 text-[13.5px] text-[#D6D5C9]">
                    <div className="flex items-start gap-2">
                        <span className="text-[#87B2F4] font-bold">&bull;</span>
                        <p>
                            <strong className="text-white">No Model Training:</strong> We do NOT
                            sell your source code or use your private repositories, code diffs, or
                            prompts to train or improve generalized public AI models.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-[#87B2F4] font-bold">&bull;</span>
                        <p>
                            <strong className="text-white">Isolated Sandboxes:</strong> Your
                            execution environments, live preview containers, and terminal processes
                            run in isolated, secure micro-VM containers.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-[#87B2F4] font-bold">&bull;</span>
                        <p>
                            <strong className="text-white">Encrypted Secrets:</strong> API keys,
                            database URLs, and environment variables are encrypted at rest using
                            industry-grade cryptography (AES-256).
                        </p>
                    </div>
                </div>
            </section>

            {/* Data Sharing */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    5. How We Share Information
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    We never sell, rent, or trade your personal information or codebase. We only
                    share information in the following limited situations:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-[14px] text-[#A3A29E] pl-2">
                    <li>
                        <strong className="text-white">Service Providers:</strong> Trusted cloud
                        infrastructure, authentication providers, and database hosts who operate
                        under strict confidentiality and security agreements.
                    </li>
                    <li>
                        <strong className="text-white">Third-Party LLM Providers:</strong> Prompts
                        sent to model providers (such as Anthropic, OpenAI, or Google Cloud Vertex)
                        are transmitted strictly for real-time inference in accordance with
                        enterprise zero-data-retention agreements where applicable.
                    </li>
                    <li>
                        <strong className="text-white">Legal Obligations:</strong> If required by
                        law, subpoena, or lawful governmental request.
                    </li>
                </ul>
            </section>

            {/* Data Retention & User Rights */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    6. Data Retention, Rights & Deletion
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    You have complete control over your personal data and projects:
                </p>
                <div className="space-y-2 text-[14px] text-[#A3A29E] leading-relaxed">
                    <p>
                        <strong className="text-white">Access & Export:</strong> You can download
                        all your generated code, project repositories, and workspace files at any
                        time as ZIP archives or by pushing directly to GitHub.
                    </p>
                    <p>
                        <strong className="text-white">Account Deletion:</strong> You can
                        permanently delete your account, session logs, and associated credentials
                        directly from the Account Settings page, or by submitting a deletion request
                        to{' '}
                        <a
                            href="mailto:privacy@trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            privacy@trydecember.com
                        </a>
                        . Upon request, all personal data and associated workspace files will be
                        permanently purged within 30 days.
                    </p>
                </div>
            </section>

            {/* Security */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">7. Data Security</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    We implement modern technical and organizational safeguards including end-to-end
                    TLS 1.3 encryption for data in transit, AES-256 encryption for data at rest,
                    role-based access control, and automated vulnerability monitoring.
                </p>
            </section>

            {/* Children's Privacy */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">8. Children&apos;s Privacy</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    December Agent is intended for software developers and is not directed to
                    children under 13 years of age. We do not knowingly collect personal information
                    from children under 13.
                </p>
            </section>

            {/* Changes to this Policy */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    9. Changes to This Privacy Policy
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    We may update this Privacy Policy periodically to reflect new features or
                    regulatory requirements. We will notify you of material changes by updating the
                    &quot;Last Updated&quot; date at the top of this policy and, where appropriate,
                    through in-app notifications or email.
                </p>
            </section>

            {/* Contact Us */}
            <section className="flex flex-col gap-3 border-t border-[#242323] pt-6">
                <h2 className="text-[17px] font-semibold text-white">
                    10. Contact Us & Privacy Inquiries
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    If you have questions, feedback, or data privacy requests regarding December
                    Agent or this Privacy Policy, please contact our Data Protection team at:
                </p>
                <div className="bg-[#141414] border border-[#242323] rounded-lg p-4 text-[13.5px] space-y-1.5 text-[#D6D5C9]">
                    <p>
                        <strong className="text-white">December Agent / Phase Humans Inc.</strong>
                    </p>
                    <p>
                        Website:{' '}
                        <a
                            href="https://trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            https://trydecember.com
                        </a>
                    </p>
                    <p>
                        Privacy Email:{' '}
                        <a
                            href="mailto:privacy@trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            privacy@trydecember.com
                        </a>
                    </p>
                    <p>
                        Support Email:{' '}
                        <a
                            href="mailto:support@trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            support@trydecember.com
                        </a>
                    </p>
                </div>
            </section>
        </div>
    )
}
