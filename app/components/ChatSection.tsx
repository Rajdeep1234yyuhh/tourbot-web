'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, RotateCcw, Cpu, MapPin, BarChart2, Zap, Sparkles, Database } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface DebugInfo {
  intent?:      string
  confidence?:  number
  destination?: string
  score?:       number
  matchConf?:   string
  matchedQ?:    string
  method?:      string
  alts?:        { intent: string; confidence: number }[]
  raw?:         string
  override?:    string
}

// ── Examples ──────────────────────────────────────────────────────────────────
const EXAMPLES = [
  'Kaziranga t hotel r daam kiman?',
  'Majuli jabor fastest way ki?',
  'Kamakhya t entry fee kiman?',
  'Manas National Park t wildlife ki ase?',
  'Haflong t best time ki jaboloi?',
  'Guwahati t budget stay r option ki ase?',
]

// ── Parse debug markdown into structured data ─────────────────────────────────
function parseDebug(md: string): DebugInfo {
  if (!md) return {}
  const get = (label: string) => {
    const m = md.match(new RegExp("\\*\\*" + label + ":\\*\\*[^\\n]*?`([^`]+)`"))
    return m?.[1]?.trim()
  }
  const getAfter = (label: string) => {
    const m = md.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n*]+)`))
    return m?.[1]?.trim()
  }
  const confMatch  = md.match(/— ([\d.]+)%/)
  const scoreMatch = md.match(/Score:\s*`([\d.]+)`/)
  const confLMatch = md.match(/\((high|medium|low)\)/)

  const alts: { intent: string; confidence: number }[] = []
  const altMatches = [...md.matchAll(/- `([^`]+)` \(([\d.]+)%\)/g)]
  for (const m of altMatches) {
    alts.push({ intent: m[1], confidence: parseFloat(m[2]) / 100 })
  }

  return {
    intent:      get('Intent'),
    confidence:  confMatch  ? parseFloat(confMatch[1]) / 100 : undefined,
    destination: getAfter('Destination'),
    score:       scoreMatch ? parseFloat(scoreMatch[1])       : undefined,
    matchConf:   confLMatch ? confLMatch[1]                   : undefined,
    matchedQ:    getAfter('Matched Q')?.replace(/^\*|\*$/g, ''),
    method:      getAfter('Routing'),
    alts,
    raw: md,
    override: md.match(/\*\*Override:\*\*\s*`([^`]+)`/)?.[1],
  }
}

// ── Conf badge ────────────────────────────────────────────────────────────────
function ConfBadge({ level }: { level?: string }) {
  const map: Record<string, string> = {
    high:   'bg-teal-50 text-teal-700 border-teal-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low:    'bg-red-50 text-red-600 border-red-200',
  }
  if (!level) return null
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border font-medium ${map[level] ?? 'bg-stone-100 text-stone-500 border-stone-200'}`}>
      {level}
    </span>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-stone-300 block" />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatSection() {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [debug,      setDebug]      = useState<DebugInfo>({})
  const [rawAnswer,  setRawAnswer]  = useState<string>('')
  const [hfHistory,  setHfHistory]  = useState<{role:string;content:string}[]>([])

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history: hfHistory }),
      })
      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error }])
      } else {
        // Extract the latest assistant message (messages format: {role, content})
        const newHistory: {role:string;content:string}[] = data.history ?? []
        const lastMsg = [...newHistory].reverse().find(m => m.role === 'assistant')
        const answer  = lastMsg?.content ?? 'No response.'

        setHfHistory(newHistory)
        setMessages(prev => [...prev, { role: 'assistant', content: answer }])
        setDebug(parseDebug(data.debug ?? ''))
        setRawAnswer(data.rawAnswer ?? '')
      }
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Could not reach the server. Please try again.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, hfHistory])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const reset = () => {
    setMessages([])
    setHfHistory([])
    setDebug({})
    setRawAnswer('')
    setInput('')
    inputRef.current?.focus()
  }

  const hasDebug = !!debug.intent

  return (
    <section id="chat" className="py-16 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div className="mb-10 max-w-xl">
          <p className="text-xs font-mono text-amber-600 tracking-widest uppercase mb-3">
            Live Demo
          </p>
          <h2 className="font-display text-3xl font-semibold text-stone-900 leading-tight mb-3">
            Ask about Assam tourism
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Type in Assamese, English, or naturally mixed — covering 51 destinations
            across Assam.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Chat panel ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col"
               style={{ height: '600px' }}>

            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-dot" />
                <span className="text-sm font-medium text-stone-700">Tourism Chatbot</span>
                <span className="text-xs text-stone-400 font-mono">44 intents · 51 destinations</span>
              </div>
              <button onClick={reset}
                      className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                      title="Clear chat">
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                    <span className="text-2xl">🏔️</span>
                  </div>
                  <p className="text-stone-500 text-sm mb-1 font-medium">
                    Ask anything about Assam tourism
                  </p>
                  <p className="text-stone-400 text-xs mb-6">
                    in Assamese, English, or code-mixed
                  </p>
                  {/* Example pills */}
                  <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                    {EXAMPLES.map(ex => (
                      <button key={ex}
                              onClick={() => sendMessage(ex)}
                              className="text-xs bg-stone-50 border border-stone-200 text-stone-600
                                         px-3 py-1.5 rounded-full hover:bg-amber-50 hover:border-amber-200
                                         hover:text-amber-700 transition-all font-mono">
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i}
                     className={`msg-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-stone-900 text-white rounded-br-md'
                      : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-bl-md'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl rounded-bl-md">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-stone-100 px-4 py-4">
              <div className="flex items-end gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3
                              focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                <textarea ref={inputRef}
                          value={input}
                          onChange={e => setInput(e.target.value)}
                          onKeyDown={handleKey}
                          placeholder="e.g. Kaziranga t hotel r daam kiman?"
                          rows={1}
                          className="flex-1 bg-transparent resize-none text-sm text-stone-800
                                     placeholder:text-stone-400 outline-none font-body
                                     max-h-32 overflow-y-auto" />
                <button onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading}
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500 text-white
                                   flex items-center justify-center transition-all
                                   hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send size={14} />
                </button>
              </div>
              <p className="text-xs text-stone-400 mt-2 text-center">
                Press <kbd className="font-mono bg-stone-100 px-1 rounded text-stone-500">Enter</kbd> to send
              </p>
            </div>
          </div>

          {/* ── Debug panel ── */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3">

            {/* Pipeline debug */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                <Cpu size={14} className="text-teal-600" />
                <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                  Pipeline Debug
                </span>
              </div>

              {hasDebug ? (
                <div className="px-4 py-4 space-y-3">

                  {/* Intent */}
                  {debug.intent && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Intent</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded font-mono flex-1 truncate">
                          {debug.intent}
                        </code>
                        {debug.confidence !== undefined && (
                          <span className="text-xs font-semibold text-stone-600 flex-shrink-0">
                            {(debug.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Routing */}
                  {debug.method && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Routing</p>
                      <span className="text-xs bg-stone-50 border border-stone-200 text-stone-600
                                       px-2 py-1 rounded font-medium">
                        {debug.method}
                      </span>
                    </div>
                  )}

                  {/* Destination */}
                  {debug.destination && debug.destination !== 'Not detected' && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Destination</p>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-amber-500" />
                        <span className="text-xs text-stone-700 font-medium">{debug.destination}</span>
                      </div>
                    </div>
                  )}

                  {/* Match score */}
                  {debug.score !== undefined && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Semantic Match</p>
                      <div className="flex items-center gap-2">
                        <BarChart2 size={12} className="text-stone-400" />
                        <code className="text-xs font-mono text-stone-700">
                          {debug.score.toFixed(4)}
                        </code>
                        <ConfBadge level={debug.matchConf} />
                      </div>
                      {/* Score bar */}
                      <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-400 rounded-full transition-all duration-500"
                             style={{ width: `${Math.min(debug.score * 100, 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Matched question */}
                  {debug.matchedQ && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Matched Q</p>
                      <p className="text-xs text-stone-500 italic leading-relaxed bg-stone-50
                                    px-2 py-1.5 rounded border border-stone-100">
                        {debug.matchedQ}
                      </p>
                    </div>
                  )}

                  {/* Alternatives */}
                  {(debug.alts?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-2">Alternatives</p>
                      <div className="space-y-1">
                        {debug.alts!.map((a, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <code className="text-xs text-stone-500 font-mono truncate flex-1">
                              {a.intent}
                            </code>
                            <span className="text-xs text-stone-400 flex-shrink-0">
                              {(a.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <Zap size={20} className="mx-auto mb-2 text-stone-300" />
                  <p className="text-xs text-stone-400">
                    Pipeline analysis will appear here after your first query.
                  </p>
                </div>
              )}
            </div>

            {/* Raw retrieval vs LLM */}
            {rawAnswer && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

                {/* Raw retrieval */}
                <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                  <Database size={14} className="text-blue-500" />
                  <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                    Raw Retrieval
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-stone-500 leading-relaxed">{rawAnswer}</p>
                </div>

                {/* LLM polished */}
                <div className="px-4 py-3 border-t border-stone-100 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                    LLM Polished
                  </span>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    {[...messages].reverse().find(m => m.role === 'assistant')?.content ?? ''}
                  </p>
                </div>

              </div>
            )}

            {/* Stats card */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                Model Stats
              </p>
              <div className="grid grid-cols-2 gap-y-3">
                {[
                  ['Accuracy',    '97.89%'],
                  ['Macro-F1',    '0.9787'],
                  ['Intents',     '44'],
                  ['Destinations','51'],
                  ['Q&A pairs',   '221,799'],
                  ['Encoder',     'MuRIL'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-amber-600 font-mono">{k}</p>
                    <p className="text-sm font-semibold text-amber-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
