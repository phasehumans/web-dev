import {
    ChevronLeft,
    UserCircle,
    Sliders,
    CreditCard,
    FileClock,
    ArrowUpRight,
    KeyRound,
    FileText,
    Clock,
    Activity,
} from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useProfileSettingsController } from '../hooks/useProfileSettingsController'

import { ConnectCliModal } from './ConnectCliModal'
import { ProfileApiKeysSettings } from './ProfileApiKeysSettings'
import { ProfileBillingSettings } from './ProfileBillingSettings'
import { ProfileDeleteAccountModal } from './ProfileDeleteAccountModal'
import { ProfileGeneralSettings } from './ProfileGeneralSettings'
import { ProfileNameModal } from './ProfileNameModal'
import { ProfilePasswordModal } from './ProfilePasswordModal'
import { ProfilePrivacySettings } from './ProfilePrivacySettings'
import { ProfileRepositoriesSettings } from './ProfileRepositoriesSettings'
import { ProfileSchedulesSettings } from './ProfileSchedulesSettings'
import { ProfileSecretsSettings } from './ProfileSecretsSettings'
import { ProfileSettingsContent } from './ProfileSettingsContent'
import { ProfileSettingsSkeleton } from './ProfileSettingsSkeleton'
import { ProfileSignOutAllSessionsModal } from './ProfileSignOutAllSessionsModal'
import { ProfileTermsSettings } from './ProfileTermsSettings'
import { ProfileUsageSettings } from './ProfileUsageSettings'

import type { ProfileSettingsProps } from '@/features/profile/types'

import { getProfileTabFromSlug, getSlugForProfileTab } from '@/app/types'
import { MobileBreadcrumbsHeader } from '@/features/navigation/components/MobileBreadcrumbsHeader'
import { ErrorAlert } from '@/shared/components/ui/ErrorAlert'
import { Icons } from '@/shared/components/ui/Icons'
import { cn } from '@/shared/lib/utils'

const SETTINGS_NAV_GROUPS = [
    {
        title: 'Settings',
        items: [
            {
                tab: 'Account',
                slug: 'account',
                label: 'Account',
                icon: UserCircle,
            },
            {
                tab: 'Preferences',
                slug: 'preferences',
                label: 'Preferences',
                icon: Sliders,
            },
            {
                tab: 'Repositories',
                slug: 'repositories',
                label: 'Repositories',
                icon: Icons.Github,
            },
            {
                tab: 'Secrets',
                slug: 'secrets',
                label: 'Secrets',
                icon: KeyRound,
            },
            {
                tab: 'Schedules',
                slug: 'schedules',
                label: 'Schedules',
                icon: Clock,
            },
            {
                tab: 'Billing',
                slug: 'billing',
                label: 'Billing',
                icon: CreditCard,
            },
            {
                tab: 'Usage',
                slug: 'usage',
                label: 'Usage',
                icon: Activity,
            },
        ],
    },
    {
        title: 'Resources',
        items: [
            {
                tab: 'Privacy',
                slug: 'privacy',
                label: 'Privacy Policy',
                icon: FileText,
            },
            {
                tab: 'Terms',
                slug: 'terms',
                label: 'Terms of Service',
                icon: FileText,
            },
            {
                slug: 'changelog',
                label: 'Changelog',
                icon: FileClock,
                isExternal: true,
                href: 'https://github.com/phasehumans/december/blob/main/CHANGELOG.md',
            },
        ],
    },
]

