import { Trash2, Pencil, Search, Check, User } from 'lucide-react'
import React, { useState } from 'react'

interface PersonalSkill {
    id: string
    name: string
    badge: string
    description: string
}

interface ExploreSkill {
    id: string
    title: string
    repo: string
    installs: string
    description: string
    isOfficial?: boolean
    isAdded?: boolean
    avatarText?: string
    avatarBg?: string
    category: string
}

const INITIAL_PERSONAL_SKILLS: PersonalSkill[] = [
    {
        id: 'ps-1',
        name: 'tdd',
        badge: 'Personal',
        description:
            'Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants strict test coverage.',
    },
]

const EXPLORE_SKILLS: ExploreSkill[] = [
    {
        id: 'es-1',
        title: 'frontend-design',
        repo: 'anthropics/skills',
        installs: '422.2K',
        description:
            'Create distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code and UI that wows users.',
        isOfficial: true,
        avatarText: 'AI',
        avatarBg: 'bg-[#242323] text-[#D6D5C9] font-bold text-[10px]',
        category: 'Trending',
    },
    {
        id: 'es-2',
        title: 'react-best-practices',
        repo: 'vercel-labs/agent-skills',
        installs: '405.1K',
        description:
            "Vercel's official React best practices for building modern React applications with proper patterns, hooks, and component boundaries.",
        isOfficial: true,
        avatarText: '▲',
        avatarBg: 'bg-[#242323] text-white font-bold text-[11px]',
        category: 'Trending',
    },
    {
        id: 'es-3',
        title: 'tdd',
        repo: 'mattpocock/skills',
        installs: '115.8K',
        description:
            'Test-Driven Development - write the test first, watch it fail, write minimal code to pass. Disciplined red-green-refactor cycle for clean software.',
        isAdded: true,
        avatarText: 'MP',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'Trending',
    },
    {
        id: 'es-4',
        title: 'improve-codebase-architecture',
        repo: 'mattpocock/skills',
        installs: '119.0K',
        description:
            'Analyze and improve codebase architecture. Identifies structural issues, decouples components, and guides refactoring toward better patterns.',
        avatarText: 'MP',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'Trending',
    },
    {
        id: 'es-5',
        title: 'requesting-code-review',
        repo: 'obra/superpowers',
        installs: '87.4K',
        description:
            'Dispatch a code reviewer subagent with precisely crafted context. Review early, review often. The reviewer gets focused context and diff insights.',
        avatarText: 'OB',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'Popular',
    },
    {
        id: 'es-6',
        title: 'receiving-code-review',
        repo: 'obra/superpowers',
        installs: '69.2K',
        description:
            'Receive code review feedback with technical rigor - not performative agreement or blind implementation. Requires evidence and verification.',
        avatarText: 'OB',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'Popular',
    },
    {
        id: 'es-7',
        title: 'systematic-debugging',
        repo: 'obra/superpowers',
        installs: '99.3K',
        description:
            'Random fixes waste time. Structured debugging: reproduce → minimize → hypothesize → instrument → fix → regression-test before closing.',
        avatarText: 'OB',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'GStack',
    },
    {
        id: 'es-8',
        title: 'diagnose',
        repo: 'mattpocock/skills',
        installs: '91.9K',
        description:
            'Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimize → hypothesize → instrument → fix.',
        avatarText: 'MP',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'GStack',
    },
    {
        id: 'es-9',
        title: 'test-driven-development',
        repo: 'obra/superpowers',
        installs: '86.4K',
        description:
            'Write the test first, watch it fail, write minimal code to pass. Use before writing any implementation code to verify strict behavior.',
        avatarText: 'OB',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'skills.sh',
    },
    {
        id: 'es-10',
        title: 'webapp-testing',
        repo: 'anthropics/skills',
        installs: '71.2K',
        description:
            'Toolkit for testing local web apps using Playwright. Verifying frontend functionality, debugging UI behavior, and capturing step logs.',
        isOfficial: true,
        avatarText: 'AI',
        avatarBg: 'bg-[#242323] text-white font-bold text-[10px]',
        category: 'skills.sh',
    },
    {
        id: 'es-11',
        title: 'verification-before-completion',
        repo: 'obra/superpowers',
        installs: '72.0K',
        description:
            'Never claim work is complete without running verification. Evidence before assertions - always. Run tests and confirm runtime logs cleanly.',
        avatarText: 'OB',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'skills.sh',
    },
    {
        id: 'es-12',
        title: 'writing-plans',
        repo: 'obra/superpowers',
        installs: '98.6K',
        description:
            'Write comprehensive implementation plans assuming zero codebase context. Document everything: which files to touch, step order, and validation.',
        avatarText: 'OB',
        avatarBg: 'bg-[#242323] text-[#D6D5C9]',
        category: 'skills.sh',
    },
]

