import React, { useState } from 'react'

interface FaqItem {
    question: string
    answer: string
}

export const FaqSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    const faqs: FaqItem[] = [
        {
            question: 'What is the difference between December CLI and December Cloud?',
            answer: 'December CLI runs locally in your terminal TUI with zero cloud latency and direct access to your local filesystem and custom MCP servers. December Cloud runs tasks in remote, isolated Linux microVM sandboxes with live browser preview, visual canvas, and automatic GitHub pull request creation. You can seamlessly migrate active sessions between both using the `/handoff` command.',
        },
        {
            question: 'How do I install and get started with the CLI?',
            answer: 'You can install December CLI globally via npm by running `npm install -g @trydecember/cli` (or run it without installation using `npx @trydecember/cli`). Then, type `december` inside any project repository to launch the interactive terminal TUI.',
        },
        {
            question: 'Can I bring my own API keys (BYOK)?',
            answer: 'Yes. You can provide your own API keys for Anthropic (Claude 3.7 Sonnet), OpenAI (GPT-4o), Google (Gemini 2.5), DeepSeek, or connect to locally hosted models via Ollama. You can also use December platform credits.',
        },
        {
            question: 'How does the Model Context Protocol (MCP) work with December?',
            answer: 'December has native first-class MCP support. Simply add `.december/mcp.json` to your repository or `~/.config/december/mcp.json` to your user home. December automatically connects to the configured MCP servers at session boot and registers their dynamic tools into the agent’s execution harness.',
        },
    ]

    const toggleFaq = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <section
            id="faq-section"
            className="w-full border-t border-[#E4E4E7] bg-[#FAFAFA] py-24 px-6"
        >
            <div className="max-w-[880px] mx-auto">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#E4E4E7]">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[#71717A] flex items-center">
                        <span className="text-[#87B2F4] font-bold mr-1.5">〉</span>
                        05 // FREQUENTLY ASKED QUESTIONS
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono text-[11px] text-[#A1A1AA] hidden sm:inline">
                        Answers &amp; Details
                    </span>
                </div>

                {/* Headline */}
                <h2 className="font-sans font-semibold text-[32px] sm:text-[40px] leading-[1.15] tracking-[-0.035em] text-[#0B1015] mb-10 text-center">
                    Everything you need to know.
                </h2>

                {/* Accordion list */}
                <div className="flex flex-col gap-3">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index
                        return (
                            <div
                                key={index}
                                className={`rounded-xl border transition-all overflow-hidden ${
                                    isOpen
                                        ? 'border-[#87B2F4] bg-white shadow-[0_4px_20px_rgba(135,178,244,0.18)]'
                                        : 'border-[#E4E4E7] bg-white hover:border-[#87B2F4]/60 shadow-sm'
                                }`}
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-sans font-medium text-[16px] text-[#0B1015] hover:text-[#87B2F4] transition-colors cursor-pointer"
                                >
                                    <span>{faq.question}</span>
                                    <span
                                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[13px] shrink-0 transition-colors ${
                                            isOpen
                                                ? 'bg-[#87B2F4] text-[#0B1015] font-bold shadow-sm'
                                                : 'bg-[#F4F4F5] text-[#71717A]'
                                        }`}
                                    >
                                        {isOpen ? '−' : '+'}
                                    </span>
                                </button>

                                {isOpen && (
                                    <div className="px-5 pb-5 pt-1 text-[14.5px] text-[#52525B] leading-relaxed border-t border-[#F4F4F5] font-sans">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
