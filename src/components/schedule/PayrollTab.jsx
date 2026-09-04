import { useState, useMemo, useEffect } from 'react'
import { Wallet } from 'lucide-react'
import { Empty } from '@/components/ui'
import { ExportExcelButton } from '@/components/reports/ExportExcelButton'
import { useAuth } from '@/hooks/useAuth'
import { buildPayrollRows } from '@/utils/payroll'
import { teacherAttendanceService } from '@/services/teacherAttendanceService'
import { fmtVND } from '@/utils/helpers'

const currentMonthValue = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// classes/schedule truyền từ SchedulePage (đã load). teachers chỉ có khi admin.
export const PayrollTab = ({ classes = [], schedule = [], teachers = [], isAdmin = false }) => {
  const { teacher } = useAuth()
  const [monthStr, setMonthStr] = useState(currentMonthValue())
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const [year, month] = useMemo(() => monthStr.split('-').map(Number), [monthStr])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    teacherAttendanceService.getByMonth(year, month)
      .then(rows => { if (active) setAttendance(rows) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [year, month])

  // Danh sách giáo viên dùng để tính: admin = tất cả; GV thường = chính mình.
  const [selfTeacher, setSelfTeacher] = useState(null)
  useEffect(() => {
    if (isAdmin) return
    // GV thường: dùng profile từ useAuth (có monthly_salary qua select('*')).
    if (teacher) {
      setSelfTeacher({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        sessionRate: teacher.session_rate ?? null,
      })
    }
  }, [isAdmin, teacher])

  const payrollTeachers = isAdmin ? teachers : (selfTeacher ? [selfTeacher] : [])

  const rows = useMemo(() => {
    if (payrollTeachers.length === 0) return []
    return buildPayrollRows({ year, month, teachers: payrollTeachers, classes, schedule, attendance })
  }, [year, month, payrollTeachers, classes, schedule, attendance])

  const excelColumns = [
    { key: 'name', label: 'Giáo viên' },
    { key: 'rateFmt', label: 'Đơn giá/buổi' },
    { key: 'scheduled', label: 'Buổi theo lịch' },
    { key: 'taught', label: 'Đã dạy' },
    { key: 'absent', label: 'Vắng' },
    { key: 'pending', label: 'Chưa xác nhận' },
    { key: 'subs', label: 'Dạy thay' },
    { key: 'payFmt', label: 'Thực nhận' },
  ]
  const excelRows = rows.map(r => ({
    ...r,
    pending: Math.max(0, r.scheduled - r.taught - r.absent),
    rateFmt: fmtVND(r.rate),
    payFmt: fmtVND(r.actualPay),
  }))

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-navy-800 text-base flex items-center gap-2">
          <Wallet size={16} /> Bảng lương theo tháng
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="input text-xs py-1 w-36"
            value={monthStr}
            onChange={e => setMonthStr(e.target.value)}
          />
          <ExportExcelButton
            rows={excelRows}
            columns={excelColumns}
            filename="bang-luong-giao-vien"
            disabled={rows.length === 0}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-navy-400 py-8 text-center">Đang tải...</p>
      ) : error ? (
        <p className="text-sm text-red-500 py-8 text-center">Không thể tải dữ liệu chấm công</p>
      ) : rows.length === 0 ? (
        <Empty icon={<Wallet size={40} />} title="Chưa có dữ liệu lương" desc="Chưa có giáo viên hoặc lịch dạy để tính lương." />
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-navy-100">
                <th className="py-2 pr-3 font-medium text-navy-600">Giáo viên</th>
                <th className="py-2 pr-3 font-medium text-navy-600 text-center">Buổi/lịch</th>
                <th className="py-2 pr-3 font-medium text-navy-600 text-center">Đã dạy</th>
                <th className="py-2 pr-3 font-medium text-navy-600 text-center">Vắng</th>
                <th className="py-2 pr-3 font-medium text-navy-600 text-center">Chưa XN</th>
                <th className="py-2 pr-3 font-medium text-navy-600 text-center">Dạy thay</th>
                <th className="py-2 pr-3 font-medium text-navy-600 text-right">Đơn giá/buổi</th>
                <th className="py-2 font-medium text-navy-600 text-right">Thực nhận</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.teacherId} className="border-b border-navy-50">
                  <td className="py-1.5 pr-3 text-navy-800 font-medium">
                    {r.name}
                    {r.rate === 0 && (
                      <span className="ml-1.5 text-xs text-amber-600">(chưa đặt đơn giá)</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-navy-700 text-center">{r.scheduled}</td>
                  <td className="py-1.5 pr-3 text-green-600 text-center">{r.taught}</td>
                  <td className="py-1.5 pr-3 text-red-500 text-center">{r.absent}</td>
                  <td className="py-1.5 pr-3 text-slate-500 text-center">{Math.max(0, r.scheduled - r.taught - r.absent)}</td>
                  <td className="py-1.5 pr-3 text-navy-700 text-center">{r.subs}</td>
                  <td className="py-1.5 pr-3 text-navy-500 text-right">{fmtVND(r.rate)}</td>
                  <td className="py-1.5 text-navy-900 font-semibold text-right">{fmtVND(r.actualPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
