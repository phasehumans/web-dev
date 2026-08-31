import { Folder, KeyRound } from 'lucide-react'
import React from 'react'

import type { PromptInputProps } from '@/features/home/types'

import { usePromptInputController } from '@/features/home/hooks/usePromptInputController'
import { Icons } from '@/shared/components/ui/Icons'
import { PromptFooter } from '@/shared/components/ui/PromptFooter'

export const PromptInput: React.FC<
    PromptInputProps & { onFocus?: () => void; mode?: 'agent' | 'search' }
> = ({
    onSubmit,
    isLoading,
    placeholder,
    minimized = false,
    onUpload,
    value,
    onChange,
    isAuthenticated,
    onOpenAuth,
    onFocus,
    mode,
    isThinkingMode,
    onToggleThinking,
}) => {
    const {
        input,
        textareaRef,
        dropdownRef,
        selectedIndex,
        setSelectedIndex,
        selectedRepos,
        setSelectedRepos,
        forceClose,
        dropdownPosition,
        isAtTriggered,
        isReposTriggered,
        isSessionsTriggered,
        isSecretsTriggered,
        filteredProviders,
        filteredRepos,
        filteredSessions,
        filteredSecrets,
        isGithubConnected,
        isReposLoading,
        isSessionsLoading,
        isSecretsLoading,
        githubConnectUrl,
        handleSelectRepo,
        handleSelectSession,
        handleSelectSecret,
        handleInputChange,
        handleSelect,
        handleSubmit,
        handleKeyDown,
        handleVoiceTranscript,
        handleVoiceStateChange,
        handleAuthCheck,
    } = usePromptInputController({
        value,
        onChange,
        onSubmit,
        isAuthenticated,
        onOpenAuth,
        isLoading,
        mode,
    })

    return (
        <div
            className={`relative w-full transition-all duration-300 ${minimized ? 'max-w-full' : 'max-w-3xl'}`}
        >
            <div
                className={`
        relative group rounded-[17px] bg-[#1F1F1F] border border-[#313131]
        focus-within:border-white/10 focus-within:bg-[#1F1F1F]
        transition-all duration-300 ease-out flex flex-col
      `}
            >
                <div
                    className={`flex flex-wrap items-start w-full relative rounded-t-[16px] overflow-visible ${minimized ? 'py-3 pl-5 pr-12 min-h-[48px]' : 'pt-[12px] pl-5 pr-12 pb-1 min-h-[72px] text-[14.5px]'}`}
                >
                    {selectedRepos.map((repo, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-1.5 text-[#E8E8E8] font-sans font-medium mr-1.5 mb-1 bg-[#2A2928] px-2 py-0.5 rounded-[6px]"
                        >
                            <Icons.Github className="w-3.5 h-3.5 text-white" />
                            <span className="text-[14px] leading-relaxed">
                                {repo.owner.login}/{repo.name}
                            </span>
                        </div>
                    ))}

                    <div className="relative flex-1 min-w-[100px]">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(event) => handleInputChange(event.target.value)}
                            onKeyDown={handleKeyDown}
                            onSelect={handleSelect}
                            onKeyUp={handleSelect}
                            onClick={handleSelect}
                            onFocus={onFocus}
                            placeholder={
                                placeholder ||
                                (minimized
                                    ? 'Ask a follow-up...'
                                    : selectedRepos.length > 0
                                      ? ''
                                      : mode === 'search'
                                        ? 'Ask anything...'
                                        : 'Describe your idea...')
                            }
                            className={`
                    w-full bg-transparent text-[#D6D5D4] placeholder-[#949494] caret-white
                    resize-none focus:outline-none z-10 font-sans font-medium leading-relaxed p-0 m-0 border-none
                    [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20
                  `}
                            rows={minimized ? 1 : 3}
                        />
                    </div>

                    {isAuthenticated && isAtTriggered && !isReposTriggered && !forceClose && (
                        <div
                            ref={dropdownRef}
                            className={`absolute left-5 z-[100] w-[230px] max-w-[calc(100vw-32px)] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl p-1 shadow-lg shadow-black/40 flex flex-col animate-in fade-in zoom-in-95 duration-150 ${dropdownPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[48px]'}`}
                        >
                            {filteredProviders.length > 0 ? (
                                filteredProviders.map((provider, idx) => (
                                    <button
                                        key={provider.id}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        onClick={() => {
                                            const newValue = (input || '').replace(
                                                /@[a-zA-Z0-9_-]*$/,
                                                `@${provider.trigger}`
                                            )
                                            handleInputChange(newValue)
                                            textareaRef.current?.focus()
                                        }}
                                        className={`flex items-center gap-3 px-3 py-1.5 rounded-xl text-left text-[12.5px] font-medium text-[#EDEDEF] transition-colors outline-none w-full ${selectedIndex === idx ? 'bg-[#252525] dropdown-item-active' : 'hover:bg-[#252525]'}`}
                                    >
                                        <provider.icon
                                            className="w-4 h-4 text-[#8F8E8D]"
                                            style={(provider as any).iconStyle}
                                        />
                                        <span>{provider.title}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-center text-[12.5px] text-[#8F8E8D]">
                                    No matching options.
                                </div>
                            )}
                        </div>
                    )}

                    {isAuthenticated && isReposTriggered && !forceClose && (
                        <div
                            ref={dropdownRef}
                            className={`absolute left-5 z-[100] w-[280px] max-w-[calc(100vw-32px)] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl p-1 shadow-lg shadow-black/40 font-sans flex flex-col max-h-[300px] animate-in fade-in zoom-in-95 duration-150 ${dropdownPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[48px]'}`}
                        >
                            <div className="px-3 py-1.5 mb-0.5">
                                <span className="text-[11.5px] font-medium text-[#8F8E8D]">
                                    Repositories
                                </span>
                            </div>
                            {!isGithubConnected && !isReposLoading ? (
                                <div className="px-3 py-2 text-[12.5px] text-[#8F8E8D] leading-relaxed">
                                    <a
                                        href={githubConnectUrl}
                                        className="text-[#87B2F4] hover:text-[#A4C8FF] hover:underline underline-offset-2 transition-colors cursor-pointer font-medium"
                                    >
                                        Connect GitHub
                                    </a>{' '}
                                    to see repos.
                                </div>
                            ) : isReposLoading ? (
                                <div className="px-3 py-2 text-[12.5px] text-[#8F8E8D]">
                                    Loading...
                                </div>
                            ) : (
                                <div
                                    className="flex flex-col overflow-y-auto px-0.5 pb-0.5"
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    {filteredRepos.length > 0 ? (
                                        filteredRepos.slice(0, 10).map((repo, idx) => (
                                            <button
                                                key={repo.id}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                onClick={() => handleSelectRepo(repo)}
                                                className={`flex items-start gap-3 px-3 py-1.5 rounded-xl transition-colors text-left w-full outline-none ${selectedIndex === idx ? 'bg-[#252525] dropdown-item-active' : 'hover:bg-[#252525]'}`}
                                            >
                                                <Icons.Github
                                                    className={`w-4 h-4 mt-[2px] ${selectedIndex === idx ? 'text-[#EDEDEF]' : 'text-[#8F8E8D]'}`}
                                                />
                                                <div className="flex flex-col min-w-0 leading-tight gap-0.5">
                                                    <span className="text-[12.5px] font-medium text-[#EDEDEF] truncate">
                                                        {repo.name}
                                                    </span>
                                                    <span className="text-[11.5px] text-[#8F8E8D] truncate">
                                                        {repo.owner.login}
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-center text-[12.5px] text-[#8F8E8D]">
                                            No repos found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {isAuthenticated && isSessionsTriggered && !forceClose && (
                        <div
                            ref={dropdownRef}
                            className={`absolute left-5 z-[100] w-[280px] max-w-[calc(100vw-32px)] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl p-1 shadow-lg shadow-black/40 font-sans flex flex-col max-h-[300px] animate-in fade-in zoom-in-95 duration-150 ${dropdownPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[48px]'}`}
                        >
                            <div className="px-3 py-1.5 mb-0.5">
                                <span className="text-[11.5px] font-medium text-[#8F8E8D]">
                                    Sessions
                                </span>
                            </div>
                            {isSessionsLoading ? (
                                <div className="px-3 py-2 text-[12.5px] text-[#8F8E8D]">
                                    Loading...
                                </div>
                            ) : (
                                <div
                                    className="flex flex-col overflow-y-auto px-0.5 pb-0.5"
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    {filteredSessions.length > 0 ? (
                                        filteredSessions.slice(0, 10).map((session, idx) => (
                                            <button
                                                key={session.id}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                onClick={() => handleSelectSession(session)}
                                                className={`flex items-start gap-3 px-3 py-1.5 rounded-xl transition-colors text-left w-full outline-none ${selectedIndex === idx ? 'bg-[#252525] dropdown-item-active' : 'hover:bg-[#252525]'}`}
                                            >
                                                <Folder
                                                    className={`w-4 h-4 mt-[2px] ${selectedIndex === idx ? 'text-[#EDEDEF]' : 'text-[#8F8E8D]'}`}
                                                />
                                                <div className="flex flex-col min-w-0 leading-tight gap-0.5">
                                                    <span className="text-[12.5px] font-medium text-[#EDEDEF] truncate">
                                                        {session.title || 'Untitled Session'}
                                                    </span>
                                                    <span className="text-[11.5px] text-[#8F8E8D] truncate">
                                                        {session.lastMessage ||
                                                            new Date(
                                                                session.updatedAt
                                                            ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-center text-[12.5px] text-[#8F8E8D]">
                                            No sessions found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {isAuthenticated && isSecretsTriggered && !forceClose && (
                        <div
                            ref={dropdownRef}
                            className={`absolute left-5 z-[100] w-[280px] max-w-[calc(100vw-32px)] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl p-1 shadow-lg shadow-black/40 font-sans flex flex-col max-h-[300px] animate-in fade-in zoom-in-95 duration-150 ${dropdownPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[48px]'}`}
                        >
                            <div className="px-3 py-1.5 mb-0.5">
                                <span className="text-[11.5px] font-medium text-[#8F8E8D]">
                                    Secrets
                                </span>
                            </div>
                            {isSecretsLoading ? (
                                <div className="px-3 py-2 text-[12.5px] text-[#8F8E8D]">
                                    Loading...
                                </div>
                            ) : (
                                <div
                                    className="flex flex-col overflow-y-auto px-0.5 pb-0.5"
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    {filteredSecrets.length > 0 ? (
                                        filteredSecrets.slice(0, 10).map((secret, idx) => (
                                            <button
                                                key={secret.id}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                onClick={() => handleSelectSecret(secret)}
                                                className={`flex items-start gap-3 px-3 py-1.5 rounded-xl transition-colors text-left w-full outline-none ${selectedIndex === idx ? 'bg-[#252525] dropdown-item-active' : 'hover:bg-[#252525]'}`}
                                            >
                                                <KeyRound
                                                    className={`w-4 h-4 mt-[2px] ${selectedIndex === idx ? 'text-[#EDEDEF]' : 'text-[#8F8E8D]'}`}
                                                    style={{
                                                        transform: 'scaleY(-1) rotate(-135deg)',
                                                    }}
                                                />
                                                <div className="flex flex-col min-w-0 leading-tight gap-0.5">
                                                    <span className="text-[12.5px] font-medium text-[#EDEDEF] truncate">
                                                        {secret.name}
                                                    </span>
                                                    <span className="text-[11.5px] text-[#8F8E8D] truncate">
                                                        {secret.note || 'Stored secret'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-center text-[12.5px] text-[#8F8E8D]">
                                            No secrets found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <PromptFooter
                    onUpload={() => handleAuthCheck(() => onUpload?.())}
                    onSubmit={() => handleSubmit()}
                    hasInput={!!input?.trim()}
                    isLoading={isLoading}
                    onVoiceTranscript={handleVoiceTranscript}
                    onVoiceStateChange={handleVoiceStateChange}
                    isAuthenticated={isAuthenticated}
                    onOpenAuth={onOpenAuth}
                    onOptionSelect={(trigger) => {
                        const separator = input && !input.endsWith(' ') ? ' ' : ''
                        handleInputChange((input || '') + separator + '@' + trigger)
                        textareaRef.current?.focus()
                    }}
                    mode={mode}
                    isThinkingMode={isThinkingMode}
                    onToggleThinking={onToggleThinking}
                />
            </div>
        </div>
    )
}

export default PromptInput
