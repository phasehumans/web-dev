import { Search, Plus, Eye, EyeOff, Copy, Check, Trash2, FileText } from 'lucide-react'
import React, { useState } from 'react'

interface SecretItem {
    id: string
    name: string
    value: string
    type: 'Organization' | 'Personal'
    note: string
    updatedBy: string
    updatedAt: string
}

const INITIAL_SECRETS: SecretItem[] = [
    {
        id: 'sec-1',
        name: 'ANTHROPIC_API_KEY',
        value: 'sk-ant-api03-xxxx-xxxx-xxxx-xxxx',
        type: 'Personal',
        note: 'Claude 3.5 Sonnet API key',
        updatedBy: 'you',
        updatedAt: '2 days ago',
    },
    {
        id: 'sec-2',
        name: 'DATABASE_URL',
        value: 'postgresql://postgres:pass@localhost:5432/db',
        type: 'Personal',
        note: 'Primary database connection URL',
        updatedBy: 'you',
        updatedAt: '1 week ago',
    },
]

export const ProfileSecretsSettings: React.FC = () => {
    const [secrets, setSecrets] = useState<SecretItem[]>(INITIAL_SECRETS)
    const [activeTab, setActiveTab] = useState<'Organization' | 'Personal'>('Organization')
    const [searchQuery, setSearchQuery] = useState('')
    const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({})
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Modal state for Add Secret
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newValue, setNewValue] = useState('')
    const [newNote, setNewNote] = useState('')
    const [newType, setNewType] = useState<'Organization' | 'Personal'>('Organization')

    // Modal state for Bulk Add Secrets
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false)
    const [bulkContent, setBulkContent] = useState('')

    const orgCount = secrets.filter((s) => s.type === 'Organization').length
    const personalCount = secrets.filter((s) => s.type === 'Personal').length

    const filteredSecrets = secrets.filter((s) => {
        const matchesTab = s.type === activeTab
        const matchesQuery =
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.note.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTab && matchesQuery
    })

    const toggleReveal = (id: string) => {
        setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    const handleCopy = (id: string, val: string) => {
        navigator.clipboard.writeText(val)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleDelete = (id: string) => {
        setSecrets((prev) => prev.filter((s) => s.id !== id))
    }

    const handleAddSecret = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim() || !newValue.trim()) return

        const formattedName = newName
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_')

        const created: SecretItem = {
            id: `sec-${Date.now()}`,
            name: formattedName,
            value: newValue.trim(),
            type: newType,
            note: newNote.trim() || '—',
            updatedBy: 'you',
            updatedAt: 'Just now',
        }

        setSecrets((prev) => [...prev, created])
        setNewName('')
        setNewValue('')
        setNewNote('')
        setIsAddOpen(false)
    }

    const handleBulkAddSecrets = (e: React.FormEvent) => {
        e.preventDefault()
        if (!bulkContent.trim()) return

        const lines = bulkContent.split('\n')
        const newItems: SecretItem[] = []

        lines.forEach((line, index) => {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) return

            const eqIndex = trimmed.indexOf('=')
            if (eqIndex > 0) {
                const rawKey = trimmed.substring(0, eqIndex).trim()
                const rawVal = trimmed.substring(eqIndex + 1).trim()

                const formattedKey = rawKey.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
                newItems.push({
                    id: `sec-${Date.now()}-${index}`,
                    name: formattedKey,
                    value: rawVal,
                    type: activeTab,
                    note: 'Bulk imported secret',
                    updatedBy: 'you',
                    updatedAt: 'Just now',
                })
            }
        })

        if (newItems.length > 0) {
            setSecrets((prev) => [...prev, ...newItems])
        }

        setBulkContent('')
        setIsBulkAddOpen(false)
    }

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Header */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium text-white mb-3">Secrets</h1>
                <div className="flex flex-col border-t border-[#242323] pt-4 gap-4">
                    <p className="text-[13px] text-[#7B7A79]">
                        Reference a secret with a dollar sign, e.g.{' '}
                        <code className="bg-[#202020] border border-[#282828] text-[#D6D5C9] px-1.5 py-0.5 rounded font-mono text-[12px]">
                            $SERVICE_USERNAME
                        </code>
                        .{' '}
                        <a
                            href="https://docs.gemini.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#87B2F4] hover:underline"
                        >
                            Learn more
                        </a>
                    </p>
                    {/* Organization / Personal Tabs */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('Organization')}
                            className={`px-3 py-1 rounded-lg text-[12.5px] font-medium transition-colors flex items-center gap-1.5 ${
                                activeTab === 'Organization'
                                    ? 'bg-[#202020] text-white border border-[#282828]'
                                    : 'text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#202020]'
                            }`}
                        >
                            <span>Organization</span>
                            <span className="text-[11px] opacity-70">{orgCount}</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('Personal')}
                            className={`px-3 py-1 rounded-lg text-[12.5px] font-medium transition-colors flex items-center gap-1.5 ${
                                activeTab === 'Personal'
                                    ? 'bg-[#202020] text-white border border-[#282828]'
                                    : 'text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#202020]'
                            }`}
                        >
                            <span>Personal</span>
                            <span className="text-[11px] opacity-70">{personalCount}</span>
                        </button>
                    </div>

                    {/* Controls Row: Search Input + Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Search bar */}
                        <div className="relative flex-1 max-w-[280px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7A79]" />
                            <input
                                type="text"
                                placeholder="Search secrets"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-[#202020] border border-[#282828] rounded-lg text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#5A5A5A] transition-colors"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsBulkAddOpen(true)}
                                className="px-3.5 py-1.5 rounded-lg border border-[#282828] bg-[#202020] hover:bg-[#282828] text-[12.5px] font-medium text-[#D6D5C9] hover:text-white transition-colors cursor-pointer"
                            >
                                Bulk add secrets
                            </button>

                            <button
                                onClick={() => {
                                    setNewType(activeTab)
                                    setIsAddOpen(true)
                                }}
                                className="px-4 py-1.5 rounded-lg bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add secret</span>
                            </button>
                        </div>
                    </div>

                    {/* Secrets Table Container */}
                    <div className="bg-[#191919] border border-[#242323] rounded-xl overflow-hidden mt-1">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 bg-[#202020] border-b border-[#242323] px-4 py-2.5 text-[12px] font-medium text-[#7B7A79]">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-3">Note</div>
                            <div className="col-span-2">Updated by</div>
                            <div className="col-span-2 text-right">Updated at</div>
                        </div>

                        {/* Table Rows or Empty State */}
                        {filteredSecrets.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-2 text-center">
                                <h3 className="text-[14px] font-medium text-white">
                                    No secrets found
                                </h3>
                                <p className="text-[13px] text-[#7B7A79]">
                                    Add your first secret to get started.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-[#242323]">
                                {filteredSecrets.map((sec) => {
                                    const isRevealed = Boolean(revealedIds[sec.id])
                                    return (
                                        <div
                                            key={sec.id}
                                            className="grid grid-cols-12 items-center px-4 py-3 hover:bg-[#202020] transition-colors text-[13px]"
                                        >
                                            {/* Name */}
                                            <div className="col-span-3 font-mono font-medium text-white truncate pr-2">
                                                ${sec.name}
                                            </div>

                                            {/* Type */}
                                            <div className="col-span-2">
                                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#202020] text-[#8F8E8D] border border-[#282828]">
                                                    {sec.type}
                                                </span>
                                            </div>

                                            {/* Note */}
                                            <div className="col-span-3 text-[#7B7A79] truncate pr-2">
                                                {sec.note}
                                            </div>

                                            {/* Updated by */}
                                            <div className="col-span-2 text-[#7B7A79] capitalize">
                                                {sec.updatedBy}
                                            </div>

                                            {/* Updated at & Actions */}
                                            <div className="col-span-2 flex items-center justify-end gap-1.5">
                                                <span className="text-[12px] text-[#7B7A79] mr-1">
                                                    {sec.updatedAt}
                                                </span>

                                                <button
                                                    onClick={() => toggleReveal(sec.id)}
                                                    className="p-1 rounded text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                                    title={
                                                        isRevealed ? 'Hide Secret' : 'Reveal Secret'
                                                    }
                                                >
                                                    {isRevealed ? (
                                                        <EyeOff className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Eye className="w-3.5 h-3.5" />
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => handleCopy(sec.id, sec.value)}
                                                    className="p-1 rounded text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                                    title="Copy Secret Value"
                                                >
                                                    {copiedId === sec.id ? (
                                                        <Check className="w-3.5 h-3.5 text-[#34D399]" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(sec.id)}
                                                    className="p-1 rounded text-[#7B7A79] hover:text-red-400 hover:bg-[#242323] transition-colors"
                                                    title="Delete Secret"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Add Single Secret */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-none p-4">
                    <div className="bg-[#191919] border border-[#242323] rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-[16px] font-medium text-white">Add Secret</h3>
                            <p className="text-[13px] text-[#7B7A79]">
                                Add environment variables or API keys available to your workspace.
                            </p>
                        </div>

                        <form onSubmit={handleAddSecret} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Secret Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. SERVICE_USERNAME"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] font-mono text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Secret Value
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter key or token value..."
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] font-mono text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Note (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Brief note or usage purpose"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Scope
                                </label>
                                <div className="flex items-center gap-3">
                                    {(['Organization', 'Personal'] as const).map((type) => (
                                        <label
                                            key={type}
                                            className="flex items-center gap-2 text-[13px] text-[#D6D5C9] cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name="secretScope"
                                                checked={newType === type}
                                                onChange={() => setNewType(type)}
                                                className="accent-[#87B2F4]"
                                            />
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOpen(false)}
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] transition-colors flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Save Secret
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Bulk Add Secrets */}
            {isBulkAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-none p-4">
                    <div className="bg-[#191919] border border-[#242323] rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-[16px] font-medium text-white">Bulk Add Secrets</h3>
                            <p className="text-[13px] text-[#7B7A79]">
                                Paste environment variables in{' '}
                                <code className="text-[#D6D5C9]">KEY=VALUE</code> format.
                            </p>
                        </div>

                        <form onSubmit={handleBulkAddSecrets} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <textarea
                                    placeholder={`SERVICE_USERNAME=admin\nSTRIPE_API_KEY=sk_test_12345\nDATABASE_URL=postgres://...`}
                                    value={bulkContent}
                                    onChange={(e) => setBulkContent(e.target.value)}
                                    rows={8}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] font-mono text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4] resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBulkAddOpen(false)}
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] transition-colors flex items-center gap-1.5"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Import Secrets
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
