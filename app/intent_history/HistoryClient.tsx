'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LogRow } from '@/lib/firestoreLog'

type Stats = { total: number; labelled: number; correct: number; lowperf: number; wrong: number; unsure: number }

function computeStats(rows: LogRow[]): Stats {
  const labelled = rows.filter(r => r.verdict)
  return {
    total:    rows.length,
    labelled: labelled.length,
    correct:  labelled.filter(r => r.verdict === 'Correct').length,
    lowperf:  labelled.filter(r => r.verdict === 'Low Conf').length,
    wrong:    labelled.filter(r => r.verdict === 'Wrong').length,
    unsure:   labelled.filter(r => r.verdict === 'Unsure').length,
  }
}

const VERDICT_STYLE: Record<string, string> = {
  'Correct':  'text-teal-600 font-semibold',
  'Low Conf': 'text-blue-600 font-semibold',
  'Wrong':    'text-red-600 font-semibold',
  'Unsure':   'text-amber-600 font-semibold',
}
const VERDICT_LABEL: Record<string, string> = {
  'Correct':  '✓ Correct',
  'Low Conf': '~ Correct / Low Conf',
  'Wrong':    '✗ Wrong',
  'Unsure':   '? Unsure',
}

export default function HistoryClient() {
  const [rows,    setRows]    = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/ood-logs')
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function setVerdict(docId: string, verdict: string) {
    const res  = await fetch('/api/ood-verdict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ doc_id: docId, verdict }),
    })
    const data = await res.json()
    if (data.ok) {
      setRows(prev => prev.map(r => r.id === docId ? { ...r, verdict } : r))
      setToast(`Saved: ${verdict}`)
      setTimeout(() => setToast(''), 2000)
    }
  }

  const stats    = computeStats(rows)
  const accuracy = stats.labelled > 0 ? Math.round(((stats.correct + stats.lowperf) / stats.labelled) * 100) : null

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-stone-900">OOD Intent Evaluation Log</h1>
            <p className="text-sm text-stone-500 mt-0.5">Mark each prediction to measure out-of-distribution accuracy</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchLogs}
              className="text-sm font-medium bg-stone-100 text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-200 transition-colors">
              ↺ Refresh
            </button>
            <a href="/api/ood-download"
              className="text-sm font-medium bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors">
              ↓ Download CSV
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
          {([
            ['Total',    stats.total,    'text-stone-700', 'border-stone-200'],
            ['Labelled', stats.labelled, 'text-stone-700', 'border-stone-200'],
            ['Correct',  stats.correct,  'text-teal-700',  'border-teal-200'],
            ['Low Conf', stats.lowperf,  'text-blue-700',  'border-blue-200'],
            ['Wrong',    stats.wrong,    'text-red-700',   'border-red-200'],
            ['Unsure',   stats.unsure,   'text-amber-700', 'border-amber-200'],
            ['Intent Acc', accuracy !== null ? `${accuracy}%` : 'N/A', 'text-stone-700', 'border-stone-200'],
          ] as const).map(([label, value, textCls, borderCls]) => (
            <div key={label} className={`bg-white border ${borderCls} rounded-xl px-4 py-3 text-center`}>
              <p className={`text-xl font-bold ${textCls}`}>{value}</p>
              <p className="text-xs text-stone-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
            <p className="text-stone-400 text-sm">Loading...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
            <p className="text-stone-400 text-sm">No queries logged yet. Send some messages in the chatbot first.</p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    {['Query','Intent','Conf','Routing','Answer Preview','Time','Verdict','Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <span className="text-stone-800 font-mono text-xs break-words">{row.query}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <code className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded whitespace-nowrap">{row.predicted_intent}</code>
                      </td>
                      <td className="px-3 py-2.5 text-stone-600 text-xs whitespace-nowrap">{row.confidence_pct}%</td>
                      <td className="px-3 py-2.5 text-stone-500 text-xs whitespace-nowrap">{row.routing_tier}</td>
                      <td className="px-3 py-2.5 max-w-[220px]">
                        <span className="text-stone-400 text-xs break-words leading-relaxed">{row.retrieved_answer_preview}</span>
                      </td>
                      <td className="px-3 py-2.5 text-stone-400 text-xs whitespace-nowrap font-mono">{row.timestamp.slice(11)}</td>
                      <td className="px-3 py-2.5 min-w-[80px]">
                        {row.verdict
                          ? <span className={`text-xs ${VERDICT_STYLE[row.verdict] ?? 'text-stone-400'}`}>{VERDICT_LABEL[row.verdict] ?? row.verdict}</span>
                          : <span className="text-stone-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {(['Correct','Low Conf','Wrong','Unsure'] as const).map(v => (
                            <button key={v} onClick={() => setVerdict(row.id, v)}
                              className={`text-xs px-2 py-1 rounded font-medium transition-colors border
                                ${v === 'Correct'  ? 'border-teal-200  text-teal-700  hover:bg-teal-50'
                                : v === 'Low Conf' ? 'border-blue-200  text-blue-700  hover:bg-blue-50'
                                : v === 'Wrong'    ? 'border-red-200   text-red-700   hover:bg-red-50'
                                :                    'border-amber-200 text-amber-700 hover:bg-amber-50'}`}>
                              {v === 'Correct' ? '✓' : v === 'Low Conf' ? '~' : v === 'Wrong' ? '✗' : '?'}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-stone-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
