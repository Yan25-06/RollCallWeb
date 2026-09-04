import { clsx } from 'clsx'
import { ThumbsUp, AlertTriangle } from 'lucide-react'

// ─── Tag config ───────────────────────────────────────────
export const POSITIVE_TAGS = [
  'Hăng hái', 'Phát âm chuẩn', 'Làm tốt bài tập', 'Hiểu bài nhanh', 'Tiến bộ rõ rệt',
]
export const IMPROVE_TAGS = [
  'Quên bài tập', 'Còn thụ động', 'Cần luyện viết thêm', 'Đến muộn', 'Chưa tập trung',
]

/**
 * Build a natural summary sentence from selected tags
 */
export const buildTagSummary = (selectedTags) => {
  if (!selectedTags?.length) return ''
  const pos  = selectedTags.filter(t => POSITIVE_TAGS.includes(t))
  const impr = selectedTags.filter(t => IMPROVE_TAGS.includes(t))
  const parts = []
  if (pos.length)  parts.push(pos.join(', ') + '.')
  if (impr.length) parts.push('Cần cố gắng: ' + impr.join(', ') + '.')
  return parts.join(' ')
}

/**
 * QuickTagEditor — pill-button tag selector
 * @param {string[]}  value    - currently selected tags
 * @param {Function}  onChange - callback(newTags: string[])
 */
export const QuickTagEditor = ({ value = [], onChange }) => {
  const toggle = (tag) => {
    const next = value.includes(tag)
      ? value.filter(t => t !== tag)
      : [...value, tag]
    onChange?.(next)
  }

  const TagPill = ({ tag, isPositive }) => {
    const active = value.includes(tag)
    return (
      <button
        type="button"
        onClick={() => toggle(tag)}
        className={clsx(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150',
          'hover:scale-105 active:scale-95',
          isPositive
            ? active
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            : active
              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
        )}
      >
        {tag}
      </button>
    )
  }

  const summary = buildTagSummary(value)

  return (
    <div className="flex flex-col gap-3">
      {/* Positive tags */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <ThumbsUp size={13} className="text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Tích cực</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POSITIVE_TAGS.map(tag => <TagPill key={tag} tag={tag} isPositive />)}
        </div>
      </div>

      {/* Improvement tags */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <AlertTriangle size={13} className="text-amber-600" />
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Cần cố gắng</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {IMPROVE_TAGS.map(tag => <TagPill key={tag} tag={tag} isPositive={false} />)}
        </div>
      </div>

      {/* Summary preview */}
      {summary && (
        <div className="bg-navy-50 border border-navy-100 rounded-xl px-3 py-2">
          <p className="text-xs text-navy-500 font-medium mb-0.5">Nhận xét tổng hợp:</p>
          <p className="text-sm text-navy-700">{summary}</p>
        </div>
      )}
    </div>
  )
}