export const ProfileSkillsSettings: React.FC = () => {
    const [personalSkills, setPersonalSkills] = useState<PersonalSkill[]>(INITIAL_PERSONAL_SKILLS)
    const [exploreSkills, setExploreSkills] = useState<ExploreSkill[]>(EXPLORE_SKILLS)
    const [searchQuery, setSearchQuery] = useState('')
    const [visibleCount, setVisibleCount] = useState(10)

    // Modal state for adding personal skill
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [newSkillName, setNewSkillName] = useState('')
    const [newSkillDescription, setNewSkillDescription] = useState('')

    const handleDeletePersonalSkill = (id: string) => {
        setPersonalSkills((prev) => prev.filter((s) => s.id !== id))
    }

    const handleToggleExploreSkill = (id: string) => {
        setExploreSkills((prev) =>
            prev.map((s) => (s.id === id ? { ...s, isAdded: !s.isAdded } : s))
        )
    }

    const handleCreatePersonalSkill = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSkillName.trim()) return

        const newSkill: PersonalSkill = {
            id: `ps-${Date.now()}`,
            name: newSkillName.trim(),
            badge: 'Personal',
            description: newSkillDescription.trim() || 'Custom agent instruction skill.',
        }

        setPersonalSkills((prev) => [...prev, newSkill])
        setNewSkillName('')
        setNewSkillDescription('')
        setIsAddModalOpen(false)
    }

    const filteredExploreSkills = exploreSkills.filter((s) => {
        const matchesQuery =
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.repo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesQuery
    })

    const displayedExploreSkills = filteredExploreSkills.slice(0, visibleCount)

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Section 1: My Skills */}
            <div className="flex flex-col mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[16px] font-medium text-white">My Skills</h1>
                </div>

                <div className="flex flex-col gap-4 border-t border-[#242323] pt-6">
                    <p className="text-[13px] text-[#7B7A79] leading-relaxed">
                        Skills available to your agents. Includes manually added skills and skills
                        auto-discovered from your connected repositories.
                    </p>

                    {/* Personal Skills Cards */}
                    {personalSkills.map((skill) => (
                        <div
                            key={skill.id}
                            className="flex items-center justify-between p-4 bg-[#191919] border border-[#242323] rounded-xl hover:border-[#313131] transition-colors group"
                        >
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-medium text-[#D6D5C9] font-mono">
                                        {skill.name}
                                    </span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#242323] text-[#D6D5C9] border border-[#383736]">
                                        <User className="w-2.5 h-2.5 text-[#7B7A79]" />
                                        {skill.badge}
                                    </span>
                                </div>
                                <p className="text-[13px] text-[#7B7A79] leading-relaxed">
                                    {skill.description}
                                </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {}}
                                    className="p-1.5 rounded-lg text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                    title="Edit Skill"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDeletePersonalSkill(skill.id)}
                                    className="p-1.5 rounded-lg text-[#7B7A79] hover:text-red-400 hover:bg-[#242323] transition-colors"
                                    title="Delete Skill"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 2: Explore Skills */}
            <div className="flex flex-col mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[16px] font-medium text-white">Explore Skills</h1>
                </div>

                <div className="flex flex-col gap-4 border-t border-[#242323] pt-6">
                    <p className="text-[13px] text-[#7B7A79] leading-relaxed">
                        Discover top trending and most used skills and add them.
                    </p>

                    {/* Discover Search Input (below divider line) */}
                    <div className="relative w-full max-w-[320px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7A79]" />
                        <input
                            type="text"
                            placeholder="Discover from GitHub"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-[#202020] border border-[#282828] rounded-lg text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#5A5A5A] transition-colors"
                        />
                    </div>

                    {/* Explore Skills Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        {displayedExploreSkills.map((skill) => {
                            const isAdded = Boolean(skill.isAdded)
                            return (
                                <div
                                    key={skill.id}
                                    className="p-4 bg-[#191919] border border-[#242323] rounded-xl flex flex-col gap-2.5 hover:border-[#313131] transition-colors group cursor-pointer"
                                    onClick={() => handleToggleExploreSkill(skill.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div
                                                className={`w-6 h-6 rounded-md ${
                                                    skill.avatarBg ?? 'bg-[#242323] text-[#D6D5C9]'
                                                } flex items-center justify-center shrink-0`}
                                            >
                                                {skill.avatarText}
                                            </div>
                                            <span className="text-[14px] font-medium text-[#D6D5C9] truncate">
                                                {skill.title}
                                            </span>
                                            {skill.isOfficial && (
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full bg-[#87B2F4] flex items-center justify-center text-[#100E12] shrink-0"
                                                    title="Official Skill"
                                                >
                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded text-[11px] font-medium border shrink-0 transition-colors ${
                                                isAdded
                                                    ? 'bg-[#87B2F4]/10 text-[#87B2F4] border-[#87B2F4]/30'
                                                    : 'bg-[#242323] text-[#7B7A79] border-[#313131] group-hover:text-[#D6D5C9]'
                                            }`}
                                        >
                                            {isAdded ? 'Installed' : 'Not installed'}
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-[#7B7A79] leading-relaxed line-clamp-2">
                                        {skill.description}
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    {/* Load More Button */}
                    {visibleCount < filteredExploreSkills.length && (
                        <button
                            onClick={() => setVisibleCount((prev) => prev + 10)}
                            className="px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] font-medium text-[#D6D5C9] hover:bg-[#242323] transition-colors cursor-pointer self-center mt-2"
                        >
                            Load More
                        </button>
                    )}
                </div>
            </div>

            {/* Modal for Creating New Skill */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-none p-4">
                    <div className="bg-[#191919] border border-[#242323] rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-[16px] font-medium text-white">Create New Skill</h3>
                            <p className="text-[13px] text-[#7B7A79]">
                                Define custom instruction prompts for your workspace AI agents.
                            </p>
                        </div>

                        <form onSubmit={handleCreatePersonalSkill} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Skill Identifier
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. tdd or react-best-practices"
                                    value={newSkillName}
                                    onChange={(e) => setNewSkillName(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Description & When to use
                                </label>
                                <textarea
                                    placeholder="Describe when the agent should apply this skill..."
                                    value={newSkillDescription}
                                    onChange={(e) => setNewSkillDescription(e.target.value)}
                                    rows={3}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4] resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] transition-colors flex items-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Save Skill
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
