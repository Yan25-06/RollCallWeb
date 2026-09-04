import { clsx } from 'clsx'
import {
  LayoutDashboard, BookOpen,
  Calendar, Users, Settings, Menu, X,
  GraduationCap, BarChart2, LogOut, Shield, UserRound,
} from 'lucide-react'
import logoWhite from '/logo-horizontal-white.png'
import { useState } from 'react'
import { toast } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'classes', label: 'Lớp học', icon: Users },
  { id: 'students', label: 'Học viên', icon: UserRound },
  { id: 'fees', label: 'Học phí', icon: BookOpen },
  { id: 'reports', label: 'Báo cáo', icon: BarChart2 },
  { id: 'reviews', label: 'Nhận xét', icon: GraduationCap },
  { id: 'schedule', label: 'Giảng dạy', icon: Calendar },
]

export const Navbar = ({ activePage, onNavigate, centerName }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, teacher, logout } = useAuth()
  const { isAdmin } = usePermissions()

  // "Học phí" chỉ hiển thị với admin
  const navItems = NAV_ITEMS.filter(item => item.id !== 'fees' || isAdmin)

  const handleLogout = async () => {
    await logout()
    toast.success('Đã đăng xuất!')
  }

  return (
    <>
      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden lg:flex flex-col w-1/5 shrink-0 bg-navy-900 h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-8 py-5 border-b border-navy-800">
          <button onClick={() => onNavigate('dashboard')} className="block w-full">
            <img src={logoWhite} alt="Anh Ngữ Ms.Phương" className="w-auto h-15" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left',
                activePage === id
                  ? 'bg-white/15 text-white'
                  : 'text-navy-300 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left border-t border-navy-700 mt-1 pt-4',
                activePage === 'admin'
                  ? 'bg-white/15 text-white'
                  : 'text-navy-300 hover:bg-white/8 hover:text-white'
              )}
            >
              <Shield size={17} />
              Admin
            </button>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-navy-800 flex flex-col gap-1">
          {/* User info */}
          {user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium text-white truncate">{teacher?.name || user.email}</p>
              {teacher?.name && <p className="text-xs text-navy-300 truncate">{user.email}</p>}
            </div>
          )}
          <button
            onClick={() => onNavigate('settings')}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full',
              activePage === 'settings'
                ? 'bg-white/15 text-white'
                : 'text-navy-300 hover:text-white hover:bg-white/8'
            )}
          >
            <Settings size={16} />
            Cài đặt
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-300 hover:text-red-400 hover:bg-white/8 transition-all duration-200 w-full"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ─── Mobile top bar ─── */}
      <header className="lg:hidden bg-navy-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-navy">
        <button onClick={() => onNavigate('dashboard')}>
          <img src={logoWhite} alt="Anh Ngữ Ms.Phương" className="h-8 w-auto object-contain" />
        </button>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" />
          <div
            className="absolute top-0 left-0 w-64 h-full bg-navy-900 flex flex-col shadow-navy-xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-6 border-b border-navy-800 flex items-center justify-between">
              <button onClick={() => { onNavigate('dashboard'); setMenuOpen(false) }}>
                <img src={logoWhite} alt="Anh Ngữ Ms.Phương" className="h-10 w-auto object-contain brightness-0 invert" />
              </button>
              <button onClick={() => setMenuOpen(false)} className="text-navy-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
              {[...navItems, ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []), { id: 'settings', label: 'Cài đặt', icon: Settings }].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { onNavigate(id); setMenuOpen(false) }}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all w-full text-left',
                    activePage === id ? 'bg-white/15 text-white' : 'text-navy-300 hover:bg-white/8 hover:text-white'
                  )}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
              <button
                onClick={() => { handleLogout(); setMenuOpen(false) }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-navy-300 hover:text-red-400 hover:bg-white/8 transition-all w-full text-left"
              >
                <LogOut size={17} />
                Đăng xuất
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-navy-100 flex">
        {navItems.slice(0, 5).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              activePage === id ? 'text-navy-800' : 'text-navy-400'
            )}
          >
            <Icon size={19} strokeWidth={activePage === id ? 2.2 : 1.8} />
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
