import React from 'react'

import { BentoGridSection } from './components/BentoGridSection'
import { CliDeepDiveSection } from './components/CliDeepDiveSection'
import { CloudDeepDiveSection } from './components/CloudDeepDiveSection'
import { FaqSection } from './components/FaqSection'
import { HandoffSection } from './components/HandoffSection'
import { LandingFooter } from './components/LandingFooter'
import { LandingHero } from './components/LandingHero'
import { LandingNav } from './components/LandingNav'

interface LandingPageProps {
    onLaunchApp: () => void
    onSignIn: () => void
    youtubeVideoId?: string
}

export const LandingPage: React.FC<LandingPageProps> = ({
    onLaunchApp,
    onSignIn,
    youtubeVideoId,
}) => {
    return (
        <div className="w-full min-h-screen bg-white text-[#0B1015] font-sans selection:bg-[#87B2F4]/30 selection:text-[#0B1015] flex flex-col antialiased">
            {/* Top Navigation */}
            <LandingNav onLaunchApp={onLaunchApp} onSignIn={onSignIn} />

            {/* Main Content Sections */}
            <main className="flex-1 w-full flex flex-col items-center">
                {/* Hero + Founder Video */}
                <LandingHero onLaunchApp={onLaunchApp} youtubeVideoId={youtubeVideoId} />

                {/* Section 01: CLI Deep Dive & Interactive Simulator */}
                <CliDeepDiveSection />

                {/* Section 02: Cloud MicroVM & Live Previews */}
                <CloudDeepDiveSection />

                {/* Section 03: The /handoff Bridge Pipeline */}
                <HandoffSection />

                {/* Section 04: Bento Grid (MCP Explorer, Models, Self-Verification) */}
                <BentoGridSection />

                {/* Section 05: FAQ */}
                <FaqSection />
            </main>

            {/* Footer */}
            <LandingFooter onLaunchApp={onLaunchApp} />
        </div>
    )
}
