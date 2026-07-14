import { useState } from 'react'
import { clsx } from 'clsx'
import { Badge } from '@/components/ui'
import { toast } from '@/components/ui'
import { ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { fmtVND } from '@/utils/helpers'
import { paymentService } from '@/services/paymentService'
import { StudentPaymentHistoryPanel } from './StudentPaymentHistoryPanel'

const statusInfo = (paid, expected) => {
  if (paid <= 0) return { label: 'Còn nợ', variant: 'danger' }
  if (paid >= expected) return { label: 'Đã đóng', variant: 'success' }
  return { label: 'Đóng một phần', variant: 'warning' }
}

export const FeesTable = ({ rows, period, onAddPayment, onRefresh }) => {
  const [sortAsc, setSortAsc] = useState(true)
  const [historyFor, setHistoryFor] = useState(null)
  const [historyPayments, setHistoryPayments] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const sorted = [...rows].sort((a, b) =>
    sortAsc ? a.name.localeCompare(b.name, 'vi') : b.name.localeCompare(a.name, 'vi')
  )

  const openHistory = async (row) => {
    setHistoryFor(row)
    setLoadingHistory(true)
    try {
      const payments = await paymentService.getByStudentClass(row.studentId, row.classId)
      setHistoryPayments(payments)
    } catch {
      toast.error('Không tải được lịch sử thanh toán')
    } finally {
      setLoadingHistory(false)
    }
  }

  const closeHistory = () => {
    setHistoryFor(null)
  }

  const reloadHistory = async () => {
    if (!historyFor) return
    try {
      const payments = await paymentService.getByStudentClass(historyFor.studentId, historyFor.classId)
      setHistoryPayments(payments)
    } catch {
      toast.error('Không tải được lịch sử thanh toán')
    }
    onRefresh?.()
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-navy-50/60 border-b border-navy-100">
                <th
                  className="px-5 py-3 font-semibold text-navy-700 cursor-pointer select-none"
                  onClick={() => setSortAsc(a => !a)}
                >
                  <span className="flex items-center gap-1">
                    Học viên
                    {sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold text-navy-700">Lớp</th>
                <th className="px-5 py-3 font-semibold text-navy-700 text-right">Học phí kỳ vọng</th>
                <th className="px-5 py-3 font-semibold text-navy-700 text-right">Đã đóng</th>
                <th className="px-5 py-3 font-semibold text-navy-700 text-center">Trạng thái</th>
                <th className="px-5 py-3 font-semibold text-navy-700 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {sorted.map(row => {
                const { label, variant } = statusInfo(row.paid, row.expected)
                return (
                  <tr
                    key={`${row.studentId}-${row.classId}`}
                    onClick={() => openHistory(row)}
                    className="hover:bg-navy-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 font-medium text-navy-900">{row.name}</td>
                    <td className="px-5 py-3 text-navy-500">{row.className}</td>
                    <td className="px-5 py-3 text-right text-navy-700">{fmtVND(row.expected)}</td>
                    <td className={clsx(
                      'px-5 py-3 text-right font-semibold',
                      row.paid > 0 ? 'text-emerald-700' : 'text-navy-400'
                    )}>
                      {fmtVND(row.paid)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={variant}>{label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        title="Ghi nhận thanh toán"
                        onClick={() => onAddPayment(row.studentId, row.classId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-navy-600 hover:text-emerald-700 hover:bg-emerald-50 border border-navy-100 hover:border-emerald-200 transition-colors"
                      >
                        <Plus size={13} />
                        Ghi nhận
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-navy-50 text-xs text-navy-400">
          {sorted.length} học viên · Nhấn vào hàng để xem lịch sử thanh toán
        </div>
      </div>

      <StudentPaymentHistoryPanel
        open={!!historyFor}
        onClose={closeHistory}
        student={historyFor}
        payments={historyPayments}
        loading={loadingHistory}
        onDeleted={reloadHistory}
        onAddPayment={onAddPayment}
      />
    </>
  )
}
