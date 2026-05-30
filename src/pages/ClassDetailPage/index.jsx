import { useState, useEffect } from 'react'
import { ChevronLeft, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { getClasses, getEnrollmentsByClass } from '@/store/db'
import { StudentsTab } from './tabs/StudentsTab'
import { AttendanceTab } from './tabs/AttendanceTab'
import { HomeworkTab } from './tabs/HomeworkTab'
import { MockTestTab } from './tabs/MockTestTab'

const TABS = [
  { id: 'students',    label: 'Học Viên',  disabled: false },
  { id: 'attendance',  label: 'Điểm Danh', disabled: false },
  { id: 'assignments', label: 'Bài Tập',   disabled: false },
  { id: 'mocktest',    label: 'Mock Test',  disabled: false },
]

export const ClassDetailPage = ({ classId, onBack }) => {
  const [activeTab, setActiveTab] = useState('students')
  const [currentClass, setCurrentClass] = useState(null)
  const [studentCount, setStudentCount] = useState(0)

  const loadHeader = () => {
    const classes = getClasses()
    const cls = classes.find(c => c.id === classId)
    setCurrentClass(cls)
    const enrollments = getEnrollmentsByClass(classId)
    setStudentCount(enrollments.filter(e => e.status === 'active').length)
  }

  useEffect(() => {
    loadHeader()
  }, [classId])

  if (!currentClass) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="text-navy-300 mb-2">
          <Users size={48} />
        </div>
        <p className="text-navy-600 font-medium">Không tìm thấy lớp học</p>
        <p className="text-sm text-navy-400 max-w-sm">
          Lớp học này có thể đã bị xóa hoặc không tồn tại.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-navy-50 text-navy-700 hover:bg-navy-100 font-medium rounded-xl flex items-center gap-2 transition-colors"
        >
          <ChevronLeft size={18} /> Quay lại danh sách lớp
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 animate-fade-in min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors"
          title="Quay lại"
          aria-label="Quay lại"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-bold text-navy-900 leading-tight">{currentClass.name}</h1>
          <p className="text-xs text-navy-400 mt-0.5">
            {currentClass.scheduleDays} · {currentClass.scheduleTime}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-50 rounded-xl border border-navy-100">
          <Users size={14} className="text-navy-500" />
          <span className="text-sm font-semibold text-navy-800">{studentCount}</span>
          <span className="text-xs text-navy-400">HS</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-navy-100 overflow-x-auto scrollbar-hide mb-0 -mx-0">
        {TABS.map(tab => (
          <div key={tab.id} className="relative group">
            <button
              disabled={tab.disabled}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              className={clsx(
                'pb-3 px-3 text-sm font-medium transition-colors relative whitespace-nowrap',
                tab.disabled
                  ? 'text-navy-300 cursor-not-allowed'
                  : activeTab === tab.id
                    ? 'text-navy-800'
                    : 'text-navy-400 hover:text-navy-700'
              )}
            >
              {tab.label}
              {!tab.disabled && activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-navy-800 rounded-t-full" />
              )}
            </button>
            {/* Tooltip for disabled tabs */}
            {tab.disabled && tab.tooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-navy-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {tab.tooltip}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 pt-5">
        {activeTab === 'students' && (
          <StudentsTab classId={classId} onEnrollmentChange={loadHeader} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab classId={classId} />
        )}
        {activeTab === 'assignments' && (
          <HomeworkTab classId={classId} />
        )}
        {activeTab === 'mocktest' && (
          <MockTestTab classId={classId} className={currentClass?.name ?? ''} />
        )}
      </div>
    </div>
  )
}
