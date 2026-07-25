import type { PromptInputProps } from '@/features/home/types'

import { usePromptInputController } from '@/features/home/hooks/usePromptInputController'
import { Icons } from '@/shared/components/ui/Icons'
import { PromptFooter } from '@/shared/components/ui/PromptFooter'

const PromptInput: React.FC<
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
        filteredProviders,
        filteredRepos,
        isGithubConnected,
        isReposLoading,
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
                                        ? 'Ask about your code...'
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
                            className={`absolute left-5 z-[100] w-[320px] bg-[#1E1E1E] border border-[#2A2928] rounded-xl shadow-lg shadow-black/40 overflow-hidden font-sans flex flex-col max-h-[320px] py-1.5 ${dropdownPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[48px]'}`}
                        >
                            <div
                                className="flex flex-col overflow-y-auto px-1.5"
                                style={{ scrollbarWidth: 'none' }}
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
                                            className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left w-full outline-none ${selectedIndex === idx ? 'bg-[#2A2928] dropdown-item-active' : 'hover:bg-[#2A2928]'}`}
                                        >
                                            <provider.icon className="w-[16px] h-[16px] text-[#8F8E8D]" />
                                            <div className="flex flex-col min-w-0 leading-tight gap-0.5">
                                                <span className="text-[13px] font-medium text-[#E8E8E8] truncate">
                                                    {provider.title}
                                                </span>
                                                <span className="text-[11.5px] text-[#8F8E8D] truncate">
                                                    {provider.description}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-center text-[12.5px] text-[#8F8E8D]">
                                        No matching options.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isAuthenticated && isReposTriggered && !forceClose && (
                        <div
                            ref={dropdownRef}
                            className={`absolute left-5 z-[100] w-[280px] bg-[#1E1E1E] border border-[#2A2928] rounded-xl shadow-lg shadow-black/40 overflow-hidden font-sans flex flex-col max-h-[300px] py-1 ${dropdownPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[48px]'}`}
                        >
                            <div className="px-3 py-1.5 mb-1">
                                <span className="text-[11.5px] font-medium text-[#8F8E8D]">
                                    Repositories
                                </span>
                            </div>
                            {!isGithubConnected && !isReposLoading ? (
                                <div className="px-3 py-2 text-[12.5px] text-[#8F8E8D]">
                                    Connect GitHub to see repos.
                                </div>
                            ) : isReposLoading ? (
                                <div className="px-3 py-2 text-[12.5px] text-[#8F8E8D]">
                                    Loading...
                                </div>
                            ) : (
                                <div
                                    className="flex flex-col overflow-y-auto px-1.5 pb-1"
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    {filteredRepos.length > 0 ? (
                                        filteredRepos.slice(0, 10).map((repo, idx) => (
                                            <button
                                                key={repo.id}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                onClick={() => {
                                                    const newValue = (input || '').replace(
                                                        /@repos:[^\s]*$/,
                                                        ''
                                                    )
                                                    handleInputChange(newValue)
                                                    if (
                                                        !selectedRepos.some((r) => r.id === repo.id)
                                                    ) {
                                                        setSelectedRepos((prev) => [...prev, repo])
                                                    }
                                                    textareaRef.current?.focus()
                                                }}
                                                className={`flex items-start gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 text-left w-full outline-none ${selectedIndex === idx ? 'bg-[#2A2928] dropdown-item-active' : 'hover:bg-[#252424]'}`}
                                            >
                                                <Icons.Github
                                                    className={`w-[15px] h-[15px] mt-[2px] ${selectedIndex === idx ? 'text-[#E8E8E8]' : 'text-[#8F8E8D]'}`}
                                                />
                                                <div className="flex flex-col min-w-0 leading-tight gap-1">
                                                    <span className="text-[13.5px] font-medium text-[#E8E8E8] truncate">
                                                        {repo.name}
                                                    </span>
                                                    <span className="text-[12px] text-[#8F8E8D] truncate">
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
                />
            </div>
        </div>
    )
}

export default PromptInput
