import { GitCommit } from 'lucide-react'
import React from 'react'

export const ChangesWorkspace: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#141414] text-[#8E8D8C] select-none p-6 font-sans w-full h-full">
            <div className="flex flex-col items-center gap-3 max-w-sm text-center">
                <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1AA]">
                    <GitCommit className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-semibold text-[#EDEDEF]">
                        No pending changes
                    </span>
                    <span className="text-[12px] text-[#8E8D8C]">
                        Modified files and git diffs will appear here as changes are made.
                    </span>
                </div>
            </div>
        </div>
    )
}
