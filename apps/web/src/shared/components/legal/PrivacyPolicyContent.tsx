import React from 'react'

export const PrivacyPolicyContent: React.FC = () => {
    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Header */}
            <div className="flex flex-col mb-6">
                <h1 className="text-[16px] font-medium mb-1">Privacy Policy</h1>
                <p className="text-[13px] text-[#7B7A79]">
                    Effective Date: July 1, 2026 &bull; Last Updated: August 21, 2026
                </p>
            </div>

            <div className="flex flex-col gap-6 border-t border-[#242323] pt-5">
                {/* 1. Introduction & Scope */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">1. Introduction & Scope</h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        This Privacy Policy explains how{' '}
                        <strong className="text-[#D6D5C9]">December Agent</strong>{' '}
                        (&quot;December&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
                        operated by Phase Humans Inc. and accessible at{' '}
                        <a
                            href="https://trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            https://trydecember.com
                        </a>
                        , collects, uses, protects, and discloses information when you use our
                        autonomous AI software engineering platform, web applications, APIs, and CLI
                        tools (collectively, the &quot;Service&quot;).
                    </p>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        By accessing or using December Agent, you consent to the practices described
                        in this Privacy Policy. If you do not agree with this policy, please do not
                        access or use our Service.
                    </p>
                </section>

                {/* 2. Google OAuth & API Services User Data Policy */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">
                        2. Google OAuth & API Services User Data Policy
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        December Agent&apos;s use and transfer to any other app of information
                        received from Google APIs will adhere to the{' '}
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
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        When you sign in to December Agent using Google OAuth, we access:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[13.5px] text-[#9A9998] pl-1">
                        <li>
                            <strong className="text-[#D6D5C9]">Google Profile Data:</strong> Your
                            full name, email address, profile photo URL, and unique Google account
                            identifier.
                        </li>
                    </ul>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        <strong className="text-[#D6D5C9]">Purpose of Google Data:</strong> This
                        information is strictly utilized to authenticate your identity, create and
                        maintain your user account, personalize your development workspace, and
                        communicate vital account notifications.
                    </p>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        <strong className="text-[#D6D5C9]">No Advertising or Sale:</strong> We do
                        NOT sell Google user data, share Google user data with data brokers, or use
                        Google user data for serving targeted advertisements.
                    </p>
                </section>

                {/* 3. Information We Collect */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">
                        3. Information We Collect
                    </h2>
                    <div className="space-y-3 text-[13.5px] text-[#9A9998] leading-relaxed">
                        <div>
                            <h3 className="text-[13.5px] font-medium text-[#D6D5C9] mb-0.5">
                                A. Information You Provide
                            </h3>
                            <p>
                                We collect information you provide directly, including account
                                credentials (email, name, password), project prompts, natural
                                language instructions, feedback, and workspace configurations.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-[13.5px] font-medium text-[#D6D5C9] mb-0.5">
                                B. Connected Third-Party Integrations
                            </h3>
                            <p>
                                When you connect third-party platforms such as GitHub, Vercel, or
                                Supabase, we store encrypted access tokens solely to perform the
                                actions you authorize (e.g., creating repositories, opening pull
                                requests, and deploying applications).
                            </p>
                        </div>
                        <div>
                            <h3 className="text-[13.5px] font-medium text-[#D6D5C9] mb-0.5">
                                C. Automated Usage & Telemetry
                            </h3>
                            <p>
                                We collect standard operational telemetry (such as browser type, IP
                                address, device details, and API latency) to detect bugs, enforce
                                rate limits, and maintain service security and reliability.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 4. Code Privacy & AI Model Isolation */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">
                        4. Code Privacy & AI Model Isolation
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        Your code and workspace data belong exclusively to you:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[13.5px] text-[#9A9998] pl-1">
                        <li>
                            <strong className="text-[#D6D5C9]">No Model Training:</strong> We do NOT
                            sell your source code or use your private repositories, code diffs, or
                            prompts to train or improve generalized public AI models.
                        </li>
                        <li>
                            <strong className="text-[#D6D5C9]">Isolated Sandboxes:</strong> Your
                            execution environments, live preview containers, and terminal processes
                            run in isolated, secure micro-VM containers.
                        </li>
                        <li>
                            <strong className="text-[#D6D5C9]">Encrypted Secrets:</strong> API keys,
                            database URLs, and environment variables are encrypted at rest using
                            industry-grade cryptography (AES-256).
                        </li>
                    </ul>
                </section>

                {/* 5. How We Share Information */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">
                        5. How We Share Information
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        We never sell, rent, or trade your personal information or codebase. We only
                        share information in the following limited situations:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[13.5px] text-[#9A9998] pl-1">
                        <li>
                            <strong className="text-[#D6D5C9]">Service Providers:</strong> Trusted
                            cloud infrastructure, authentication providers, and database hosts who
                            operate under strict confidentiality agreements.
                        </li>
                        <li>
                            <strong className="text-[#D6D5C9]">Third-Party LLM Providers:</strong>{' '}
                            Prompts sent to model providers are transmitted strictly for real-time
                            inference in accordance with enterprise zero-data-retention agreements
                            where applicable.
                        </li>
                        <li>
                            <strong className="text-[#D6D5C9]">Legal Obligations:</strong> If
                            required by law, subpoena, or lawful governmental request.
                        </li>
                    </ul>
                </section>

                {/* 6. Data Retention, Rights & Deletion */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">
                        6. Data Retention, Rights & Deletion
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        You have complete control over your personal data and projects:
                    </p>
                    <div className="space-y-2 text-[13.5px] text-[#9A9998] leading-relaxed">
                        <p>
                            <strong className="text-[#D6D5C9]">Access & Export:</strong> You can
                            download all your generated code, project repositories, and workspace
                            files at any time as ZIP archives or by pushing directly to GitHub.
                        </p>
                        <p>
                            <strong className="text-[#D6D5C9]">Account Deletion:</strong> You can
                            permanently delete your account directly from Account Settings or by
                            emailing{' '}
                            <a
                                href="mailto:privacy@trydecember.com"
                                className="text-[#87B2F4] hover:underline"
                            >
                                privacy@trydecember.com
                            </a>
                            . Upon request, personal data and workspace files are permanently purged
                            within 30 days.
                        </p>
                    </div>
                </section>

                {/* 7. Data Security */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">7. Data Security</h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        We implement modern technical and organizational safeguards including
                        end-to-end TLS 1.3 encryption for data in transit, AES-256 encryption for
                        data at rest, role-based access control, and automated vulnerability
                        monitoring.
                    </p>
                </section>

                {/* 8. Children's Privacy */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">
                        8. Children&apos;s Privacy
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        December Agent is intended for software developers and is not directed to
                        children under 13 years of age. We do not knowingly collect personal
                        information from children under 13.
                    </p>
                </section>

                {/* 9. Changes */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-white">
                        9. Changes to This Policy
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        We may update this Privacy Policy periodically. We will notify you of
                        material changes by updating the &quot;Last Updated&quot; date and, where
                        appropriate, through in-app notifications.
                    </p>
                </section>

                {/* 10. Contact Us */}
                <section className="flex flex-col gap-2 border-t border-[#242323] pt-5">
                    <h2 className="text-[14px] font-medium text-white">10. Contact Us</h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        If you have questions, feedback, or privacy requests regarding December
                        Agent, contact our Data Protection team at:
                    </p>
                    <div className="flex flex-col gap-1 text-[13.5px] text-[#9A9998] leading-relaxed">
                        <p>
                            <strong className="text-[#D6D5C9]">
                                December Agent / Phase Humans Inc.
                            </strong>
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
        </div>
    )
}
