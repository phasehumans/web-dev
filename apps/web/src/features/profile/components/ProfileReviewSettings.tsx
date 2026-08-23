import { Search, Plus, ChevronDown, ExternalLink } from 'lucide-react'
import React, { useState } from 'react'

interface FeedbackBot {
    id: string
    name: string
    logo: React.ReactNode
    enabled: boolean
}

const GraphiteLogo = () => (
    <div className="w-4 h-4 rounded bg-black border border-[#3A3938] flex items-center justify-center shrink-0 p-[1px]">
        <svg
            className="w-3 h-3 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="12 2 19 6.5 19 15.5 12 20 5 15.5 5 6.5 12 2" />
            <circle cx="12" cy="11" r="2.5" />
        </svg>
    </div>
)

const CursorLogo = () => (
    <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3.5 7v10l8.5 5 8.5-5V7L12 2zm0 2.3l6.5 3.8-6.5 3.8-6.5-3.8 6.5-3.8zm-7 5.3l6 3.5v7l-6-3.5v-7zm14 7l-6 3.5v-7l6-3.5v7z" />
    </svg>
)

const CodeRabbitLogo = () => (
    <div className="w-4 h-4 rounded-full bg-[#FF4D00] flex items-center justify-center shrink-0 overflow-hidden">
        <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 4c-.6 0-1.2.4-1.5 1l-2 4.5C13.2 8.5 11.7 8 10 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8c0-1.7-.5-3.2-1.5-4.5L18.5 7c.6-.3 1-1 1-1.6V4h-1.5zM10 21c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" />
        </svg>
    </div>
)

const GreptileLogo = () => (
    <svg className="w-4 h-4 text-[#34D399] shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 7c-2.5-1-6-1.5-9-1S5 8 3 11c-1 1.5-1.5 3.5-1 5.5s2 3.5 4 4c2.5.5 5.5 0 8-1.5s4.5-4 5.5-7c.5-1.5.5-3.5.5-5zM9 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        <path d="M7 4.5L9.5 7H7V4.5zm4-2l2.5 3.5H11V2.5zm4.5 1.5L18 7.5h-2.5V4z" />
    </svg>
)

const GithubLogo = () => (
    <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
)

const GeminiLogo = () => (
    <svg className="w-4 h-4 text-[#87B2F4] shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
    </svg>
)

const INITIAL_BOTS: FeedbackBot[] = [
    { id: 'bot-1', name: 'Graphite', logo: <GraphiteLogo />, enabled: false },
    { id: 'bot-2', name: 'Cursor Bugbot', logo: <CursorLogo />, enabled: false },
    { id: 'bot-3', name: 'CodeRabbit', logo: <CodeRabbitLogo />, enabled: false },
    { id: 'bot-4', name: 'Greptile', logo: <GreptileLogo />, enabled: false },
    { id: 'bot-5', name: 'GitHub Actions', logo: <GithubLogo />, enabled: false },
    { id: 'bot-6', name: 'Gemini Code Assist', logo: <GeminiLogo />, enabled: false },
]

