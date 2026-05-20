'use client'

import { GitBranch, Mail, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer id="contact" className="bg-stone-900 text-stone-400 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <span className="font-display text-white font-semibold">TourBot</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-500 mb-4">
              Assamese-English code-mixed tourism chatbot built as an M.Tech thesis
              project at Gauhati University.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-stone-800 px-2.5 py-1 rounded-full font-mono text-stone-400">
                MuRIL
              </span>
              <span className="text-xs bg-stone-800 px-2.5 py-1 rounded-full font-mono text-stone-400">
                44 intents
              </span>
              <span className="text-xs bg-stone-800 px-2.5 py-1 rounded-full font-mono text-stone-400">
                51 destinations
              </span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-widest mb-4 font-mono">
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                {
                  label: 'HF Space (Gradio)',
                  href:  'https://huggingface.co/spaces/rajk12/assamese-tourism-chatbot',
                  icon:  ExternalLink,
                },
                {
                  label: 'Intent Classifier (HF)',
                  href:  'https://huggingface.co/rajk12/assamese-tourism-intent-classifier',
                  icon:  ExternalLink,
                },
                {
                  label: 'Q&A Dataset (HF)',
                  href:  'https://huggingface.co/datasets/rajk12/assamese-tourism-qa-bank',
                  icon:  ExternalLink,
                },
                {
                  label: 'GitHub',
                  href:  'https://github.com/rajdeepkotoky',
                  icon:  GitBranch,
                },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 text-sm text-stone-500 hover:text-white transition-colors group">
                    <Icon size={13} className="group-hover:text-amber-400 transition-colors" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-widest mb-4 font-mono">
              Contact
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Researcher</p>
                <p className="text-sm text-stone-300 font-medium">Rajdeep Kotoky</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Institution</p>
                <p className="text-sm text-stone-300">Gauhati University</p>
                <p className="text-xs text-stone-500">Dept. of Information Technology</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Supervisor</p>
                <p className="text-sm text-stone-300">Dr. Shikhar Kumar Sarma</p>
              </div>
              <a href="mailto:rajdeepkotoky@example.com"
                 className="flex items-center gap-2 text-sm text-stone-500 hover:text-white transition-colors group mt-2">
                <Mail size={13} className="group-hover:text-amber-400 transition-colors" />
                Get in touch
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row
                        items-center justify-between gap-4">
          <p className="text-xs text-stone-600 font-mono">
            © 2026 Rajdeep Kotoky · M.Tech Thesis · Gauhati University
          </p>
          <p className="text-xs text-stone-600">
            Built with{' '}
            <span className="text-amber-600">Next.js</span>
            {' '}·{' '}
            <span className="text-amber-600">Gradio</span>
            {' '}·{' '}
            <span className="text-amber-600">MuRIL</span>
          </p>
        </div>

      </div>
    </footer>
  )
}
