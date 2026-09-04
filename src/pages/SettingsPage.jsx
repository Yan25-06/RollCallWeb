import { useState, useEffect } from 'react'
import { Pencil, Building2, User, Lock } from 'lucide-react'
import { Card, Input, Button, toast, Skeleton } from '@/components/ui'
import { settingsService } from '@/services/settingsService'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'

// ─── Section wrapper với pattern edit button ─────────────
const Section = ({ icon: Icon, title, editing, onEdit, children }) => (
  <Card className="p-6 flex flex-col gap-5">
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-semibold text-navy-800 text-sm uppercase tracking-wide">
        {Icon && <Icon size={16} className="text-navy-600" />}
        {title}
      </h2>
      {!editing && onEdit && (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onEdit}>
          <Pencil size={14} />
          Chỉnh sửa
        </Button>
      )}
    </div>
    {children}
  </Card>
)

const ReadField = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium text-navy-700">{label}</span>
    <span className="text-navy-900 font-medium">{value}</span>
  </div>
)

export const SettingsPage = () => {
  const { user, teacher, updateTeacherName } = useAuth()
  const { canManageCenterSettings } = usePermissions()

  // ─── Section Tài khoản cá nhân ─────────────────────────
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [savingName, setSavingName]   = useState(false)
  const displayName = teacher?.name || user?.email || ''

  const startEditName = () => { setNameInput(teacher?.name || ''); setEditingName(true) }
  const saveName = async () => {
    const name = nameInput.trim()
    if (!name) { toast.error('Vui lòng nhập tên hiển thị'); return }
    setSavingName(true)
    try {
      await updateTeacherName(name)
      toast.success('Đã cập nhật tên hiển thị!')
      setEditingName(false)
    } catch (err) {
      toast.error('Lỗi khi lưu: ' + err.message)
    } finally {
      setSavingName(false)
    }
  }

  // ─── Section Đổi mật khẩu ──────────────────────────────
  const emptyPw = { current: '', next: '', confirm: '' }
  const [editingPw, setEditingPw]   = useState(false)
  const [pw, setPw]                 = useState(emptyPw)
  const [savingPw, setSavingPw]     = useState(false)

  const cancelPw = () => { setPw(emptyPw); setEditingPw(false) }
  const savePassword = async () => {
    if (pw.next.length < 6) { toast.error('Mật khẩu mới tối thiểu 6 ký tự'); return }
    if (pw.next !== pw.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return }
    setSavingPw(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pw.current,
      })
      if (authError) { toast.error('Mật khẩu hiện tại không đúng'); return }
      const { error } = await supabase.auth.updateUser({ password: pw.next })
      if (error) throw new Error(error.message)
      toast.success('Đã đổi mật khẩu!')
      cancelPw()
    } catch (err) {
      toast.error('Lỗi khi đổi mật khẩu: ' + err.message)
    } finally {
      setSavingPw(false)
    }
  }

  // ─── Section Thông tin trung tâm (admin) ───────────────
  const [centerName, setCenterName]       = useState('')
  const [loadingCenter, setLoadingCenter] = useState(true)
  const [editingCenter, setEditingCenter] = useState(false)
  const [centerInput, setCenterInput]     = useState('')
  const [savingCenter, setSavingCenter]   = useState(false)

  useEffect(() => {
    if (!canManageCenterSettings) { setLoadingCenter(false); return }
    settingsService.get()
      .then(s => { setCenterName(s.centerName || ''); setLoadingCenter(false) })
      .catch(() => setLoadingCenter(false))
  }, [canManageCenterSettings])

  const startEditCenter = () => { setCenterInput(centerName); setEditingCenter(true) }
  const saveCenter = async () => {
    const name = centerInput.trim()
    if (!name) { toast.error('Vui lòng nhập tên trung tâm'); return }
    setSavingCenter(true)
    try {
      const s = await settingsService.upsert({ centerName: name })
      setCenterName(s.centerName || name)
      toast.success('Đã lưu thông tin trung tâm!')
      setEditingCenter(false)
    } catch (err) {
      toast.error('Lỗi khi lưu: ' + err.message)
    } finally {
      setSavingCenter(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Cài đặt</h1>
        <p className="text-sm text-navy-400 mt-0.5">Quản lý tài khoản và thông tin trung tâm</p>
      </div>

      {/* Tài khoản cá nhân */}
      <Section
        icon={User}
        title="Tài khoản cá nhân"
        editing={editingName}
        onEdit={startEditName}
      >
        {editingName ? (
          <>
            <Input
              label="Tên hiển thị"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
            />
            <ReadField label="Email" value={user?.email || ''} />
            <div className="flex gap-2">
              <Button variant="primary" onClick={saveName} disabled={savingName}>
                {savingName ? 'Đang lưu...' : 'Lưu'}
              </Button>
              <Button variant="secondary" onClick={() => setEditingName(false)} disabled={savingName}>
                Hủy
              </Button>
            </div>
          </>
        ) : (
          <>
            <ReadField label="Tên hiển thị" value={displayName} />
            <ReadField label="Email" value={user?.email || ''} />
          </>
        )}
      </Section>

      {/* Đổi mật khẩu */}
      <Section
        icon={Lock}
        title="Đổi Mật Khẩu"
        editing={editingPw}
        onEdit={() => setEditingPw(true)}
      >
        {editingPw ? (
          <>
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              value={pw.current}
              onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              value={pw.next}
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
              placeholder="Tối thiểu 6 ký tự"
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button variant="primary" onClick={savePassword} disabled={savingPw}>
                {savingPw ? 'Đang lưu...' : 'Lưu'}
              </Button>
              <Button variant="secondary" onClick={cancelPw} disabled={savingPw}>
                Hủy
              </Button>
            </div>
          </>
        ) : (
          <ReadField label="Mật khẩu" value="••••••••" />
        )}
      </Section>

      {/* Thông tin trung tâm (admin) */}
      {canManageCenterSettings && (
        <Section
          icon={Building2}
          title="Thông Tin Trung Tâm"
          editing={editingCenter}
          onEdit={loadingCenter ? null : startEditCenter}
        >
          {loadingCenter ? (
            <Skeleton className="h-6 w-48" />
          ) : editingCenter ? (
            <>
              <Input
                label="Tên Trung Tâm"
                value={centerInput}
                onChange={e => setCenterInput(e.target.value)}
                placeholder="VD: Anh Ngữ Ms.Phương"
              />
              <div className="flex gap-2">
                <Button variant="primary" onClick={saveCenter} disabled={savingCenter}>
                  {savingCenter ? 'Đang lưu...' : 'Lưu'}
                </Button>
                <Button variant="secondary" onClick={() => setEditingCenter(false)} disabled={savingCenter}>
                  Hủy
                </Button>
              </div>
            </>
          ) : (
            <ReadField label="Tên Trung Tâm" value={centerName} />
          )}
        </Section>
      )}
    </div>
  )
}
