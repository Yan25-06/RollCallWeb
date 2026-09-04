import { useState, useMemo, useEffect } from 'react'
import { clsx } from 'clsx'
import { Search, UserCircle } from 'lucide-react'
import { useDebounce } from '@/utils/useDebounce'

/**
 * ReviewSelector — class pills + student list with search
 * @param {Array}    classes         - all class objects
 * @param {Array}    students        - all student objects
 * @param {Map}      enrollmentMap   - Map<classId, enrolledStudentId[]>
 * @param {string}   selectedClassId
 * @param {string}   selectedStudentId
 * @param {Function} onSelectClass
 * @param {Function} onSelectStudent
 */
export const ReviewSelector = ({
  classes = [], students = [], enrollmentMap = new Map(),
  selectedClassId, selectedStudentId,
  onSelectClass, onSelectStudent,
}) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)

  // Reset search whenever the class changes
  useEffect(() => { setSearch('') }, [selectedClassId])

  // Students in selected class (active enrolled)
  const classStudentIds = selectedClassId ? (enrollmentMap.get(selectedClassId) ?? []) : []
  const classStudents   = students.filter(s => classStudentIds.includes(s.id))

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return classStudents
    return classStudents.filter(s => s.name.toLowerCase().includes(q))
  }, [classStudents, debouncedSearch])

  return (
    <div className="flex flex-col gap-4">
      {/* Class pills */}
      <div>
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Chọn lớp</p>
        <div className="flex flex-wrap gap-2">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => { onSelectClass?.(cls.id); onSelectStudent?.(null) }}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
                selectedClassId === cls.id
                  ? 'bg-navy-800 text-white border-navy-800 shadow-sm'
                  : 'bg-white text-navy-600 border-navy-200 hover:border-navy-400 hover:text-navy-800'
              )}
            >
              {cls.name}
            </button>
          ))}
        </div>
      </div>

      {/* Student list */}
      {selectedClassId && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Chọn học viên</p>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              className="input pl-8 text-sm"
              placeholder="Tìm tên học viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Student list */}
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-navy-400 text-center py-4">Không tìm thấy học viên</p>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectStudent?.(s.id)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border',
                    selectedStudentId === s.id
                      ? 'bg-navy-800 text-white border-navy-800'
                      : 'bg-white text-navy-700 border-navy-100 hover:border-navy-300 hover:bg-navy-50'
                  )}
                >
                  <UserCircle size={20} className={selectedStudentId === s.id ? 'text-white/70' : 'text-navy-300'} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    {s.grade && <p className={clsx('text-xs', selectedStudentId === s.id ? 'text-white/60' : 'text-navy-400')}>{s.grade}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
