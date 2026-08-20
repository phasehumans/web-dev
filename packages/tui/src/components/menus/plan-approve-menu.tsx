import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator } from './menu-items'

export interface PlanApproveMenuProps {
    handlePlanApprovalSelect: (item: { label: string; value: string }) => void
    planSummary?: string
}

function PlanItemComponent({
    label,
    value,
    isSelected,
}: {
    label: string
    value?: string
    isSelected?: boolean
}) {
    let color: string = THEME.colors.text
    if (value === 'approve') {
        color = THEME.colors.success
    } else if (value === 'reject') {
        color = THEME.colors.error
    }

    return <Text color={color}>{label}</Text>
}

export function PlanApproveMenu({ handlePlanApprovalSelect, planSummary }: PlanApproveMenuProps) {
    const planItems = [
        { label: '[y] Approve & Execute', value: 'approve' },
        { label: '[n] Reject / Cancel', value: 'reject' },
    ]

    useInput((input, key) => {
        const lower = (input || '').toLowerCase()
        if (lower === 'y') {
            handlePlanApprovalSelect({ label: '[y] Approve & Execute', value: 'approve' })
        } else if (lower === 'n' || key.escape) {
            handlePlanApprovalSelect({ label: '[n] Reject / Cancel', value: 'reject' })
        }
    })

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1} flexDirection="column" gap={1}>
                {planSummary && (
                    <Box borderStyle="round" borderColor={THEME.colors.border} paddingX={1}>
                        <Text color={THEME.colors.brand}>{planSummary}</Text>
                    </Box>
                )}
                <Text color={THEME.colors.text}>Plan generated. Please approve or reject:</Text>
            </Box>
            <SelectInput
                items={planItems}
                onSelect={handlePlanApprovalSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={PlanItemComponent}
            />
            <MenuFooter
                items={[
                    { key: 'y', label: 'Approve' },
                    { key: 'n', label: 'Reject' },
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'enter', label: 'Select' },
                ]}
            />
        </Box>
    )
}
