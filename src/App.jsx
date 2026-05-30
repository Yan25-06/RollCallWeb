import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { ToastContainer } from '@/components/ui'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import {
  AttendancePage, ReviewsPage,
  SchedulePage
} from '@/pages/PlaceholderPages'
import { FeesPage } from '@/pages/FeesPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ClassesOverviewPage } from '@/pages/ClassesOverviewPage'
import { ClassDetailPage } from '@/pages/ClassDetailPage'
import { getSettings, seedDemoData } from '@/store/db'
import { runMigrations } from '@/store/migrations'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

const MONTHS = ['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12']

export default function App() {
  const [page, setPage]   = useState('dashboard')
  const [year, setYear]   = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [settings, setSettingsState] = useState(getSettings())
  const [selectedClassId, setSelectedClassId] = useState(() => {
    const stored = localStorage.getItem('selectedClassId')
    return stored || null
  })

  // Run migrations then seed on first load
  useEffect(() => {
    runMigrations()
    seedDemoData()
    setSettingsState(getSettings())
  }, [])

  // Persist selectedClassId to localStorage
  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem('selectedClassId', selectedClassId)
    } else {
      localStorage.removeItem('selectedClassId')
    }
  }, [selectedClassId])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const pagesWithMonthPicker = ['dashboard', 'attendance', 'fees', 'reviews']
  const showPicker = pagesWithMonthPicker.includes(page)

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <DashboardPage year={year} month={month} onNavigate={setPage} />
      case 'attendance': return <AttendancePage year={year} month={month} />
      case 'fees':       return <FeesPage year={year} month={month} />
      case 'reports':    return <ReportsPage />
      case 'reviews':    return <ReviewsPage year={year} month={month} />
      case 'schedule':   return <SchedulePage />
      case 'classes':
        if (selectedClassId) {
          return <ClassDetailPage
            classId={selectedClassId}
            onBack={() => setSelectedClassId(null)}
          />
        }
        return <ClassesOverviewPage onSelectClass={setSelectedClassId} />
      case 'settings':   return <SettingsPage />
      default:           return <DashboardPage year={year} month={month} onNavigate={setPage} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      {/* Sidebar */}
      <Navbar
        activePage={page}
        onNavigate={setPage}
        centerName={settings.centerName}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar with month picker */}
        <div className="bg-white border-b border-navy-100 px-6 py-3 flex items-center justify-between sticky top-0 lg:top-0 z-20 shadow-navy-sm">
          <div className="flex items-center gap-3">
            {showPicker && (
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-0.5">
                  {MONTHS.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => setMonth(i + 1)}
                      className={clsx(
                        'px-2 py-1 rounded-lg text-xs font-medium transition-all hidden sm:block',
                        month === i + 1
                          ? 'bg-navy-800 text-white'
                          : 'text-navy-400 hover:text-navy-700 hover:bg-navy-50'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                  {/* Mobile: just show current month */}
                  <span className="sm:hidden text-sm font-semibold text-navy-800 px-2">
                    Tháng {month}/{year}
                  </span>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Year selector */}
          {showPicker && (
            <div className="flex items-center gap-1.5">
              {[year - 1, year, year + 1].map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    year === y
                      ? 'bg-navy-100 text-navy-800 font-semibold'
                      : 'text-navy-400 hover:bg-navy-50 hover:text-navy-700'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {renderPage()}
        </div>
      </main>

      {/* Toast */}
      <ToastContainer />
    </div>
  )
}
