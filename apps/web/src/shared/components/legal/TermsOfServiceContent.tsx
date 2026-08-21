import React from 'react'

export const TermsOfServiceContent: React.FC = () => {
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
                    Terms of Service
                </h1>
                <p className="text-[13.5px] text-[#8F8E8D]">
                    Effective Date: July 1, 2026 &bull; Last Updated: August 21, 2026
                </p>
            </div>

            {/* 1. Acceptance */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">1. Acceptance of Terms</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    These Terms of Service (&quot;Terms&quot;) govern your access to and use of{' '}
                    <strong className="text-white">December Agent</strong> (&quot;Platform&quot;,
                    &quot;Service&quot;), accessible at{' '}
                    <a href="https://trydecember.com" className="text-[#87B2F4] hover:underline">
                        https://trydecember.com
                    </a>
                    , provided and operated by Phase Humans Inc. (&quot;Company&quot;,
                    &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
                </p>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    By registering for an account, accessing, or using December Agent in any manner,
                    you agree to be bound by these Terms and our Privacy Policy. If you are entering
                    into these Terms on behalf of a company or legal entity, you represent that you
                    have the authority to bind such entity.
                </p>
            </section>

            {/* 2. Platform Description */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    2. Description of the Platform
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    December Agent is an autonomous AI software engineering platform and cloud
                    workspace that enables developers and teams to plan, generate, build, test, and
                    run full-stack software applications in isolated cloud sandbox containers. The
                    platform also offers command-line tooling (December CLI) and automated GitHub
                    integration.
                </p>
            </section>

            {/* 3. Accounts & Authentication */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    3. User Accounts & Security
                </h2>
                <div className="space-y-2 text-[14px] text-[#A3A29E] leading-relaxed">
                    <p>
                        To use certain features of December Agent, you may register an account using
                        Google OAuth, GitHub OAuth, or email credentials. You agree to provide
                        accurate, complete information and keep your credentials confidential.
                    </p>
                    <p>
                        You are responsible for all activities that occur under your account. If you
                        discover or suspect unauthorized access to your account or API keys, you
                        must notify us immediately at{' '}
                        <a
                            href="mailto:support@trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            support@trydecember.com
                        </a>
                        .
                    </p>
                </div>
            </section>

            {/* 4. Ownership & Intellectual Property */}
            <section className="flex flex-col gap-3 bg-[#171717] border border-[#2B2B2B] rounded-xl p-5">
                <h2 className="text-[16px] font-semibold text-white">
                    4. Ownership of Code & Intellectual Property
                </h2>
                <div className="space-y-2.5 text-[14px] text-[#D6D5C9] leading-relaxed">
                    <p>
                        <strong className="text-white">Your Intellectual Property:</strong> You
                        retain 100% full ownership of all prompts, repositories, source code,
                        specifications, images, and other assets you create, upload, or generate
                        using December Agent. Phase Humans Inc. claims no intellectual property
                        rights over your software or projects.
                    </p>
                    <p>
                        <strong className="text-white">Our Intellectual Property:</strong> Phase
                        Humans Inc. retains all right, title, and interest in and to the December
                        Agent platform, brand, logos, user interface, software engine, and
                        documentation.
                    </p>
                </div>
            </section>

            {/* 5. AI Output & Disclaimers */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    5. AI Output & Developer Responsibility
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    December Agent employs artificial intelligence and machine learning models to
                    synthesize code and architecture suggestions. You acknowledge and agree that:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-[14px] text-[#A3A29E] pl-2">
                    <li>
                        AI-generated code and automated refactors are provided on an{' '}
                        <strong className="text-white">&quot;AS-IS&quot;</strong> and{' '}
                        <strong className="text-white">&quot;AS-AVAILABLE&quot;</strong> basis.
                    </li>
                    <li>
                        You are solely responsible for reviewing, compiling, testing, and verifying
                        the security, accuracy, and performance of any generated code before
                        deploying it to production environments.
                    </li>
                    <li>
                        We do not warrant that generated code will be completely bug-free,
                        uninterrupted, or suitable for any particular mission-critical application.
                    </li>
                </ul>
            </section>

            {/* 6. Acceptable Use */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">6. Acceptable Use Policy</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    You agree not to misuse December Agent. Prohibited activities include, but are
                    not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-[14px] text-[#A3A29E] pl-2">
                    <li>
                        Generating, deploying, or distributing malware, ransomware, spyware, or
                        malicious exploits.
                    </li>
                    <li>
                        Attempting to compromise, escape, or reverse-engineer sandbox container
                        isolation or platform infrastructure.
                    </li>
                    <li>
                        Conducting unauthorized port scanning, vulnerability probing, or
                        denial-of-service attacks against internal or external networks.
                    </li>
                    <li>
                        Using the Service in violation of any applicable local, state, national, or
                        international laws.
                    </li>
                    <li>Bypassing rate limits, API token validations, or access controls.</li>
                </ul>
            </section>

            {/* 7. Billing & Subscriptions */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    7. Billing, Credits & Subscriptions
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    Certain features and compute tiers require paid credits or subscription plans.
                    All fees are stated in U.S. Dollars (USD). Payments are processed securely via
                    third-party payment processors. You can manage your billing preferences, view
                    invoices, or cancel subscriptions at any time via the Billing tab in Account
                    Settings.
                </p>
            </section>

            {/* 8. Termination */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">
                    8. Termination & Suspension
                </h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    You may terminate your account at any time via the Account Settings interface.
                    We reserve the right to suspend or terminate accounts that engage in egregious
                    violations of our Acceptable Use Policy or applicable laws.
                </p>
            </section>

            {/* 9. Disclaimers & Limitation of Liability */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">9. Limitation of Liability</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PHASE
                    HUMANS INC., ITS DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT,
                    INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF
                    PROFITS, DATA, USE, OR GOODWILL) ARISING OUT OF OR IN CONNECTION WITH YOUR
                    ACCESS OR USE OF DECEMBER AGENT.
                </p>
            </section>

            {/* 10. Governing Law */}
            <section className="flex flex-col gap-3">
                <h2 className="text-[17px] font-semibold text-white">10. Governing Law</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    These Terms shall be governed and construed in accordance with the laws of the
                    State of Delaware, United States, without regard to its conflict of law
                    principles.
                </p>
            </section>

            {/* 11. Contact */}
            <section className="flex flex-col gap-3 border-t border-[#242323] pt-6">
                <h2 className="text-[17px] font-semibold text-white">11. Contact Information</h2>
                <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                    For any questions, legal notices, or inquiries regarding these Terms of Service,
                    please contact:
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
                        Support Email:{' '}
                        <a
                            href="mailto:support@trydecember.com"
                            className="text-[#87B2F4] hover:underline"
                        >
                            support@trydecember.com
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
                </div>
            </section>
        </div>
    )
}
