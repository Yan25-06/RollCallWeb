import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge } from '@/components/ui'
import { getInitials } from '@/utils/helpers'

const FILTER_TABS = [
  { id: 'all',     label: 'Tất cả' },
  { id: 'active',  label: 'Đang học' },
  { id: 'paused',  label: 'Tạm ngưng' },
  { id: 'dropped', label: 'Đã nghỉ' },
]

const STATUS_CONFIG = {
  active:  { label: 'Đang học',  variant: 'success' },
  paused:  { label: 'Tạm ngưng', variant: 'warning' },
  dropped: { label: 'Đã nghỉ',   variant: 'gray'    },
}

export const StudentSidebar = ({
  enrollments = [],
  students = [],
  activeId,
  onSelect,
  onAddStudent,
  onCreateStudent,
  isAdmin = false,
}) => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Debounce search 200ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(timer)
  }, [search])

  // Merge enrollment + student info
  const merged = useMemo(() => {
    return enrollments.map(e => {
      const student = students.find(s => s.id === e.studentId)
      return student ? { ...e, student } : null
    }).filter(Boolean)
  }, [enrollments, students])

  // Counts per status
  const counts = useMemo(() => ({
    all:     merged.length,
    active:  merged.filter(e => e.status === 'active').length,
    paused:  merged.filter(e => e.status === 'paused').length,
    dropped: merged.filter(e => e.status === 'dropped').length,
  }), [merged])

  // Filtered list
  const filtered = useMemo(() => {
    return merged.filter(e => {
      const matchStatus = filterStatus === 'all' || e.status === filterStatus
      const matchSearch = !debouncedSearch ||
        e.student.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [merged, filterStatus, debouncedSearch])

  return (
    <div className="flex flex-col h-full bg-white border border-navy-100 rounded-2xl overflow-hidden shadow-navy-sm">
      {/* Sidebar header */}
      <div className="px-4 pt-4 pb-3 border-b border-navy-50">
        {/* Tiêu đề chiếm trọn một hàng — trước đây bị 2 nút chen chỗ nên gãy xuống 2 dòng */}
        <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-800 mb-2.5">
          <Users size={14} className="shrink-0 text-navy-500" />
          Danh sách học viên
        </span>
        <div className="flex items-center gap-1.5 mb-3">
          <button
            id="add-student-btn"
            onClick={onAddStudent}
            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-navy-800 text-white text-xs font-medium rounded-lg hover:bg-navy-700 transition-colors whitespace-nowrap"
          >
            <Plus size={12} className="shrink-0" />
            Thêm
          </button>
          {isAdmin && (
            <button
              id="create-student-btn"
              onClick={onCreateStudent}
              className="flex-1 px-2.5 py-1.5 border border-navy-200 text-navy-600 text-xs font-medium rounded-lg hover:bg-navy-50 transition-colors whitespace-nowrap"
            >
              Tạo mới
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300 pointer-events-none" />
          <input
            id="student-search-input"
            type="text"
            placeholder="Tìm học viên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-navy-200 rounded-xl bg-navy-50/50
              focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-100 transition-all
              placeholder:text-navy-300 text-navy-800"
          />
        </div>

        {/* Filter tabs */}
        {/* Lưới 2 cột: 4 chip xếp một hàng làm nhãn "Tạm ngừng" gãy đôi ở bề ngang sidebar */}
        <div className="grid grid-cols-2 gap-1 mt-3">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={clsx(
                'py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap',
                filterStatus === tab.id
                  ? 'bg-navy-800 text-white'
                  : 'text-navy-500 hover:text-navy-700 hover:bg-navy-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Count summary */}
        <div className="flex items-center gap-2 mt-2 text-xs text-navy-400">
          {/* Con số trần không nói lên gì — thêm tooltip cho từng trạng thái */}
          <span className="text-emerald-600 font-semibold" title="Đang học">{counts.active}</span>
          <span>·</span>
          <span className="text-amber-600 font-semibold" title="Tạm ngừng">{counts.paused}</span>
          <span>·</span>
          <span className="text-gray-500 font-semibold" title="Đã nghỉ">{counts.dropped}</span>
          <span className="ml-auto">{filtered.length} kết quả</span>
        </div>
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
            <Users size={28} className="text-navy-200" />
            <p className="text-sm text-navy-400">
              {debouncedSearch ? `Không tìm thấy "${debouncedSearch}"` : 'Không có học viên nào'}
            </p>
          </div>
        ) : (
          filtered.map(e => {
            const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.active
            const isActive = e.student.id === activeId
            const initials = getInitials(e.student.name)
            const isDimmed = e.status === 'paused' || e.status === 'dropped'

            return (
              <button
                key={e.student.id}
                id={`student-row-${e.student.id}`}
                onClick={() => onSelect(e.student.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-navy-50 last:border-0',
                  isActive
                    ? 'bg-navy-50 border-l-2 border-l-navy-800'
                    : 'hover:bg-navy-50/50 border-l-2 border-l-transparent',
                  isDimmed && 'opacity-60',
                )}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-navy-800 text-white text-xs font-bold
                  flex items-center justify-center shrink-0 select-none">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-sm font-medium truncate',
                    isActive ? 'text-navy-900' : 'text-navy-800'
                  )}>
                    {e.student.name}
                  </p>
                  <p className="text-xs text-navy-400 truncate">{e.student.phone || 'Chưa có SĐT'}</p>
                </div>

                {/* Status badge */}
                <Badge variant={cfg.variant} className="shrink-0 text-[10px]">
                  {cfg.label}
                </Badge>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
