import {
    Search,
    Plus,
    Eye,
    EyeOff,
    Copy,
    Check,
    Trash2,
    Loader2,
    MoreHorizontal,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { secretsAPI, type SecretSummary } from '../api/secrets'

import { Modal } from '@/shared/components/ui/Modal'
import { Tooltip } from '@/shared/components/ui/Tooltip'

export const ProfileSecretsSettings: React.FC = () => {
    const [secrets, setSecrets] = useState<SecretSummary[]>([])
    const [decryptedValues, setDecryptedValues] = useState<Record<string, string>>({})
    const [revealedNames, setRevealedNames] = useState<Record<string, boolean>>({})
    const [copiedName, setCopiedName] = useState<string | null>(null)
    const [openMobileMenuName, setOpenMobileMenuName] = useState<string | null>(null)
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
                <h1 className="text-[16px] font-medium mb-3">Secrets</h1>
                <div className="flex flex-col border-t border-[#242323] pt-4 gap-4">
                    <p className="text-[13px] text-[#7B7A79]">
                        Reference a secret with a dollar sign, e.g.{' '}
                        <span className="text-[#87B2F4]">$SERVICE_USERNAME</span>. Secrets are
                        encrypted at rest and injected into your sandbox sessions.
                    </p>

                    {error && <p className="text-[12.5px] text-red-500 font-medium">{error}</p>}

                    {/* Controls Row: Search Input + Action Buttons */}
                    {/* Controls Row: Search Input + Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Search bar */}
                        <div className="relative flex-1 max-w-full sm:max-w-[280px]">
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
                                className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg border border-[#282828] bg-[#202020] hover:bg-[#282828] text-[12.5px] font-medium text-[#D6D5C9] hover:text-white transition-colors cursor-pointer text-center"
                            >
                                Bulk add
                            </button>

                            <button
                                onClick={() => setIsAddOpen(true)}
                                className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add secret</span>
                            </button>
                        </div>
                    </div>

                    {/* Secrets Table Container */}
                    <div className="bg-[#191919] border border-[#242323] rounded-xl overflow-hidden mt-1 min-h-[380px] flex flex-col">
                        {/* Table Header */}
                        <div className="bg-[#202020] border-b border-[#242323] px-3.5 sm:px-4 py-2.5 text-[12px] font-medium text-[#7B7A79]">
                            {/* Mobile header (< md) */}
                            <div className="flex md:hidden items-center justify-between">
                                <span>Name</span>
                                <span className="pr-6">Updated at</span>
                            </div>

                            {/* Desktop header (>= md) */}
                            <div className="hidden md:grid grid-cols-12">
                                <div className="col-span-4">Name</div>
                                <div className="col-span-4">Note</div>
                                <div className="col-span-2">Updated at</div>
                                <div className="col-span-2 text-right"></div>
                            </div>
                        </div>

                        {/* Table Rows or Loading/Empty State */}
                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-[#7B7A79] min-h-[320px]">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-[13px]">Loading secrets...</span>
                            </div>
                        ) : filteredSecrets.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center min-h-[320px] p-6">
                                <h3 className="text-[14px] font-medium text-[#D6D5C9]">
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
                                        <React.Fragment key={sec.id}>
                                            {/* Mobile card (< md) */}
                                            <div className="md:hidden p-3.5 flex flex-col gap-1.5 text-[13px] relative">
                                                <div className="flex items-center justify-between gap-3">
                                                    {/* Left: Name (or revealed value) and Note */}
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        {isRevealed && decryptedVal ? (
                                                            <span className="font-mono font-medium text-[#87B2F4] select-all truncate text-[13px]">
                                                                {decryptedVal}
                                                            </span>
                                                        ) : (
                                                            <span className="font-mono font-medium text-white truncate text-[13px]">
                                                                ${sec.name}
                                                            </span>
                                                        )}
                                                        {sec.note && (
                                                            <span className="text-[12px] text-[#8F8E8D] truncate mt-0.5">
                                                                {sec.note}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Right: Date and 3-dots button */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[12px] text-[#7B7A79]">
                                                            {formatDate(sec.updatedAt)}
                                                        </span>

                                                        {/* 3-dots dropdown */}
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setOpenMobileMenuName(
                                                                        openMobileMenuName ===
                                                                            sec.name
                                                                            ? null
                                                                            : sec.name
                                                                    )
                                                                }}
                                                                className="p-1 rounded text-[#7B7A79] hover:text-white hover:bg-[#202020] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                                                                aria-label="Secret options"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>

                                                            {openMobileMenuName === sec.name && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-40"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setOpenMobileMenuName(
                                                                                null
                                                                            )
                                                                        }}
                                                                    />
                                                                    <div className="absolute right-0 top-full mt-1.5 z-50 w-36 bg-[#1C1C1C] border border-[#2B2A27] rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                toggleReveal(
                                                                                    sec.name
                                                                                )
                                                                                setOpenMobileMenuName(
                                                                                    null
                                                                                )
                                                                            }}
                                                                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-[#D6D5C9] hover:text-white hover:bg-[#282828] transition-colors text-left cursor-pointer"
                                                                        >
                                                                            {isRevealed ? (
                                                                                <EyeOff className="w-3.5 h-3.5 text-[#8F8E8D]" />
                                                                            ) : (
                                                                                <Eye className="w-3.5 h-3.5 text-[#8F8E8D]" />
                                                                            )}
                                                                            <span>
                                                                                {isRevealed
                                                                                    ? 'Hide value'
                                                                                    : 'Reveal value'}
                                                                            </span>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                handleCopy(sec.name)
                                                                                setOpenMobileMenuName(
                                                                                    null
                                                                                )
                                                                            }}
                                                                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-[#D6D5C9] hover:text-white hover:bg-[#282828] transition-colors text-left cursor-pointer"
                                                                        >
                                                                            {copiedName ===
                                                                            sec.name ? (
                                                                                <Check className="w-3.5 h-3.5 text-[#34D399]" />
                                                                            ) : (
                                                                                <Copy className="w-3.5 h-3.5 text-[#8F8E8D]" />
                                                                            )}
                                                                            <span>
                                                                                {copiedName ===
                                                                                sec.name
                                                                                    ? 'Copied'
                                                                                    : 'Copy value'}
                                                                            </span>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                handleDelete(
                                                                                    sec.name
                                                                                )
                                                                                setOpenMobileMenuName(
                                                                                    null
                                                                                )
                                                                            }}
                                                                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                                            <span>
                                                                                Delete secret
                                                                            </span>
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Desktop row (>= md) */}
                                            <div className="group hidden md:grid grid-cols-12 items-center px-4 py-3 text-[13px]">
                                                {/* Name / Revealed Value */}
                                                <div className="col-span-4 font-mono font-medium truncate pr-2">
                                                    {isRevealed && decryptedVal ? (
                                                        <span className="text-[#87B2F4] select-all truncate">
                                                            {decryptedVal}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[#D6D5C9]">
                                                            ${sec.name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Note */}
                                                <div className="col-span-4 text-[#7B7A79] truncate pr-2">
                                                    {sec.note || ''}
                                                </div>

                                                {/* Updated at */}
                                                <div className="col-span-2 text-[12px] text-[#7B7A79]">
                                                    {formatDate(sec.updatedAt)}
                                                </div>

                                                {/* Actions (hover only + tooltips) */}
                                                <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                    <Tooltip
                                                        position="top"
                                                        content={
                                                            isRevealed
                                                                ? 'Hide secret'
                                                                : 'Reveal secret'
                                                        }
                                                    >
                                                        <button
                                                            onClick={() => toggleReveal(sec.name)}
                                                            className="p-1 rounded text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors cursor-pointer"
                                                        >
                                                            {isRevealed ? (
                                                                <EyeOff className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <Eye className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </Tooltip>

                                                    <Tooltip
                                                        position="top"
                                                        content="Copy secret value"
                                                    >
                                                        <button
                                                            onClick={() => handleCopy(sec.name)}
                                                            className="p-1 rounded text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors cursor-pointer"
                                                        >
                                                            {copiedName === sec.name ? (
                                                                <Check className="w-3.5 h-3.5 text-[#34D399]" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </Tooltip>

                                                    <Tooltip
                                                        position="top"
                                                        align="end"
                                                        content="Delete secret"
                                                    >
                                                        <button
                                                            onClick={() => handleDelete(sec.name)}
                                                            className="p-1 rounded text-[#7B7A79] hover:text-red-400 hover:bg-[#242323] transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Add Single Secret */}
            <Modal
                isOpen={isAddOpen}
                onClose={() => {
                    setIsAddOpen(false)
                    setNewName('')
                    setNewValue('')
                    setNewNote('')
                }}
                title="Add Secret"
                description="Add environment variables or API keys available to your workspace."
                variant="premium"
            >
                <form onSubmit={handleAddSecret} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="secret-name-input"
                            className="text-[12px] font-medium text-[#8F8E8D]"
                        >
                            Secret Name
                        </label>
                        <input
                            id="secret-name-input"
                            type="text"
                            autoFocus
                            placeholder="e.g. SERVICE_USERNAME"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-white/[0.03] border border-[#2B2A27] rounded-lg px-3.5 py-2.5 text-white text-[13px] font-mono focus:outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#4A4948]"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="secret-value-input"
                            className="text-[12px] font-medium text-[#8F8E8D]"
                        >
                            Secret Value
                        </label>
                        <input
                            id="secret-value-input"
                            type="password"
                            placeholder="Enter key or token value..."
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full bg-white/[0.03] border border-[#2B2A27] rounded-lg px-3.5 py-2.5 text-white text-[13px] font-mono focus:outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#4A4948]"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="secret-note-input"
                            className="text-[12px] font-medium text-[#8F8E8D]"
                        >
                            Note (Optional)
                        </label>
                        <input
                            id="secret-note-input"
                            type="text"
                            placeholder="Brief note or usage purpose"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="w-full bg-white/[0.03] border border-[#2B2A27] rounded-lg px-3.5 py-2.5 text-white text-[13px] focus:outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#4A4948]"
                        />
                    </div>

                    <div className="mt-1 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsAddOpen(false)}
                            disabled={isSubmitting}
                            className="bg-transparent text-white hover:bg-white/5 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!newName.trim() || !newValue.trim() || isSubmitting}
                            className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center min-w-[100px] cursor-pointer"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-1.5 justify-center">
                                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </div>
                            ) : (
                                'Save Secret'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Bulk Add Secrets */}
            <Modal
                isOpen={isBulkAddOpen}
                onClose={() => {
                    setIsBulkAddOpen(false)
                    setBulkContent('')
                }}
                title="Bulk Add Secrets"
                description="Paste environment variables in KEY=VALUE format."
                variant="premium"
            >
                <form onSubmit={handleBulkAddSecrets} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <textarea
                            autoFocus
                            placeholder={`SERVICE_USERNAME=admin\nSTRIPE_API_KEY=sk_test_12345\nDATABASE_URL=postgres://...`}
                            value={bulkContent}
                            onChange={(e) => setBulkContent(e.target.value)}
                            rows={8}
                            className="w-full bg-white/[0.03] border border-[#2B2A27] rounded-lg px-3.5 py-2.5 text-white text-[13px] font-mono focus:outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#4A4948] resize-none"
                            required
                        />
                    </div>

                    <div className="mt-1 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsBulkAddOpen(false)}
                            disabled={isSubmitting}
                            className="bg-transparent text-white hover:bg-white/5 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!bulkContent.trim() || isSubmitting}
                            className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center min-w-[110px] cursor-pointer"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-1.5 justify-center">
                                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    <span>Importing...</span>
                                </div>
                            ) : (
                                'Import Secrets'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
