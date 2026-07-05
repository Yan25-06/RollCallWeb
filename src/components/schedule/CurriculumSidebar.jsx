import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useArmedDelete } from './useArmedDelete'

/** Gom buổi theo tuần, giữ thứ tự session_no đã sort từ service. */
const groupByWeek = (sessions) => {
  const map = new Map()
  for (const s of sessions) {
    const key = s.weekNo ?? '—'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return [...map.entries()]  // [[weekNo|'—', sessions[]]]
}

/** Nhãn 1 dòng cho buổi ở sidebar: dòng đầu của content, fallback skill. */
const sessionLabel = (s) =>
  (s.content || '').split('\n')[0].trim() || s.skill || '(chưa có nội dung)'

/**
 * CurriculumSidebar — cây điều hướng Tháng → Tuần → Buổi (không hiện tài liệu).
 * Container nên render với key={courseType} để reset trạng thái đóng/mở khi đổi giáo trình.
 */
export const CurriculumSidebar = ({
  tree, selectedSessionId, isAdmin,
  onSelectSession, onAddSession, onEditMonth, onDeleteMonth,
}) => {
  // Mặc định: tháng đầu (index 0) mở, còn lại đóng. `toggled` chứa id các tháng bị lật khỏi mặc định.
  const [toggled, setToggled] = useState(() => new Set())
  const isCollapsed = (monthId, idx) => (toggled.has(monthId) ? idx === 0 : idx !== 0)
  const toggle = (monthId) => setToggled(prev => {
    const next = new Set(prev)
    next.has(monthId) ? next.delete(monthId) : next.add(monthId)
    return next
  })

  const monthDel = useArmedDelete()

  return (
    <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-2 flex flex-col gap-1.5">
      {tree.map((month, idx) => {
        const collapsed = isCollapsed(month.id, idx)
        const armed = monthDel.armedId === month.id
        return (
          <div key={month.id}>
            {/* Header tháng */}
            <div
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-navy-900 to-navy-800 px-2.5 py-2 text-white cursor-pointer select-none"
              onClick={() => toggle(month.id)}
            >
              {collapsed ? <ChevronRight size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
              <span className="text-sm font-bold min-w-0 truncate">
                Tháng {month.monthNo}{month.title ? ` · ${month.title}` : ''}
              </span>
              <span className="ml-auto text-[11px] text-navy-300 shrink-0">{month.sessions.length} buổi</span>
              {isAdmin && (
                <span className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onAddSession(month.id)} className="p-1 rounded-md text-navy-300 hover:text-white hover:bg-white/10 transition-colors" title="Thêm buổi">
                    <Plus size={13} />
                  </button>
                  <button onClick={() => onEditMonth(month)} className="p-1 rounded-md text-navy-300 hover:text-white hover:bg-white/10 transition-colors" title="Sửa tháng">
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => monthDel.fire(month.id, () => onDeleteMonth(month.id))}
                    className={clsx(
                      'p-1 rounded-md transition-colors',
                      armed ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-300 hover:text-red-300 hover:bg-white/10'
                    )}
                    title={armed ? 'Xác nhận xóa? Bấm lại để xóa cả tháng (kèm buổi + tài liệu)' : 'Xóa tháng'}
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              )}
            </div>

            {/* Danh sách buổi theo tuần */}
            {!collapsed && (
              <div className="flex flex-col gap-0.5 py-1.5 pl-2">
                {month.sessions.length === 0 ? (
                  <p className="text-xs text-navy-400 px-2 py-1.5">Chưa có buổi nào.</p>
                ) : groupByWeek(month.sessions).map(([weekKey, sessions]) => (
                  <div key={weekKey} className="flex flex-col gap-0.5">
                    {weekKey !== '—' && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-500 px-2 pt-1.5">Tuần {weekKey}</p>
                    )}
                    {sessions.map(s => {
                      const active = s.id === selectedSessionId
                      return (
                        <button
                          key={s.id}
                          onClick={() => onSelectSession(s.id)}
                          className={clsx(
                            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors border-l-[3px]',
                            active
                              ? 'bg-navy-50 border-navy-800'
                              : 'border-transparent hover:bg-navy-50/60'
                          )}
                        >
                          <span className={clsx(
                            'text-[11px] font-semibold px-1.5 py-0.5 rounded shrink-0',
                            active ? 'bg-navy-800 text-white' : 'bg-navy-50 text-navy-700'
                          )}>
                            B{s.sessionNo}
                          </span>
                          <span className={clsx(
                            'text-xs min-w-0 truncate',
                            active ? 'font-semibold text-navy-900' : 'text-navy-500'
                          )}>
                            {sessionLabel(s)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
