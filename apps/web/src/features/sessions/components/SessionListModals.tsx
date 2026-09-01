import React from 'react'

import { SessionDeleteModal } from './SessionDeleteModal'
import { SessionOpenConfirmModal } from './SessionOpenConfirmModal'
import { SessionRenameModal } from './SessionRenameModal'
import { SessionTagsModal } from './SessionTagsModal'

import type { DeleteModalState, RenameModalState, Project } from '@/features/sessions/types'

interface SessionListModalsProps {
    renameModal: RenameModalState
    deleteModal: DeleteModalState
    openConfirmModal: { isOpen: boolean; project: Project | null }
    tagsModal: { isOpen: boolean; project: any | null }
    isRenamePending: boolean
    isDeletePending: boolean
    isTagsPending: boolean
    onCloseRename: () => void
    onRenameChange: (nextValue: string) => void
    onRenameSubmit: (event: React.FormEvent) => void
    onCloseDelete: () => void
    onDeleteConfirm: () => void
    onCloseOpenConfirm: () => void
    onOpenConfirm: () => void
    onCloseTags: () => void
    onSaveTags: (tags: string[]) => void
}

export const SessionListModals: React.FC<SessionListModalsProps> = ({
    renameModal,
    deleteModal,
    openConfirmModal,
    tagsModal,
    isRenamePending,
    isDeletePending,
    isTagsPending,
    onCloseRename,
    onRenameChange,
    onRenameSubmit,
    onCloseDelete,
    onDeleteConfirm,
    onCloseOpenConfirm,
    onOpenConfirm,
    onCloseTags,
    onSaveTags,
}) => {
    return (
        <>
            <SessionRenameModal
                isOpen={renameModal.isOpen}
                value={renameModal.value}
                isPending={isRenamePending}
                onClose={onCloseRename}
                onChange={onRenameChange}
                onSubmit={onRenameSubmit}
            />

            <SessionDeleteModal
                isOpen={deleteModal.isOpen}
                projectTitle={deleteModal.project?.title}
                isPending={isDeletePending}
                onClose={onCloseDelete}
                onConfirm={onDeleteConfirm}
            />

            <SessionOpenConfirmModal
                isOpen={openConfirmModal.isOpen}
                projectTitle={openConfirmModal.project?.title}
                onClose={onCloseOpenConfirm}
                onConfirm={onOpenConfirm}
            />

            <SessionTagsModal
                isOpen={tagsModal.isOpen}
                session={tagsModal.project}
                isPending={isTagsPending}
                onClose={onCloseTags}
                onSave={onSaveTags}
            />
        </>
    )
}
