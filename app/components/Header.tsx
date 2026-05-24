'use client'

import Link from 'next/link'
import { GitBranch, ExternalLink } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <span className="font-display text-base font-semibold text-stone-900 leading-none">
              TourBot
            </span>
            <span className="block text-xs text-stone-400 font-body leading-none mt-0.5">
              Assamese · English
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/"
             className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium">
            Chat
          </Link>
        </nav>

        {/* Links */}
        <div className="flex items-center gap-3">
<a href="https://github.com/rajdeepkotoky"
             target="_blank" rel="noopener noreferrer"
             className="p-2 text-stone-400 hover:text-stone-700 transition-colors">
            <GitBranch size={18} />
          </a>
          <a href="https://huggingface.co/spaces/rajk12/assamese-tourism-chatbot"
             target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-700
                        border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors">
            <ExternalLink size={12} />
            HF Space
          </a>
        </div>

      </div>
    </header>
  )
}
