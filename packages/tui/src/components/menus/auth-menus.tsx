import React from 'react'

import { ByokKeyMenu } from './byok-key-menu'
import { ByokProviderMenu } from './byok-provider-menu'
import { ContextSelectMenu } from './context-select-menu'
import { GrillQuestionMenu } from './grill-question-menu'
import { LogoutSelectMenu } from './logout-select-menu'
import { McpManagerMenu } from './mcp-manager-menu'
import { MenuMenu } from './menu-menu'
import { ModelSelectMenu } from './model-select-menu'
import { OllamaSetupMenu } from './ollama-setup-menu'
import { PlanApproveMenu } from './plan-approve-menu'
import { SessionSelectMenu } from './session-select-menu'
import { SettingsMainMenu } from './settings-main-menu'
import { SubscriptionSelectMenu } from './subscription-select-menu'
import { TasksModeMenu } from './tasks-mode-menu'
import { ToolPermissionMenu } from './tool-permission-menu'

export function AuthMenus(props: any) {
    switch (props.authMode) {
        case 'menu':
            return <MenuMenu {...props} />
        case 'subscription_select':
        case 'subscription_provider':
            return <SubscriptionSelectMenu {...props} />
        case 'mcp_manager':
            return <McpManagerMenu {...props} />
        case 'byok_provider':
            return <ByokProviderMenu {...props} />
        case 'byok_key':
            return <ByokKeyMenu {...props} />
        case 'ollama_setup':
            return (
                <OllamaSetupMenu
                    status={props.ollamaStatus}
                    onRetry={props.handleOllamaRetry}
                    onCancel={props.handleOllamaCancel}
                    onProceed={props.handleOllamaProceed}
                />
            )
        case 'model_select':
            return <ModelSelectMenu {...props} />
        case 'context_select':
            return <ContextSelectMenu {...props} />
        case 'logout_select':
            return <LogoutSelectMenu {...props} />
        case 'session_select':
            return <SessionSelectMenu {...props} />
        case 'tasks_mode':
            return <TasksModeMenu {...props} />
        case 'plan_approve':
            return <PlanApproveMenu {...props} />
        case 'grill_question':
            return <GrillQuestionMenu {...props} />
        case 'settings_main':
            return <SettingsMainMenu {...props} />
        case 'tool_permission':
            return (
                <ToolPermissionMenu
                    toolCall={props.pendingToolCall?.toolCall}
                    questions={props.pendingQuestions?.questions || []}
                    onComplete={(result) => {
                        props.pendingToolCall?.resolve(result)
                        props.setAuthMode('none')
                        props.setPendingToolCall(null)
                    }}
                />
            )

        default:
            return null
    }
}