const TAB_LABEL_MAP: Record<string, string> = {
    Account: 'Account',
    Preferences: 'Preferences',
    Repositories: 'Repositories',
    Secrets: 'Secrets',
    Schedules: 'Schedules',
    Billing: 'Billing',
    Usage: 'Usage',
    Analytics: 'Usage',
    Privacy: 'Privacy Policy',
    Terms: 'Terms of Service',
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSignOut, onBack }) => {
    const location = useLocation()
    const navigate = useNavigate()

    const activeTabMatch = location.pathname.match(/^\/(?:profile|settings)\/([^/]+)/)
    const activeTabSlug = activeTabMatch ? activeTabMatch[1] : undefined
    const activeTab = getProfileTabFromSlug(activeTabSlug)
    const isMobileRoot = !activeTabSlug
    const activeTabLabel = TAB_LABEL_MAP[activeTab] || activeTab

    // fallback for hash backward compatibility
    React.useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash === '#billing') {
            window.history.replaceState(null, '', window.location.pathname)
            navigate(`/settings/${getSlugForProfileTab('Billing')}`, { replace: true })
        }
    }, [navigate])
    const [usernameModalOpen, setUsernameModalOpen] = React.useState(false)
    const [tempUsername, setTempUsername] = React.useState('')
    const [deleteAccountModalOpen, setDeleteAccountModalOpen] = React.useState(false)
    const [signOutAllSessionsModalOpen, setSignOutAllSessionsModalOpen] = React.useState(false)
    const [connectCliModalOpen, setConnectCliModalOpen] = React.useState(false)

    const {
        profile,
        isProfileLoading,
        isProfileFetching,
        profileError,
        profileActionError,
        setProfileActionError,
        nameModalOpen,
        tempName,
        passwordModalOpen,
        showCurrentPass,
        showNewPass,
        currentPassword,
        newPassword,
        confirmPassword,
        setNameModalOpen,
        setTempName,
        setPasswordModalOpen,
        setShowCurrentPass,
        setShowNewPass,
        setCurrentPassword,
        setNewPassword,
        setConfirmPassword,
        updateNameMutation,
        updateUsernameMutation,
        updatePasswordMutation,
        updateNotificationMutation,
        isGithubConnected,
        isVercelConnected,
        isSupabaseConnected,
        isNotionConnected,
        emailNotifications,
        productUpdates,
        securityAlerts,
        chatSuggestions,
        generationSound,
        resolvedName,
        openNameModal,
        openPasswordModal,
        handleSaveName,
        handleUpdatePassword,
        handleNotificationToggle,
        handleChatSuggestionsToggle,
        handleGenerationSoundChange,
        connectGithub,
        connectVercel,
        connectSupabase,
        connectNotion,
    } = useProfileSettingsController()

    const profileErrorMessage =
        profileActionError ??
        (profileError instanceof Error
            ? profileError.message
            : profileError
              ? 'Failed to load profile'
              : null)

    const renderTabContent = () => {
        if (isProfileLoading && !profile) {
            return <ProfileSettingsSkeleton activeTab={activeTab} />
        }

        switch (activeTab) {
            case 'Account':
                return (
                    <ProfileSettingsContent
                        profile={profile}
                        resolvedName={resolvedName}
                        hasProfile={Boolean(profile)}
                        isGithubConnected={isGithubConnected}
                        emailNotifications={emailNotifications}
                        productUpdates={productUpdates}
                        securityAlerts={securityAlerts}
                        isNotificationPending={updateNotificationMutation.isPending}
                        onOpenNameModal={openNameModal}
                        onOpenUsernameModal={() => {
                            setTempUsername(profile?.username || '')
                            setUsernameModalOpen(true)
                        }}
                        onOpenPasswordModal={openPasswordModal}
                        onNotificationToggle={handleNotificationToggle}
                        onConnectGithub={connectGithub}
                        onSignOut={onSignOut}
                        onOpenDeleteAccountModal={() => setDeleteAccountModalOpen(true)}
                        onOpenSignOutAllSessionsModal={() => setSignOutAllSessionsModalOpen(true)}
                    />
                )
            case 'Preferences':
                return (
                    <ProfileGeneralSettings
                        chatSuggestions={chatSuggestions}
                        generationSound={generationSound}
                        onChatSuggestionsToggle={handleChatSuggestionsToggle}
                        onGenerationSoundChange={handleGenerationSoundChange}
                    />
                )
            case 'Billing':
                return <ProfileBillingSettings profile={profile} />
            case 'Usage':
            case 'Analytics':
                return <ProfileUsageSettings />
            case 'API Keys':
                return <ProfileApiKeysSettings />
            case 'Repositories':
                return (
                    <ProfileRepositoriesSettings
                        isGithubConnected={isGithubConnected}
                        onConnectGithub={connectGithub}
                    />
                )
            case 'Secrets':
                return <ProfileSecretsSettings />
            case 'Schedules':
                return <ProfileSchedulesSettings />
            case 'Terms':
                return <ProfileTermsSettings />
            case 'Privacy':
                return <ProfilePrivacySettings />
            default:
                return (
                    <div className="flex flex-col gap-6">
                        <h1 className="text-[20px] font-medium text-[#D6D5C9]">{activeTab}</h1>
                    </div>
                )
        }
    }

    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(isMobileRoot)

    React.useEffect(() => {
        if (isMobileRoot) {
            setIsMobileDrawerOpen(true)
        }
    }, [isMobileRoot])

    return (
        <div className="flex w-full h-full bg-[#141414] md:bg-[#100E12] overflow-hidden p-0 md:p-[8px] no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
            {/* Mobile Drawer Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                    isMobileDrawerOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                )}
                onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Mobile Drawer: Exact Main Sidebar look, width, and color */}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 w-[240px] bg-sidebar border-r border-white/5 z-[60] md:hidden flex flex-col pt-2 pb-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform font-sans',
                    isMobileDrawerOpen
                        ? 'translate-x-0 pointer-events-auto'
                        : '-translate-x-full pointer-events-none'
                )}
            >
                {/* Drawer Header */}
                <div className="px-3 mb-2 mt-0 z-30 relative">
                    <div className="flex items-center justify-between px-2 mb-6 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                if (onBack) onBack()
                                else navigate('/')
                            }}
                            className="flex items-center cursor-pointer outline-none"
                            aria-label="Home"
                        >
                            <Icons.DecemberLogo className="w-6 h-6 text-[#D6D5D4]" />
                        </button>
                        <div
                            className="flex items-center justify-center text-[#919191] hover:text-[#D4D4D8] group/collapse p-1 rounded-md hover:bg-[#252525] transition-colors cursor-pointer relative"
                            onClick={() => setIsMobileDrawerOpen(false)}
                            aria-label="Close sidebar"
                        >
                            <Icons.SidebarToggle className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Drawer Nav Items */}
                <div className="flex-1 flex flex-col gap-[2px] px-3 overflow-y-auto no-scrollbar pb-6">
                    <div className="px-2.5 py-1 text-[11.5px] font-semibold text-[#666666] uppercase tracking-wider mb-0.5">
                        Settings
                    </div>
                    {SETTINGS_NAV_GROUPS[0].items.map((item) => {
                        const IconComponent = item.icon
                        const isActive = activeTab === item.tab
                        return (
                            <button
                                key={item.slug}
                                onClick={() => {
                                    navigate(`/settings/${item.slug}`)
                                    setIsMobileDrawerOpen(false)
                                }}
                                className={cn(
                                    'relative flex items-center justify-between w-full px-2.5 h-[32px] rounded-[10px] transition-all group outline-none cursor-pointer',
                                    isActive ? 'bg-[#1F1F1F]' : 'hover:bg-[#1C1C1C]'
                                )}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className={cn(
                                            'transition-colors flex items-center justify-center shrink-0',
                                            isActive
                                                ? 'text-[#D6D5D4]'
                                                : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                        )}
                                    >
                                        <IconComponent
                                            className="w-[18px] h-[18px]"
                                            strokeWidth={1.5}
                                        />
                                    </div>
                                    <span
                                        className={cn(
                                            'text-[13px] font-normal truncate tracking-[-0.01em]',
                                            isActive
                                                ? 'text-[#D6D5D4] font-medium'
                                                : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            </button>
                        )
                    })}

                    <div className="px-2.5 py-1 text-[11.5px] font-semibold text-[#666666] uppercase tracking-wider mt-4 mb-0.5">
                        Resources
                    </div>
                    {/* Privacy Policy */}
                    <button
                        onClick={() => {
                            navigate(`/settings/${getSlugForProfileTab('Privacy')}`)
                            setIsMobileDrawerOpen(false)
                        }}
                        className={cn(
                            'relative flex items-center justify-between w-full px-2.5 h-[32px] rounded-[10px] transition-all group outline-none cursor-pointer',
                            activeTab === 'Privacy' ? 'bg-[#1F1F1F]' : 'hover:bg-[#1C1C1C]'
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div
                                className={cn(
                                    'transition-colors flex items-center justify-center shrink-0',
                                    activeTab === 'Privacy'
                                        ? 'text-[#D6D5D4]'
                                        : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                )}
                            >
                                <FileText className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            </div>
                            <span
                                className={cn(
                                    'text-[13px] font-normal truncate tracking-[-0.01em]',
                                    activeTab === 'Privacy'
                                        ? 'text-[#D6D5D4] font-medium'
                                        : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                )}
                            >
                                Privacy Policy
                            </span>
                        </div>
                    </button>

                    {/* Terms of Service */}
                    <button
                        onClick={() => {
                            navigate(`/settings/${getSlugForProfileTab('Terms')}`)
                            setIsMobileDrawerOpen(false)
                        }}
                        className={cn(
                            'relative flex items-center justify-between w-full px-2.5 h-[32px] rounded-[10px] transition-all group outline-none cursor-pointer',
                            activeTab === 'Terms' ? 'bg-[#1F1F1F]' : 'hover:bg-[#1C1C1C]'
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div
                                className={cn(
                                    'transition-colors flex items-center justify-center shrink-0',
                                    activeTab === 'Terms'
                                        ? 'text-[#D6D5D4]'
                                        : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                )}
                            >
                                <FileText className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            </div>
                            <span
                                className={cn(
                                    'text-[13px] font-normal truncate tracking-[-0.01em]',
                                    activeTab === 'Terms'
                                        ? 'text-[#D6D5D4] font-medium'
                                        : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                )}
                            >
                                Terms of Service
                            </span>
                        </div>
                    </button>

                    {/* Changelog */}
                    <a
                        href="https://github.com/phasehumans/december/blob/main/CHANGELOG.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative flex items-center justify-between w-full px-2.5 h-[32px] rounded-[10px] transition-all group outline-none hover:bg-[#1C1C1C] cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="text-[#919191] group-hover:text-[#D6D5D4] transition-colors flex items-center justify-center shrink-0">
                                <FileClock className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            </div>
                            <span className="text-[13px] font-normal text-[#919191] group-hover:text-[#D6D5D4] truncate tracking-[-0.01em]">
                                Changelog
                            </span>
                        </div>
                        <ArrowUpRight
                            className="w-[14px] h-[14px] text-[#7B7A79]"
                            strokeWidth={1.5}
                        />
                    </a>
                </div>
            </div>

            <div className="flex flex-col md:flex-row w-full h-full bg-[#141414] rounded-none md:rounded-lg border-0 md:border md:border-[#242323] overflow-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                {/* Desktop sidebar: visible only on md: and up */}
                <div className="hidden md:flex w-[220px] shrink-0 border-r border-[#242323] flex-col py-4 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                    <div className="px-4 mb-6">
                        <button
                            onClick={onBack}
                            className="flex items-center text-[#7B7A79] hover:text-[#D6D5D4] hover:bg-[#191919] px-2 py-1 -ml-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Home
                        </button>
                    </div>

                    <div className="flex flex-col gap-[2px] px-3 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                        <div className="px-3 py-2 text-[12px] font-medium text-[#7B7A79] mb-1">
                            Settings
                        </div>

                        <button
                            onClick={() => navigate(`/settings/${getSlugForProfileTab('Account')}`)}
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Account'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <UserCircle className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            Account
                        </button>
                        <button
                            onClick={() =>
                                navigate(`/settings/${getSlugForProfileTab('Preferences')}`)
                            }
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Preferences'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <Sliders className="w-[16px] h-[16px] mx-[1px]" strokeWidth={1.75} />
                            Preferences
                        </button>
                        <button
                            onClick={() =>
                                navigate(`/settings/${getSlugForProfileTab('Repositories')}`)
                            }
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Repositories'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <Icons.Github className="w-[18px] h-[18px]" />
                            Repositories
                        </button>
                        <button
                            onClick={() => navigate(`/settings/${getSlugForProfileTab('Secrets')}`)}
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Secrets'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <KeyRound className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            Secrets
                        </button>
                        <button
                            onClick={() =>
                                navigate(`/settings/${getSlugForProfileTab('Schedules')}`)
                            }
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Schedules'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <Clock className="w-[18px] h-[18px]" strokeWidth={1.75} />
                            Schedules
                        </button>
                        <button
                            onClick={() => navigate(`/settings/${getSlugForProfileTab('Billing')}`)}
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Billing'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <CreditCard className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            Billing
                        </button>
                        <button
                            onClick={() => navigate(`/settings/${getSlugForProfileTab('Usage')}`)}
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Usage' || activeTab === 'Analytics'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <Activity className="w-[18px] h-[18px]" strokeWidth={1.75} />
                            Usage
                        </button>

                        <div className="px-3 py-2 text-[12px] font-medium text-[#7B7A79] mt-4 mb-1">
                            Resources
                        </div>
                        <button
                            onClick={() => navigate(`/settings/${getSlugForProfileTab('Privacy')}`)}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Privacy'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="w-[18px] h-[18px]" strokeWidth={1.5} />
                                Privacy Policy
                            </div>
                        </button>
                        <button
                            onClick={() => navigate(`/settings/${getSlugForProfileTab('Terms')}`)}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Terms'
                                    ? 'bg-[#242323] text-[#D6D5C9]'
                                    : 'text-[#D6D5C9] hover:bg-[#191919]'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="w-[18px] h-[18px]" strokeWidth={1.5} />
                                Terms of Service
                            </div>
                        </button>
                        <a
                            href="https://github.com/phasehumans/december/blob/main/CHANGELOG.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between px-3 py-1.5 rounded-[10px] text-[#D6D5C9] hover:bg-[#191919] text-[13px] font-medium transition-colors group whitespace-nowrap shrink-0"
                        >
                            <div className="flex items-center gap-3">
                                <FileClock className="w-[18px] h-[18px]" strokeWidth={1.5} />
                                Changelog
                            </div>
                            <ArrowUpRight
                                className="w-[14px] h-[14px] text-[#7B7A79]"
                                strokeWidth={1.5}
                            />
                        </a>
                    </div>
                </div>

                {/* Mobile View with top bar and direct subpage content */}
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                    {/* Mobile Top Bar */}
                    <MobileBreadcrumbsHeader
                        onOpenSidebar={() => setIsMobileDrawerOpen(true)}
                        onHomeClick={() => {
                            if (onBack) onBack()
                            else navigate('/')
                        }}
                        items={[
                            {
                                label: 'Settings',
                                onClick: () => setIsMobileDrawerOpen(true),
                            },
                            {
                                label: activeTabLabel,
                                isLast: true,
                            },
                        ]}
                    />

                    {/* Mobile Content: Active Tab Content directly rendered */}
                    <div className="md:hidden flex-1 flex flex-col p-4 pb-12 w-full no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                        {profileErrorMessage && (
                            <div className="mb-4">
                                <ErrorAlert
                                    message={profileErrorMessage}
                                    onClear={() => setProfileActionError(null)}
                                />
                            </div>
                        )}
                        {renderTabContent()}
                    </div>

                    {/* Desktop Content Render: always visible on md: and up */}
                    <div className="hidden md:flex flex-1 justify-center px-6 md:px-16 py-8 md:py-12 relative z-10 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                        <div className="flex flex-col items-end gap-2 absolute top-12 right-6 md:right-16">
                            {profileErrorMessage && (
                                <ErrorAlert
                                    message={profileErrorMessage}
                                    onClear={() => setProfileActionError(null)}
                                />
                            )}
                        </div>
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            <ProfileNameModal
                isOpen={nameModalOpen}
                value={tempName}
                isPending={updateNameMutation.isPending}
                errorMessage={nameModalOpen ? profileActionError : null}
                onClose={() => {
                    setNameModalOpen(false)
                    setProfileActionError(null)
                }}
                onChange={setTempName}
                onSave={handleSaveName}
            />

            <ProfileNameModal
                isOpen={usernameModalOpen}
                value={tempUsername}
                isPending={updateUsernameMutation.isPending}
                title="Change Username"
                label="Username"
                errorMessage={usernameModalOpen ? profileActionError : null}
                onClose={() => {
                    setUsernameModalOpen(false)
                    setProfileActionError(null)
                }}
                onChange={setTempUsername}
                onSave={() => {
                    if (tempUsername.trim()) {
                        updateUsernameMutation.mutate(
                            { username: tempUsername.trim() },
                            {
                                onSuccess: () => {
                                    setUsernameModalOpen(false)
                                },
                            }
                        )
                    }
                }}
            />

            <ProfilePasswordModal
                isOpen={passwordModalOpen}
                isPending={updatePasswordMutation.isPending}
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                showCurrentPass={showCurrentPass}
                showNewPass={showNewPass}
                errorMessage={passwordModalOpen ? profileActionError : null}
                onClose={() => {
                    setPasswordModalOpen(false)
                    setProfileActionError(null)
                }}
                onUpdatePassword={handleUpdatePassword}
                onCurrentPasswordChange={setCurrentPassword}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onToggleShowCurrentPass={() => setShowCurrentPass((prev) => !prev)}
                onToggleShowNewPass={() => setShowNewPass((prev) => !prev)}
                hasPassword={profile?.hasPassword}
            />

            <ProfileDeleteAccountModal
                isOpen={deleteAccountModalOpen}
                onClose={() => setDeleteAccountModalOpen(false)}
                onConfirm={async () => {
                    try {
                        const { profileAPI } = await import('@/features/profile/api/profile')
                        await profileAPI.deleteAccount()
                        setDeleteAccountModalOpen(false)
                        onSignOut()
                    } catch (error) {
                        console.error('Failed to delete account', error)
                    }
                }}
            />

            <ProfileSignOutAllSessionsModal
                isOpen={signOutAllSessionsModalOpen}
                onClose={() => setSignOutAllSessionsModalOpen(false)}
                onConfirm={async () => {
                    try {
                        const { profileAPI } = await import('@/features/profile/api/profile')
                        await profileAPI.signoutAll()
                        setSignOutAllSessionsModalOpen(false)
                        onSignOut()
                    } catch (error) {
                        console.error('Failed to sign out of all sessions', error)
                    }
                }}
            />

            <ConnectCliModal
                isOpen={connectCliModalOpen}
                onClose={() => setConnectCliModalOpen(false)}
                userId={profile?.id}
            />
        </div>
    )
}
