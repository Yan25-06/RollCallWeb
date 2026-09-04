import { clsx } from 'clsx'
import { Calendar, ChevronRight, Star, Trash2 } from 'lucide-react'
import { POSITIVE_TAGS } from './QuickTagEditor'

const fmtDate = (dateStr) => {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

const ScoreBadge = ({ label, score, maxScore = 9 }) => {
  if (score == null) return null
  const pct = (score / maxScore) * 100
  const color = pct >= 70 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', color)}>
      {label} {score}
    </span>
  )
}

export const ReviewHistory = ({ reviews = [], skillConfig = [], onEdit, onDelete }) => {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-8 flex flex-col items-center justify-center gap-3 text-center">
        <Star size={28} className="text-navy-200" />
        <div>
          <p className="font-semibold text-navy-600">Chưa có nhận xét nào</p>
          <p className="text-sm text-navy-400 mt-0.5">Thêm đánh giá để bắt đầu theo dõi tiến bộ</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-navy-50">
        <p className="text-sm font-semibold text-navy-800">Lịch sử đánh giá</p>
        <p className="text-xs text-navy-400">{reviews.length} đợt đánh giá</p>
      </div>

      <div className="divide-y divide-navy-50">
        {reviews.map(rev => {
          const positiveTags = (rev.tags ?? []).filter(t => POSITIVE_TAGS.includes(t))
          const improveTags  = (rev.tags ?? []).filter(t => !POSITIVE_TAGS.includes(t))

          return (
            <div
              key={rev.id}
              className="group px-4 py-3 hover:bg-navy-50/50 transition-colors cursor-pointer"
              onClick={() => onEdit?.(rev)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Date */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={13} className="text-navy-400 shrink-0" />
                    <span className="text-sm font-semibold text-navy-800">{fmtDate(rev.date)}</span>
                  </div>

                  {/* Skill scores */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {skillConfig.map(skill =>
                      rev.scores?.[skill.name] != null
                        ? <ScoreBadge key={skill.name} label={skill.name} score={rev.scores[skill.name]} maxScore={rev.scoreMax?.[skill.name] ?? 9} />
                        : null
                    )}
                  </div>

                  {/* Tags */}
                  {rev.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {positiveTags.map(t => (
                        <span key={t} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                      {improveTags.map(t => (
                        <span key={t} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Remark snippet */}
                  {rev.remark && (
                    <p className="text-xs text-navy-500 line-clamp-1">{rev.remark}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {onDelete && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onDelete(rev) }}
                      className="p-1 text-navy-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Xóa đánh giá"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <ChevronRight size={16} className="text-navy-300 group-hover:text-navy-600 transition-colors" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
