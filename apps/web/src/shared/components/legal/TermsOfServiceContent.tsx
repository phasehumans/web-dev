import React from 'react'

export const TermsOfServiceContent: React.FC = () => {
    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Header */}
            <div className="flex flex-col mb-6">
                <h1 className="text-[16px] font-medium text-[#EDEDEF] mb-1">Terms of Service</h1>
            </div>

            <div className="flex flex-col gap-6 border-t border-[#242323] pt-5">
                {/* 1. Acceptance */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        1. Acceptance of Terms
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        These Terms of Service (&quot;Terms&quot;) govern your access to and use of{' '}
                        <strong className="text-[#D6D5C9]">December</strong> (&quot;Platform&quot;,
                        &quot;Service&quot;), accessible at{' '}
                        <a
                            href="https://trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            https://trydecember.com
                        </a>{' '}
                        (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
                    </p>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        By registering for an account, accessing, or using December, you agree to be
                        bound by these Terms and our Privacy Policy.
                    </p>
                </section>

                {/* 2. Description of the Platform */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        2. Description of the Platform
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        December is an autonomous AI software engineering platform and cloud
                        workspace that enables developers and teams to plan, generate, build, test,
                        and run full-stack software applications in isolated cloud sandbox
                        containers.
                    </p>
                </section>

                {/* 3. User Accounts & Security */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        3. User Accounts & Security
                    </h2>
                    <div className="space-y-2 text-[13.5px] text-[#9A9998] leading-relaxed">
                        <p>
                            You agree to provide accurate information and keep your credentials
                            confidential. You are responsible for all activities that occur under
                            your account.
                        </p>
                        <p>
                            If you discover or suspect unauthorized access to your account or API
                            keys, notify us immediately at{' '}
                            <a
                                href="mailto:team@trydecember.com"
                                className="text-[#87B2F4] hover:underline"
                            >
                                team@trydecember.com
                            </a>
                            .
                        </p>
                    </div>
                </section>

                {/* 4. Ownership & Intellectual Property */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        4. Ownership of Code & Intellectual Property
                    </h2>
                    <div className="space-y-2 text-[13.5px] text-[#9A9998] leading-relaxed">
                        <p>
                            <strong className="text-[#D6D5C9]">Your Intellectual Property:</strong>{' '}
                            You retain 100% full ownership of all prompts, repositories, source
                            code, specifications, images, and other assets you create, upload, or
                            generate using December. We claim no intellectual property rights over
                            your software or projects.
                        </p>
                        <p>
                            <strong className="text-[#D6D5C9]">Our Intellectual Property:</strong>{' '}
                            We retain all right, title, and interest in and to the December
                            platform, brand, logos, user interface, software engine, and
                            documentation.
                        </p>
                    </div>
                </section>

                {/* 5. AI Output & Developer Responsibility */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        5. AI Output & Developer Responsibility
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        December employs artificial intelligence models to synthesize code and
                        architecture suggestions. You acknowledge and agree that:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[13.5px] text-[#9A9998] pl-1">
                        <li>
                            AI-generated code and automated refactors are provided on an{' '}
                            <strong className="text-[#D6D5C9]">&quot;AS-IS&quot;</strong> and{' '}
                            <strong className="text-[#D6D5C9]">&quot;AS-AVAILABLE&quot;</strong>{' '}
                            basis.
                        </li>
                        <li>
                            You are solely responsible for reviewing, compiling, testing, and
                            verifying the security, accuracy, and performance of any generated code
                            before deploying it to production.
                        </li>
                    </ul>
                </section>

                {/* 6. Acceptable Use Policy */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        6. Acceptable Use Policy
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        You agree not to misuse December. Prohibited activities include:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[13.5px] text-[#9A9998] pl-1">
                        <li>
                            Generating, deploying, or distributing malware, ransomware, or malicious
                            exploits.
                        </li>
                        <li>
                            Attempting to compromise or reverse-engineer sandbox container isolation
                            or platform infrastructure.
                        </li>
                        <li>Conducting unauthorized port scanning or denial-of-service attacks.</li>
                        <li>
                            Using the Service in violation of any applicable local, state, national,
                            or international laws.
                        </li>
                    </ul>
                </section>

                {/* 7. Billing & Subscriptions */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        7. Billing, Credits & Subscriptions
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        Certain features require paid credits or subscription plans. All fees are
                        stated in USD. You can manage your billing preferences, view invoices, or
                        cancel subscriptions at any time via the Billing tab in Account Settings.
                    </p>
                </section>

                {/* 8. Termination */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        8. Termination & Suspension
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        You may terminate your account at any time via the Account Settings
                        interface. We reserve the right to suspend or terminate accounts that engage
                        in egregious violations of our Acceptable Use Policy.
                    </p>
                </section>

                {/* 9. Limitation of Liability */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        9. Limitation of Liability
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
                        DECEMBER OR ITS CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR IN CONNECTION
                        WITH YOUR USE OF DECEMBER.
                    </p>
                </section>

                {/* 10. Governing Law */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">10. Governing Law</h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        These Terms shall be governed and construed in accordance with applicable
                        laws.
                    </p>
                </section>

                {/* 11. Contact Information */}
                <section className="flex flex-col gap-2 border-t border-[#242323] pt-5">
                    <h2 className="text-[14px] font-medium text-[#EDEDEF]">
                        11. Contact Information
                    </h2>
                    <p className="text-[13.5px] text-[#9A9998] leading-relaxed">
                        For any questions, legal notices, or inquiries regarding these Terms of
                        Service, please contact us at:
                    </p>
                    <div className="flex flex-col gap-1 text-[13.5px] text-[#9A9998] leading-relaxed">
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
                            Email:{' '}
                            <a
                                href="mailto:team@trydecember.com"
                                className="text-[#87B2F4] hover:underline"
                            >
                                team@trydecember.com
                            </a>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    )
}
