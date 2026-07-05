import { Plus, Pencil, Trash2, ExternalLink, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Empty } from '@/components/ui'
import { getMaterialType } from './materialType'
import { useArmedDelete } from './useArmedDelete'

/**
 * SessionDetailPanel — chi tiết buổi đang chọn + danh sách tài liệu.
 * @param {{session: Object, month: Object}|null} selected
 */
export const SessionDetailPanel = ({
  selected, isAdmin,
  onEditSession, onDeleteSession, onAddMaterial, onEditMaterial, onDeleteMaterial,
}) => {
  const sessionDel = useArmedDelete()
  const materialDel = useArmedDelete()

  if (!selected) {
    return (
      <div className="flex-1 w-full bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12">
        <Empty
          icon={<FileText size={40} />}
          title="Chưa chọn buổi"
          desc="Chọn một buổi ở danh sách bên trái để xem nội dung và tài liệu."
        />
      </div>
    )
  }

  const { session, month } = selected
  const [titleLine, ...restLines] = (session.content || '').split('\n')
  const rest = restLines.join('\n').trim()
  const sessionArmed = sessionDel.armedId === session.id

  return (
    <div className="flex-1 w-full min-w-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4 sm:p-5">
      {/* Header buổi */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-navy-800 text-white shrink-0">Buổi {session.sessionNo}</span>
        {session.skill && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 shrink-0">{session.skill}</span>
        )}
        <span className="text-xs text-navy-500">
          Tháng {month.monthNo}{session.weekNo ? ` · Tuần ${session.weekNo}` : ''}
        </span>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button onClick={() => onEditSession(session)} className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors" title="Sửa buổi">
              <Pencil size={14} />
            </button>
            <button
              onClick={() => sessionDel.fire(session.id, () => onDeleteSession(session))}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                sessionArmed ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-400 hover:text-red-600 hover:bg-red-50'
              )}
              title={sessionArmed ? 'Xác nhận xóa? Bấm lại để xóa buổi (kèm tài liệu)' : 'Xóa buổi'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Nội dung + ghi chú */}
      <h3 className="text-lg font-bold text-navy-900 mt-3">{titleLine.trim() || '(chưa có nội dung)'}</h3>
      {rest && <p className="text-sm text-navy-700 mt-1 whitespace-pre-wrap">{rest}</p>}
      {session.note && <p className="text-xs text-navy-500 italic mt-1.5">Ghi chú: {session.note}</p>}

      {/* Mục tài liệu */}
      <div className="flex items-center gap-3 mt-5 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-500 shrink-0">
          Tài liệu · {session.materials.length}
        </span>
        <div className="flex-1 h-px bg-navy-100" />
        {isAdmin && (
          <Button variant="secondary" size="sm" onClick={() => onAddMaterial(session)} className="flex items-center gap-1 shrink-0">
            <Plus size={13} /> Thêm tài liệu
          </Button>
        )}
      </div>

      {session.materials.length === 0 ? (
        <p className="text-sm text-navy-500 text-center py-6">Chưa có tài liệu cho buổi này.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {session.materials.map(m => {
            const t = getMaterialType(m.type)
            const armed = materialDel.armedId === m.id
            const inner = (
              <>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-md shrink-0', t.badge)}>{t.label}</span>
                <span className="text-sm font-medium text-navy-900 min-w-0 truncate">{m.title}</span>
                {m.url && <ExternalLink size={13} className="shrink-0 text-navy-400" />}
              </>
            )
            return (
              <li
                key={m.id}
                className={clsx(
                  'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors',
                  m.url ? 'border-navy-100 hover:border-navy-300 hover:bg-navy-50/50' : 'border-navy-100'
                )}
              >
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center gap-2 min-w-0">
                    {inner}
                  </a>
                ) : (
                  <div className="flex flex-1 items-center gap-2 min-w-0">{inner}</div>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => onEditMaterial(m)} className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors" title="Sửa">
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => materialDel.fire(m.id, () => onDeleteMaterial(m))}
                      className={clsx(
                        'p-1 rounded-lg transition-colors',
                        armed ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-400 hover:text-red-600 hover:bg-red-50'
                      )}
                      title={armed ? 'Xác nhận xóa?' : 'Xóa'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
