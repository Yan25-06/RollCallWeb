import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

// Bắt cờ invite/recovery NGAY lúc module load, trước khi Supabase xóa hash khỏi URL.
const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
const INVITE_FLOW = initialHash.includes('type=invite') || initialHash.includes('type=recovery')

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(INVITE_FLOW)

  // 1. Khôi phục session + lắng nghe thay đổi.
  //    KHÔNG gọi supabase (await) trong callback này — sẽ deadlock với auth lock.
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  // 2. Nạp profile teacher mỗi khi user đổi — chạy NGOÀI auth lock nên an toàn.
  useEffect(() => {
    const uid = user?.id
    if (!uid) { setTeacher(null); return }
    let active = true
    supabase
      .from('teachers')
      .select('*')
      .eq('id', uid)
      .single()
      .then(({ data }) => { if (active) setTeacher(data ?? null) })
    return () => { active = false }
  }, [user?.id])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // Gửi email khôi phục mật khẩu. redirectTo trỏ về app để mở luồng recovery
  // (useAuth bắt cờ type=recovery ngay khi module load → SetPasswordPage).
  async function requestPasswordReset(email) {
    const redirectTo = window.location.origin + import.meta.env.BASE_URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setTeacher(null)
  }

  // Cập nhật tên hiển thị (teachers.name) từ trang Cài đặt + refresh state teacher tại chỗ.
  async function updateTeacherName(name) {
    const uid = user?.id
    if (!uid) throw new Error('Chưa đăng nhập')
    const { error } = await supabase.from('teachers').update({ name }).eq('id', uid)
    if (error) throw new Error(error.message)
    const { data } = await supabase.from('teachers').select('*').eq('id', uid).single()
    setTeacher(data ?? null)
  }

  // Gọi sau khi đặt mật khẩu xong: lưu tên, tắt cờ invite + dọn hash khỏi URL.
  async function completePasswordSetup(name) {
    const uid = (await supabase.auth.getUser()).data?.user?.id
    if (uid && name) {
      await supabase.from('teachers').update({ name }).eq('id', uid)
      // Refresh teacher profile in state — safe to await here (outside onAuthStateChange).
      const { data } = await supabase.from('teachers').select('*').eq('id', uid).single()
      setTeacher(data ?? null)
    }
    setNeedsPassword(false)
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  return (
    <AuthContext.Provider value={{ user, teacher, loading, needsPassword, login, logout, completePasswordSetup, updateTeacherName, requestPasswordReset }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
