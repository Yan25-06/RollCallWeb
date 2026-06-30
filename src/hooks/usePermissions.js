import { useAuth } from '@/hooks/useAuth'

// Nguồn chân lý phân quyền ở client. Component KHÔNG đọc `teacher.is_admin`
// trực tiếp — gọi `usePermissions()` và dùng cờ ngữ nghĩa tương ứng.
// (RLS ở Postgres vẫn là nguồn chân lý bảo mật; hook này chỉ gating UI.)
export function usePermissions() {
  const { teacher } = useAuth()
  const isAdmin = !!teacher?.is_admin
  return {
    isAdmin,
    canViewFees: isAdmin,
    canAccessAdmin: isAdmin,
    canManageCenterSettings: isAdmin,
    canManageStudents: isAdmin,
    canCreateMockTest: isAdmin,
    canManageClasses: isAdmin,
    canFilterByTeacher: isAdmin,
    canCheckOwnAttendance: true,
    canMarkAbsent: isAdmin,
    canViewAllPayroll: isAdmin,
  }
}
