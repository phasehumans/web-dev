import { Search, Plus, Eye, EyeOff, Copy, Check, Trash2, FileText, Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { secretsAPI, type SecretSummary } from '../api/secrets'

export const ProfileSecretsSettings: React.FC = () => {
    const [secrets, setSecrets] = useState<SecretSummary[]>([])
    const [decryptedValues, setDecryptedValues] = useState<Record<string, string>>({})
    const [revealedNames, setRevealedNames] = useState<Record<string, boolean>>({})
    const [copiedName, setCopiedName] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal state for Add Secret
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newValue, setNewValue] = useState('')
    const [newNote, setNewNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Modal state for Bulk Add Secrets
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false)
    const [bulkContent, setBulkContent] = useState('')

    const loadSecrets = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await secretsAPI.getSecrets()
            setSecrets(data.secrets || [])
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch secrets'
            setError(msg)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadSecrets()
    }, [])

    const filteredSecrets = secrets.filter((s) => {
        const matchesQuery =
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.note && s.note.toLowerCase().includes(searchQuery.toLowerCase()))
        return matchesQuery
    })

    const toggleReveal = async (name: string) => {
        const currentlyRevealed = Boolean(revealedNames[name])
        if (currentlyRevealed) {
            setRevealedNames((prev) => ({ ...prev, [name]: false }))
            return
        }

        if (!decryptedValues[name]) {
            try {
                const res = await secretsAPI.getSecretValue(name)
                setDecryptedValues((prev) => ({ ...prev, [name]: res.secret.value }))
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to fetch secret value'
                setError(msg)
                return
            }
        }
        setRevealedNames((prev) => ({ ...prev, [name]: true }))
    }

    const handleCopy = async (name: string) => {
        let val = decryptedValues[name]
        if (!val) {
            try {
                const res = await secretsAPI.getSecretValue(name)
                val = res.secret.value
                setDecryptedValues((prev) => ({ ...prev, [name]: val }))
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to fetch secret value'
                setError(msg)
                return
            }
        }
        if (val) {
            await navigator.clipboard.writeText(val)
            setCopiedName(name)
            setTimeout(() => setCopiedName(null), 2000)
        }
    }

    const handleDelete = async (name: string) => {
        try {
            await secretsAPI.deleteSecret(name)
            setSecrets((prev) => prev.filter((s) => s.name !== name))
            setDecryptedValues((prev) => {
                const copy = { ...prev }
                delete copy[name]
                return copy
            })
            setRevealedNames((prev) => {
                const copy = { ...prev }
                delete copy[name]
                return copy
            })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to delete secret'
            setError(msg)
        }
    }

    const handleAddSecret = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim() || !newValue.trim()) return

        const formattedName = newName
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_')

        setIsSubmitting(true)
        setError(null)
        try {
            await secretsAPI.createSecret({
                name: formattedName,
                value: newValue.trim(),
                note: newNote.trim() || undefined,
            })
            setNewName('')
            setNewValue('')
            setNewNote('')
            setIsAddOpen(false)
            await loadSecrets()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to add secret'
            setError(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleBulkAddSecrets = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!bulkContent.trim()) return

        const lines = bulkContent.split('\n')
        const items: Array<{ name: string; value: string; note?: string }> = []

        lines.forEach((line) => {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) return

            const eqIndex = trimmed.indexOf('=')
            if (eqIndex > 0) {
                const rawKey = trimmed.substring(0, eqIndex).trim()
                const rawVal = trimmed.substring(eqIndex + 1).trim()
                const formattedKey = rawKey.toUpperCase().replace(/[^A-Z0-9_]/g, '_')

                if (formattedKey && rawVal) {
                    items.push({
                        name: formattedKey,
                        value: rawVal,
                        note: 'Bulk imported secret',
                    })
                }
            }
        })

        if (items.length === 0) return

        setIsSubmitting(true)
        setError(null)
        try {
            await secretsAPI.bulkCreateSecrets({ secrets: items })
            setBulkContent('')
            setIsBulkAddOpen(false)
            await loadSecrets()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to bulk import secrets'
            setError(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr)
            return d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
        } catch {
            return dateStr
        }
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
                        . Secrets are encrypted at rest and injected into your sandbox sessions.
                    </p>

                    {error && (
                        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-[13px] text-red-300">
                            {error}
                        </div>
                    )}

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
                                onClick={() => setIsAddOpen(true)}
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
                            <div className="col-span-4">Name</div>
                            <div className="col-span-4">Note</div>
                            <div className="col-span-4 text-right">Updated at</div>
                        </div>

                        {/* Table Rows or Loading/Empty State */}
                        {isLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-2 text-center text-[#7B7A79]">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-[13px]">Loading secrets...</span>
                            </div>
                        ) : filteredSecrets.length === 0 ? (
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
                                    const isRevealed = Boolean(revealedNames[sec.name])
                                    const decryptedVal = decryptedValues[sec.name]

                                    return (
                                        <div
                                            key={sec.id}
                                            className="grid grid-cols-12 items-center px-4 py-3 hover:bg-[#202020] transition-colors text-[13px]"
                                        >
                                            {/* Name */}
                                            <div className="col-span-4 font-mono font-medium text-white truncate pr-2 flex flex-col gap-0.5">
                                                <span>${sec.name}</span>
                                                {isRevealed && decryptedVal && (
                                                    <span className="text-[11px] text-[#87B2F4] font-mono select-all truncate">
                                                        {decryptedVal}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Note */}
                                            <div className="col-span-4 text-[#7B7A79] truncate pr-2">
                                                {sec.note || '—'}
                                            </div>

                                            {/* Updated at & Actions */}
                                            <div className="col-span-4 flex items-center justify-end gap-1.5">
                                                <span className="text-[12px] text-[#7B7A79] mr-1">
                                                    {formatDate(sec.updatedAt)}
                                                </span>

                                                <button
                                                    onClick={() => toggleReveal(sec.name)}
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
                                                    onClick={() => handleCopy(sec.name)}
                                                    className="p-1 rounded text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                                    title="Copy Secret Value"
                                                >
                                                    {copiedName === sec.name ? (
                                                        <Check className="w-3.5 h-3.5 text-[#34D399]" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(sec.name)}
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
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Plus className="w-3.5 h-3.5" />
                                    )}
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
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <FileText className="w-3.5 h-3.5" />
                                    )}
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
