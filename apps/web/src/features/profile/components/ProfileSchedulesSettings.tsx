import { Search, Plus, ChevronDown, Play, Trash2, Clock, Check } from 'lucide-react'
import React, { useState } from 'react'

interface ScheduleItem {
    id: string
    title: string
    cron: string
    description: string
    status: 'active' | 'paused'
    nextRun: string
    scope: 'Your schedules' | 'All schedules'
}

const INITIAL_SCHEDULES: ScheduleItem[] = []

export const ProfileSchedulesSettings: React.FC = () => {
    const [schedules, setSchedules] = useState<ScheduleItem[]>(INITIAL_SCHEDULES)
    const [searchQuery, setSearchQuery] = useState('')
    const [scopeFilter, setScopeFilter] = useState<'Your schedules' | 'All schedules'>(
        'Your schedules'
    )
    const [runningId, setRunningId] = useState<string | null>(null)

    // Modal state for Create Schedule
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newCron, setNewCron] = useState('0 9 * * 1-5')
    const [newDesc, setNewDesc] = useState('')

    const toggleScheduleStatus = (id: string) => {
        setSchedules((prev) =>
            prev.map((sch) =>
                sch.id === id
                    ? { ...sch, status: sch.status === 'active' ? 'paused' : 'active' }
                    : sch
            )
        )
    }

    const handleDelete = (id: string) => {
        setSchedules((prev) => prev.filter((sch) => sch.id !== id))
    }

    const handleRunNow = (id: string) => {
        setRunningId(id)
        setTimeout(() => setRunningId(null), 1500)
    }

    const handleCreateSchedule = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTitle.trim()) return

        const created: ScheduleItem = {
            id: `sch-${Date.now()}`,
            title: newTitle.trim(),
            cron: newCron.trim() || '0 9 * * 1-5',
            description: newDesc.trim() || 'Automated recurring agent session task.',
            status: 'active',
            nextRun: 'Tomorrow at 09:00 UTC',
            scope: scopeFilter,
        }

        setSchedules((prev) => [...prev, created])
        setNewTitle('')
        setNewCron('0 9 * * 1-5')
        setNewDesc('')
        setIsCreateOpen(false)
    }

    const filteredSchedules = schedules.filter((sch) => {
        const matchesScope = scopeFilter === 'All schedules' || sch.scope === scopeFilter
        const matchesQuery =
            sch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sch.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesScope && matchesQuery
    })

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Header / Section */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium text-white mb-3">Schedules</h1>
                <div className="flex flex-col gap-4 border-t border-[#242323] pt-4">
                    <p className="text-[13px] text-[#7B7A79]">
                        Automate recurring or one-time Agent sessions.{' '}
                        <a
                            href="https://docs.gemini.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#87B2F4] hover:underline"
                        >
                            Learn more
                        </a>
                    </p>

                    {/* Toolbar Row: Search + Scope Dropdown + Create Button */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-1">
                        {/* Search bar */}
                        <div className="relative flex-1 max-w-full sm:max-w-[280px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7A79]" />
                            <input
                                type="text"
                                placeholder="Search schedules..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-[#202020] border border-[#282828] rounded-lg text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#5A5A5A] transition-colors"
                            />
                        </div>

                        {/* Dropdown & Create Schedule Action */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 sm:flex-initial shrink-0">
                                <select
                                    value={scopeFilter}
                                    onChange={(e) =>
                                        setScopeFilter(
                                            e.target.value as 'Your schedules' | 'All schedules'
                                        )
                                    }
                                    className="w-full sm:w-auto appearance-none bg-[#202020] border border-[#282828] rounded-lg px-3 py-1.5 pr-8 text-[12.5px] font-medium text-[#D6D5C9] focus:outline-none focus:border-[#5A5A5A] cursor-pointer"
                                >
                                    <option value="Your schedules">Your schedules</option>
                                    <option value="All schedules">All schedules</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7B7A79] pointer-events-none" />
                            </div>

                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] font-medium text-[#D6D5C9] hover:bg-[#242323] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create schedule</span>
                            </button>
                        </div>
                    </div>

                    {/* Schedules List or Empty State */}
                    {filteredSchedules.length === 0 ? (
                        <div className="bg-[#191919] border border-[#242323] rounded-xl p-6 md:p-16 flex flex-col items-center justify-center gap-2 text-center mt-1">
                            <h3 className="text-[14px] font-medium text-white">
                                No schedules found
                            </h3>
                            <button
                                onClick={() => {
                                    setSearchQuery('')
                                    setScopeFilter('All schedules')
                                }}
                                className="text-[#87B2F4] text-[13px] hover:underline cursor-pointer"
                            >
                                View all schedules
                            </button>
                        </div>
                    ) : (
                        <div className="bg-[#191919] border border-[#242323] rounded-xl divide-y divide-[#242323] overflow-hidden mt-1">
                            {filteredSchedules.map((sch) => {
                                const isRunning = runningId === sch.id
                                const isActive = sch.status === 'active'
                                return (
                                    <div
                                        key={sch.id}
                                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-[#202020] transition-colors"
                                    >
                                        <div className="flex items-start gap-3.5 w-full sm:max-w-[70%]">
                                            <div className="p-2 rounded-lg bg-[#202020] border border-[#282828] shrink-0 text-[#87B2F4] mt-0.5">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-[14px] font-medium text-white truncate">
                                                        {sch.title}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-[11px] font-mono text-[#D6D5C9] bg-[#202020] rounded border border-[#282828]">
                                                        {sch.cron}
                                                    </span>
                                                </div>
                                                <p className="text-[12.5px] text-[#7B7A79] leading-relaxed">
                                                    {sch.description}
                                                </p>
                                                <span className="text-[11.5px] text-[#8F8E8D]">
                                                    Next run: {sch.nextRun}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#242323]/50">
                                            <button
                                                onClick={() => handleRunNow(sch.id)}
                                                disabled={isRunning}
                                                className="px-3 py-1.5 rounded-lg border border-[#282828] bg-[#202020] hover:bg-[#282828] text-[12px] font-medium text-[#D6D5C9] hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                title="Trigger run immediately"
                                            >
                                                <Play
                                                    className={`w-3 h-3 ${
                                                        isRunning
                                                            ? 'animate-spin text-[#87B2F4]'
                                                            : ''
                                                    }`}
                                                />
                                                <span>{isRunning ? 'Running...' : 'Run now'}</span>
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    role="switch"
                                                    onClick={() => toggleScheduleStatus(sch.id)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                        isActive
                                                            ? 'bg-[#87B2F4]'
                                                            : 'bg-[#100E12] border-[#383736]'
                                                    }`}
                                                    title={
                                                        isActive
                                                            ? 'Pause Schedule'
                                                            : 'Resume Schedule'
                                                    }
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                                            isActive
                                                                ? 'translate-x-4 bg-[#100E12]'
                                                                : 'translate-x-0 bg-[#383736]'
                                                        }`}
                                                    />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(sch.id)}
                                                    className="p-1.5 rounded-lg text-[#7B7A79] hover:text-red-400 hover:bg-[#242323] transition-colors"
                                                    title="Delete Schedule"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Schedule Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-none p-4">
                    <div className="bg-[#191919] border border-[#242323] rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-[16px] font-medium text-white">Create Schedule</h3>
                            <p className="text-[13px] text-[#7B7A79]">
                                Set up a recurring cron execution trigger for automated sessions.
                            </p>
                        </div>

                        <form onSubmit={handleCreateSchedule} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Task Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Daily Code Health & Test Audit"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Cron Schedule
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 0 9 * * 1-5 (Mon-Fri at 9 AM)"
                                    value={newCron}
                                    onChange={(e) => setNewCron(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] font-mono text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Task Prompt / Description
                                </label>
                                <textarea
                                    placeholder="Instructions for the agent during scheduled runs..."
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    rows={3}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4] resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] transition-colors flex items-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Save Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
