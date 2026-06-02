'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, RotateCcw, Cpu, Zap, Sparkles, Database,
  ExternalLink, GitBranch, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string }
interface DebugInfo {
  intent?: string; confidence?: number; destination?: string
  matchConf?: string; matchedQ?: string; method?: string
  alts?: { intent: string; confidence: number }[]
  raw?: string; override?: string
}

// ── Static data ───────────────────────────────────────────────────────────────
const EXAMPLES = [
  'Kaziranga National Park t hotel r daam kiman?',
  'Majuli Island jabor fastest way ki?',
  'Kamakhya Temple t entry fee kiman?',
  'Guwahati t budget stay r option ki ase?',
  'Tezpur famous kio eman, ki pai khabole?',
]

const DESTINATIONS = [
  'Kaziranga National Park','Majuli Island','Kamakhya Temple','Guwahati',
  'Tezpur','Haflong','Sivasagar','Dibru-Saikhowa National Park',
  'Pobitora Wildlife Sanctuary','Orang National Park','Jorhat','Dibrugarh',
  'Manas National Park','Barpeta','Dhubri','Goalpara','Sadiya','Hajo',
  'Sualkuchi','Nameri National Park','Charaideo Maidams',
  'Hoollongapar Gibbon Sanctuary','Umananda Island','Bhalukpong',
  'Madan Kamdev','Garampani','Kakochang Waterfall','Panimoor Falls',
  'Chakrashila Wildlife Sanctuary','Bishwanath Ghat','Rudrasagar Lake',
  'Tocklai Tea Research Institute','Padum Pukhuri','Deepor Beel',
  'Chandubi Lake','Batadrava Than','Negheriting Shiva Dol',
  'Dhekiakhowa Bornamghar','Bordowa','Sarthebari',
  'Pani Dihing Bird Sanctuary','Sonai Rupai Wildlife Sanctuary',
  'Joypur Rainforest','Bura Chapori Wildlife Sanctuary',
  'Laokhowa Wildlife Sanctuary','Navagraha Temple','Basistha Ashram',
  'Doul Govinda Temple','Barail Wildlife Sanctuary','Abhayapuri','Tawang',
]

const INTENTS = [
  'accommodation_business','accommodation_couple','accommodation_family',
  'accommodation_general','accommodation_price','accommodation_solo','accommodation_type',
  'activities_adventure','activities_ask_must_see','activities_ask_photography_spots',
  'activities_ask_things_to_do','activities_cultural','activities_wildlife',
  'best_time_visit','best_time_visit_festival','best_time_visit_less_crowd','best_time_visit_weather',
  'comparison',
  'cost_entry','cost_photo_video_additional','cost_trip_budget',
  'duration_stay_general','duration_stay_long','duration_stay_short',
  'food_general','food_non_vegetarian','food_price','food_specialty','food_vegetarian',
  'precaution_carry_things','precaution_general','precaution_safety',
  'reach_budget','reach_distance_time','reach_fast','reach_general','reach_transport',
  'speciality_adventure','speciality_culture','speciality_food',
  'speciality_general','speciality_history','speciality_wildlife',
  'tips_advice',
]

const RESOURCES = [
  { label: 'Intent Classifier', path: 'rajk12/assamese-tourism-intent-classifier',  href: 'https://huggingface.co/rajk12/assamese-tourism-intent-classifier',           badge: 'Model'   },
  { label: 'Sentence Encoder',  path: 'rajk12/assamese-tourism-sentence-encoder',    href: 'https://huggingface.co/rajk12/assamese-tourism-sentence-encoder',             badge: 'Model'   },
  { label: 'Q&A Dataset',       path: 'rajk12/assamese-tourism-qa-bank',             href: 'https://huggingface.co/datasets/rajk12/assamese-tourism-qa-bank',             badge: 'Dataset' },
  { label: 'HF Space',          path: 'spaces/rajk12/assamese-tourism-chatbot',      href: 'https://huggingface.co/spaces/rajk12/assamese-tourism-chatbot',               badge: 'Space'   },
  { label: 'GitHub',            path: 'Rajdeep1234yyuhh/porta',                      href: 'https://github.com/Rajdeep1234yyuhh/porta/tree/master',                       badge: 'Code'    },
]


