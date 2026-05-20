'use client'

import { Brain, Search, MessageSquare, ArrowRight, Database, Layers } from 'lucide-react'

const steps = [
  {
    icon: MessageSquare,
    color: 'bg-stone-100 text-stone-600',
    border: 'border-stone-200',
    label: '01',
    title: 'User Query',
    desc:  'User types a question in Assamese, English, or naturally mixed code-switched text.',
    detail: 'e.g. "Kaziranga t hotel r daam kiman?"',
    mono: true,
  },
  {
    icon: Brain,
    color: 'bg-teal-50 text-teal-600',
    border: 'border-teal-200',
    label: '02',
    title: 'Intent Classification',
    desc:  'Fine-tuned MuRIL classifies the query into one of 44 tourism intent categories.',
    detail: '97.89% test accuracy · MuRIL 237M',
    mono: false,
  },
  {
    icon: Database,
    color: 'bg-amber-50 text-amber-600',
    border: 'border-amber-200',
    label: '03',
    title: 'Destination Detection',
    desc:  'A longest-pattern-first lookup detects the destination name from the query text.',
    detail: '51 destinations · 100 lookup patterns',
    mono: false,
  },
  {
    icon: Search,
    color: 'bg-blue-50 text-blue-600',
    border: 'border-blue-200',
    label: '04',
    title: 'Semantic Retrieval',
    desc:  'MuRIL mean-pooled embeddings retrieve the best matching Q&A pair via cosine similarity, filtered by intent and destination.',
    detail: '221,799 pairs · Recall@1 = 100%',
    mono: false,
  },
  {
    icon: Layers,
    color: 'bg-purple-50 text-purple-600',
    border: 'border-purple-200',
    label: '05',
    title: 'Confidence Routing',
    desc:  'High confidence (≥0.70) uses intent directly. Grey zone (0.30–0.70) runs race mode. Low confidence with destination triggers cross-intent search.',
    detail: 'Three-tier routing system',
    mono: false,
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6 bg-white border-t border-stone-100">
      <div className="max-w-6xl mx-auto">

        <div className="mb-14 max-w-xl">
          <p className="text-xs font-mono text-amber-600 tracking-widest uppercase mb-3">
            Architecture
          </p>
          <h2 className="font-display text-3xl font-semibold text-stone-900 leading-tight mb-3">
            How it works
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            A two-stage pipeline combining intent classification with semantic retrieval,
            built specifically for Assamese-English code-mixed text.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="relative">

          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-10 right-10 h-px bg-stone-200 z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-4 relative z-10">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="flex flex-col">

                  {/* Icon */}
                  <div className={`w-20 h-20 rounded-2xl border-2 ${step.border} ${step.color}
                                   flex items-center justify-center mb-4 bg-white shadow-sm
                                   flex-shrink-0 mx-auto lg:mx-0`}>
                    <Icon size={24} />
                  </div>

                  {/* Arrow (mobile only) */}
                  {i < steps.length - 1 && (
                    <div className="flex justify-center lg:hidden my-2">
                      <ArrowRight size={16} className="text-stone-300 rotate-90" />
                    </div>
                  )}

                  {/* Content */}
                  <div>
                    <span className="text-xs font-mono text-stone-400 mb-1 block">{step.label}</span>
                    <h3 className="text-sm font-semibold text-stone-900 mb-2 leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-xs text-stone-500 leading-relaxed mb-2">
                      {step.desc}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full inline-block
                                     ${step.color} border ${step.border}
                                     ${step.mono ? 'font-mono' : 'font-medium'}`}>
                      {step.detail}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tech stack pills */}
        <div className="mt-16 pt-10 border-t border-stone-100">
          <p className="text-xs text-stone-400 font-mono uppercase tracking-widest mb-4">
            Built with
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'MuRIL (google/muril-base-cased)',
              'Hugging Face Transformers',
              'PyTorch',
              'Gradio',
              'Next.js 14',
              'Vercel',
              'R-Drop Regularization',
              'Focal Loss',
              'Stochastic Weight Averaging',
              '221,799 Q&A pairs',
              '44 intents',
              '51 destinations',
            ].map(tech => (
              <span key={tech}
                    className="text-xs bg-stone-50 border border-stone-200 text-stone-600
                               px-3 py-1.5 rounded-full font-mono">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Dataset stats */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { val: '97.89%', label: 'Intent Accuracy',   sub: 'MuRIL fine-tuned' },
            { val: '100%',   label: 'Semantic Recall@1', sub: '612 test queries' },
            { val: '221,799',label: 'Q&A Pairs',         sub: '4,349 × 51 dest.' },
            { val: '1.0000', label: 'MRR',               sub: 'Semantic retrieval' },
          ].map(s => (
            <div key={s.label}
                 className="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-5">
              <p className="font-display text-2xl font-semibold text-stone-900 mb-1">
                {s.val}
              </p>
              <p className="text-xs font-semibold text-stone-700">{s.label}</p>
              <p className="text-xs text-stone-400 mt-0.5 font-mono">{s.sub}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