export const ProfileReviewSettings: React.FC = () => {
    // Toggles state matching screenshots
    const [includeLink, setIncludeLink] = useState(true)
    const [enableSecurityScan, setEnableSecurityScan] = useState(true)
    const [postBugs, setPostBugs] = useState(true)
    const [postSecurity, setPostSecurity] = useState(true)
    const [postFlagsInvestigate, setPostFlagsInvestigate] = useState(false)
    const [postFlagsNote, setPostFlagsNote] = useState(false)
    const [postCiChecks, setPostCiChecks] = useState(true)

    // Automated Feedback bots state
    const [bots, setBots] = useState<FeedbackBot[]>(INITIAL_BOTS)

    // Automatic review tabs & state
    const [activeTab, setActiveTab] = useState<'Repositories' | 'Users'>('Repositories')
    const [repoSearch, setRepoSearch] = useState('')
    const [selectedMode, setSelectedMode] = useState('All modes')

    // Auto-review limits
    const [spendLimit, setSpendLimit] = useState('No limit')

    // Rules
    const [fileRuleInput, setFileRuleInput] = useState('')
    const [fileRules, setFileRules] = useState<string[]>(['**/REVIEW.md'])

    const toggleBot = (id: string) => {
        setBots((prev) => prev.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)))
    }

    const handleAddFileRule = (e: React.FormEvent) => {
        e.preventDefault()
        if (!fileRuleInput.trim()) return
        setFileRules((prev) => [...prev, fileRuleInput.trim()])
        setFileRuleInput('')
    }

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Section 1: PR descriptions */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">PR descriptions</h1>
                <div className="flex flex-col gap-6 border-t border-[#242323] pt-4">
                    <span className="text-[13px] text-[#7B7A79]">
                        Adjust how Code Review edits pull request descriptions
                    </span>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[14px] text-[#D6D5C9]">
                                Include a link to Code Review in the pull request description
                            </span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Includes a link to Code Review in the pull request description
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => setIncludeLink(!includeLink)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                includeLink ? 'bg-[#87B2F4]' : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    includeLink
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 2: Security scan */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">Security scan</h1>
                <div className="flex flex-col gap-6 border-t border-[#242323] pt-4">
                    <span className="text-[13px] text-[#7B7A79]">
                        Run an additional security-focused analysis phase on each PR
                    </span>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[14px] text-[#D6D5C9]">Enable security scan</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Detect vulnerabilities and security hardening opportunities
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => setEnableSecurityScan(!enableSecurityScan)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                enableSecurityScan
                                    ? 'bg-[#87B2F4]'
                                    : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    enableSecurityScan
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 3: Post as PR comments */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">Post as PR comments</h1>
                <div className="flex flex-col gap-6 border-t border-[#242323] pt-4">
                    <span className="text-[13px] text-[#7B7A79]">
                        Analyses from Code Review can be posted as comments to git providers
                    </span>

                    {/* Bugs */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[14px] text-[#D6D5C9]">Bugs</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Likely errors or incorrect behavior in the code
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => setPostBugs(!postBugs)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                postBugs ? 'bg-[#87B2F4]' : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    postBugs
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Security */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[14px] text-[#D6D5C9]">Security</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Vulnerabilities and security hardening suggestions
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => setPostSecurity(!postSecurity)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                postSecurity ? 'bg-[#87B2F4]' : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    postSecurity
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Flags (investigate) */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[14px] text-[#D6D5C9]">Flags (investigate)</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Potential issues worth a closer look before merging
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => setPostFlagsInvestigate(!postFlagsInvestigate)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                postFlagsInvestigate
                                    ? 'bg-[#87B2F4]'
                                    : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    postFlagsInvestigate
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Flags (note) */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[14px] text-[#D6D5C9]">Flags (note)</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Informational observations that may not require action
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => setPostFlagsNote(!postFlagsNote)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                postFlagsNote ? 'bg-[#87B2F4]' : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    postFlagsNote
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 4: Post GitHub CI checks */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">Post GitHub CI checks</h1>
                <div className="flex flex-col gap-6 border-t border-[#242323] pt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[14px] text-[#D6D5C9]">
                                Post GitHub CI checks
                            </span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Creates a commit status check on the PR for each review
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => setPostCiChecks(!postCiChecks)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                postCiChecks ? 'bg-[#87B2F4]' : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    postCiChecks
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 5: Automatic review */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">Automatic review</h1>
                <div className="flex flex-col gap-4 border-t border-[#242323] pt-4">
                    <span className="text-[13px] text-[#7B7A79] leading-relaxed">
                        PRs are reviewed automatically when submitted to an enrolled repository or
                        authored by an enrolled user. If both apply and their settings differ, the
                        one that triggers more reviews takes effect. Users can self-enroll in
                        personal settings.
                    </span>

                    {/* Top Control Bar: Tabs + Add Repo Button */}
                    <div className="flex items-center justify-between gap-3 mt-1">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('Repositories')}
                                className={`px-3 py-1 rounded-lg text-[12.5px] font-medium transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'Repositories'
                                        ? 'bg-[#202020] text-white border border-[#282828]'
                                        : 'text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#202020]'
                                }`}
                            >
                                <span>Repositories</span>
                                <span className="text-[11px] opacity-70">0</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('Users')}
                                className={`px-3 py-1 rounded-lg text-[12.5px] font-medium transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'Users'
                                        ? 'bg-[#202020] text-white border border-[#282828]'
                                        : 'text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#202020]'
                                }`}
                            >
                                <span>Self-enrolled users</span>
                                <span className="text-[11px] opacity-70">0</span>
                            </button>
                        </div>

                        <button className="px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] font-medium text-[#D6D5C9] hover:bg-[#242323] transition-colors cursor-pointer">
                            Add repo
                        </button>
                    </div>

                    {/* Search & Filter Mode Row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-[280px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7A79]" />
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={repoSearch}
                                onChange={(e) => setRepoSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-[#202020] border border-[#282828] rounded-lg text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#5A5A5A] transition-colors"
                            />
                        </div>

                        <div className="relative shrink-0">
                            <select
                                value={selectedMode}
                                onChange={(e) => setSelectedMode(e.target.value)}
                                className="appearance-none bg-[#202020] border border-[#282828] rounded-lg px-3 py-1.5 pr-8 text-[12.5px] font-medium text-[#D6D5C9] focus:outline-none focus:border-[#5A5A5A] cursor-pointer"
                            >
                                <option value="All modes">All modes</option>
                                <option value="Automatic">Automatic</option>
                                <option value="Manual">Manual</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7B7A79] pointer-events-none" />
                        </div>
                    </div>

                    {/* Empty Repositories Box */}
                    <div className="bg-[#191919] border border-[#242323] rounded-xl p-6 md:p-12 flex flex-col items-center justify-center gap-1.5 text-center">
                        <h3 className="text-[14px] font-medium text-white">
                            No repositories configured
                        </h3>
                        <p className="text-[13px] text-[#7B7A79]">
                            Click &quot;Add repo&quot; to add repositories
                        </p>
                    </div>
                </div>
            </div>

            {/* Section 6: Auto-review limits */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">Auto-review limits</h1>
                <div className="flex flex-col gap-6 border-t border-[#242323] pt-4">
                    <span className="text-[13px] text-[#7B7A79]">
                        Limit how much Code Review spends on automatic reviews
                    </span>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[70%]">
                            <span className="text-[14px] text-[#D6D5C9]">
                                Per-PR on-demand spend limit
                            </span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Skips future auto-reviews on a PR once its total on-demand spend
                                hits this limit.
                            </span>
                        </div>

                        <div className="flex items-center gap-2 bg-[#202020] border border-[#282828] rounded-lg px-3 py-1.5 text-[13px]">
                            <span className="text-[#7B7A79]">$</span>
                            <input
                                type="text"
                                value={spendLimit}
                                onChange={(e) => setSpendLimit(e.target.value)}
                                className="bg-transparent text-[#D6D5C9] font-medium w-[80px] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 7: Rules */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">Rules</h1>
                <div className="flex flex-col gap-6 border-t border-[#242323] pt-4">
                    <span className="text-[13px] text-[#7B7A79]">
                        Add context to help Code Review find bugs
                    </span>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-[14px] font-medium text-[#D6D5C9]">Files</h3>
                            <p className="text-[13px] text-[#7B7A79]">
                                Prioritized by proximity to changed files.{' '}
                                <span className="underline cursor-pointer">
                                    Common file patterns ⓘ
                                </span>{' '}
                                are read automatically
                            </p>
                        </div>

                        {/* Rule Input Form */}
                        <form onSubmit={handleAddFileRule} className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="e.g. docs/**/*.md"
                                value={fileRuleInput}
                                onChange={(e) => setFileRuleInput(e.target.value)}
                                className="flex-1 bg-[#202020] border border-[#282828] rounded-lg px-3.5 py-1.5 text-[13px] font-mono text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#5A5A5A] transition-colors"
                            />
                            <button
                                type="submit"
                                className="px-3.5 py-1.5 rounded-lg border border-[#282828] bg-[#202020] hover:bg-[#282828] text-[12.5px] font-medium text-[#D6D5C9] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                            </button>
                        </form>

                        {/* Rules List */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-[#242323]">
                            {fileRules.map((rule, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between py-1 px-1 font-mono text-[12.5px] text-[#D6D5C9]"
                                >
                                    <span>{rule}</span>
                                    <span className="px-2 py-0.5 rounded text-[11px] font-sans text-[#7B7A79] bg-[#202020] border border-[#282828]">
                                        Default
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 8: Enable Automated Feedback (At bottom of Review page) */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-3 text-white">
                    Enable Automated Feedback
                </h1>
                <div className="flex flex-col gap-4 border-t border-[#242323] pt-4">
                    <span className="text-[13px] text-[#7B7A79] leading-relaxed">
                        Allow agent to respond to automated review comments from these bots,
                        implementing suggested code changes and fixes without requiring an explicit
                        mention.
                    </span>

                    <div className="flex flex-col gap-1 pt-1">
                        {bots.map((bot) => (
                            <div key={bot.id} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0">
                                        {bot.logo}
                                    </div>
                                    <span className="text-[14px] font-medium text-[#D6D5C9] flex items-center gap-1">
                                        {bot.name}
                                        <ExternalLink className="w-3 h-3 text-[#7B7A79] ml-0.5" />
                                    </span>
                                </div>
                                <button
                                    role="switch"
                                    onClick={() => toggleBot(bot.id)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        bot.enabled
                                            ? 'bg-[#87B2F4]'
                                            : 'bg-[#100E12] border-[#383736]'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                            bot.enabled
                                                ? 'translate-x-4 bg-[#100E12]'
                                                : 'translate-x-0 bg-[#383736]'
                                        }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