// ── Debug parser ──────────────────────────────────────────────────────────────
function parseDebug(md: string): DebugInfo {
  if (!md) return {}
  const get = (label: string) => {
    const m = md.match(new RegExp('\\*\\*' + label + ':\\*\\*[^\\n]*?`([^`]+)`'))
    return m?.[1]?.trim()
  }
  const getAfter = (label: string) => {
    const m = md.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n*]+)`))
    return m?.[1]?.trim()
  }
  const confMatch = md.match(/— ([\d.]+)%/)
  const confLMatch = md.match(/\((high|medium|low)\)/)
  const alts: { intent: string; confidence: number }[] = []
  for (const m of [...md.matchAll(/- `([^`]+)` \(([\d.]+)%\)/g)])
    alts.push({ intent: m[1], confidence: parseFloat(m[2]) / 100 })
  return {
    intent:      get('Intent'),
    confidence:  confMatch   ? parseFloat(confMatch[1]) / 100 : undefined,
    destination: getAfter('Destination'),
    matchConf:   confLMatch  ? confLMatch[1]                  : undefined,
    matchedQ:    md.match(/\*\*Matched Q:\*\*\s*\*?([^*\n]+)/)?.[1]?.trim(),
    method:      getAfter('Routing'),
    alts,
    raw: md,
    override: md.match(/\*\*Override:\*\*\s*`([^`]+)`/)?.[1],
  }
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0,1,2].map(i => <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-stone-300 block" />)}
    </div>
  )
}

// ── Expand toggle ─────────────────────────────────────────────────────────────
function Expandable({ label, count, items, color }: { label: string; count: number; items: string[]; color: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{count}</span>
          <span className="text-xs font-semibold text-stone-700">{label}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
      </button>
      {open && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto bg-white">
          {items.map(item => (
            <span key={item} className="text-xs font-mono bg-stone-50 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChatSection() {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [debug,     setDebug]     = useState<DebugInfo>({})
  const [rawAnswer, setRawAnswer] = useState('')
  const [hfHistory, setHfHistory] = useState<{role:string;content:string}[]>([])
  const [tab,       setTab]       = useState<'debug'|'resources'|'info'>('info')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (messages.length > 0 || loading)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history: hfHistory }),
      })
      const data = await res.json()
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error }])
      } else {
        const newHistory: {role:string;content:string}[] = data.history ?? []
        const lastMsg = [...newHistory].reverse().find(m => m.role === 'assistant')
        const answer  = lastMsg?.content ?? 'No response.'
        setHfHistory(newHistory)
        setMessages(prev => [...prev, { role: 'assistant', content: answer }])
        setDebug(parseDebug(data.debug ?? ''))
        setRawAnswer(data.rawAnswer ?? '')
        setTab('debug')
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach the server. Please try again.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, hfHistory])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const reset = () => {
    setMessages([]); setHfHistory([]); setDebug({}); setRawAnswer(''); setInput('')
    setTab('info'); inputRef.current?.focus()
  }

  const hasDebug = !!debug.intent

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-64px)] p-4 max-w-[1400px] mx-auto">

      {/* ── Chat panel ── */}
      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">

        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-dot" />
            <span className="text-sm font-semibold text-stone-800">TourBot</span>
            <span className="text-xs text-stone-400 font-mono hidden sm:inline">Assam Tourism Assistant</span>
          </div>
          <button onClick={reset} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all" title="Clear chat">
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
              <p className="text-stone-600 text-sm font-semibold mb-1">Ask anything about Assam tourism</p>
              <p className="text-stone-400 text-xs mb-6">in Assamese, English, or code-mixed</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => sendMessage(ex)}
                    className="text-xs bg-stone-50 border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all font-mono">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`msg-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-stone-900 text-white rounded-br-md'
                  : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-bl-md'}`}>
                {msg.content}
                {msg.role === 'assistant' && msg.content.includes("I am not sure I understood") && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200">
                    <p className="text-xs text-stone-400 mb-2">Try one of these:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EXAMPLES.map(ex => (
                        <button key={ex} onClick={() => sendMessage(ex)}
                          className="text-xs font-mono bg-white border border-stone-200 text-stone-500 px-2.5 py-1 rounded-full hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all">
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
        <div className="border-t border-stone-100 px-4 py-3">
          <div className="flex items-end gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="e.g. Kaziranga t hotel r daam kiman?"
              rows={1}
              style={{ color: '#1c1917', WebkitTextFillColor: '#1c1917' }}
              className="flex-1 bg-stone-50 resize-none text-sm placeholder:text-stone-400 outline-none font-body max-h-32 overflow-y-auto" />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center transition-all hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed">
              <Send size={14} />
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-1.5 text-center">
            Press <kbd className="font-mono bg-stone-100 px-1 rounded text-stone-500">Enter</kbd> to send
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-80 xl:w-88 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

        {/* Tab bar */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-stone-100">
            {(['debug','resources','info'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors
                  ${tab === t ? 'text-amber-700 bg-amber-50 border-b-2 border-amber-500' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* ── Debug tab ── */}
          {tab === 'debug' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={13} className="text-teal-600" />
                <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Pipeline Debug</span>
              </div>
              {hasDebug ? (
                <div className="space-y-3">
                  {(debug.intent || debug.override) && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Intent</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded font-mono flex-1 truncate">
                          {debug.override ?? debug.intent}
                        </code>
                        {debug.confidence !== undefined && (
                          <span className="text-xs font-semibold text-stone-600 flex-shrink-0">{(debug.confidence * 100).toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                  )}
                  {debug.method && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Routing</p>
                      <span className="text-xs bg-stone-50 border border-stone-200 text-stone-600 px-2 py-1 rounded font-medium">
                        {debug.method.includes('Direct')        ? '✓ Raced · Primary won'  :
                         debug.method.includes('Race corrected') ? '⇄ Raced · Alt won'       :
                         debug.method.includes('Cross-intent')   ? '↻ Cross-intent search'   :
                         debug.method}
                      </span>
                    </div>
                  )}
                  {debug.matchedQ && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-1">Matched Q</p>
                      <p className="text-xs text-stone-500 italic leading-relaxed bg-stone-50 px-2 py-1.5 rounded border border-stone-100">{debug.matchedQ}</p>
                    </div>
                  )}
                  {(debug.alts?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-stone-400 font-mono mb-2">Alternatives</p>
                      <div className="space-y-1">
                        {debug.alts!.map((a, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <code className="text-xs text-stone-500 font-mono truncate flex-1">{a.intent}</code>
                            <span className="text-xs text-stone-400 flex-shrink-0">{(a.confidence * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Zap size={18} className="mx-auto mb-2 text-stone-300" />
                  <p className="text-xs text-stone-400">Pipeline analysis will appear here after your first query.</p>
                </div>
              )}

              {/* Raw vs Polished */}
              {rawAnswer && (
                <div className="border-t border-stone-100 pt-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Database size={12} className="text-blue-500" />
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Raw Retrieval</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed bg-stone-50 px-2 py-1.5 rounded border border-stone-100">{rawAnswer}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={12} className="text-amber-500" />
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">LLM Polished</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed bg-stone-50 px-2 py-1.5 rounded border border-stone-100">
                      {[...messages].reverse().find(m => m.role === 'assistant')?.content ?? ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Resources tab ── */}
          {tab === 'resources' && (
            <div className="p-4 space-y-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">HF Models &amp; Data</p>
              <div className="space-y-2">
                {RESOURCES.map(r => (
                  <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-2.5 rounded-xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50 transition-all group">
                    <div className="flex-shrink-0 mt-0.5">
                      {r.badge === 'Code'
                        ? <GitBranch size={14} className="text-stone-400 group-hover:text-amber-600 transition-colors" />
                        : <ExternalLink size={14} className="text-stone-400 group-hover:text-amber-600 transition-colors" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-stone-700 group-hover:text-amber-700 transition-colors">{r.label}</span>
                        <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-mono">{r.badge}</span>
                      </div>
                      <code className="text-xs text-stone-400 font-mono truncate block">{r.path}</code>
                    </div>
                  </a>
                ))}
              </div>
              <div className="pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-400 font-mono">Base encoder: google/muril-base-cased</p>
                <p className="text-xs text-stone-400 font-mono mt-1">Framework: PyTorch · Gradio · Next.js</p>
              </div>
            </div>
          )}

          {/* ── Info tab ── */}
          {tab === 'info' && (
            <div className="p-4 space-y-4">

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['97.89%', 'Intent Accuracy'],
                  ['0.9787',  'Macro-F1'],
                  ['221,799', 'Q&A Pairs'],
                  ['100%',    'Recall@1'],
                ].map(([v, l]) => (
                  <div key={l} className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <p className="text-sm font-bold text-amber-900">{v}</p>
                    <p className="text-xs text-amber-600 font-mono">{l}</p>
                  </div>
                ))}
              </div>

              {/* Expandable reveals */}
              <Expandable label="Intents"      count={44} items={INTENTS}       color="bg-teal-100 text-teal-700" />
              <Expandable label="Destinations" count={51} items={DESTINATIONS}  color="bg-amber-100 text-amber-700" />


              {/* HF Space quick link */}
              <a href="https://huggingface.co/spaces/rajk12/assamese-tourism-chatbot"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 w-full justify-center py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors">
                <ExternalLink size={12} />
                Open on HF Space
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
