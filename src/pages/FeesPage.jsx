import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { StatCard, Button, Empty, Skeleton, Select } from '@/components/ui'
import { toast } from '@/components/ui'
import { Banknote, Users, AlertCircle, Plus } from 'lucide-react'
import { PaymentModal } from '@/components/fees/PaymentModal'
import { FeesTable } from '@/components/fees/FeesTable'
import { feeService } from '@/services/feeService'
import { paymentService } from '@/services/paymentService'
import { fmtVND } from '@/utils/helpers'
import { ExportExcelButton } from '@/components/reports/ExportExcelButton'

const getPaymentStatus = (paid, expected) => {
  if (expected <= 0) return 'free'
  if (paid >= expected) return 'paid'
  if (paid > 0) return 'partial'
  return 'debt'
}

const PAYMENT_TABS = [
  { id: 'all',     label: 'Tất cả' },
  { id: 'debt',    label: 'Còn nợ' },
  { id: 'paid',    label: 'Đã đóng đủ' },
  { id: 'partial', label: 'Đóng một phần' },
]

const STATUS_LABELS = {
  paid:    'Đã đóng đủ',
  partial: 'Đóng một phần',
  debt:    'Còn nợ',
  free:    'Miễn phí',
}

const FEE_EXPORT_COLUMNS = [
  { key: 'name',        label: 'Học sinh' },
  { key: 'className',   label: 'Lớp' },
  { key: 'expectedFmt', label: 'Phải đóng' },
  { key: 'paidFmt',     label: 'Đã đóng' },
  { key: 'debtFmt',     label: 'Còn nợ' },
  { key: 'status',      label: 'Trạng thái' },
]

export const FeesPage = ({ year, month }) => {
  const currentPeriod = `${year}-${String(month).padStart(2, '0')}`
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultStudentId, setDefaultStudentId] = useState(null)
  const [defaultClassId, setDefaultClassId] = useState(null)
  const [payStatusFilter, setPayStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await feeService.buildFeesRows(year, month)
      setRows(data)
    } catch (e) {
      toast.error('Không tải được dữ liệu học phí')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [year, month])

  useEffect(() => { refresh() }, [refresh])

  const handleSave = async (data) => {
    try {
      await paymentService.create({ ...data, period: data.period })
      toast.success('Đã ghi nhận thanh toán!')
      refresh(true)
    } catch {
      toast.error('Lưu không thành công, vui lòng thử lại.')
    }
  }

  const openAdd = (studentId = null, classId = null) => {
    setDefaultStudentId(studentId)
    setDefaultClassId(classId)
    setModalOpen(true)
  }

  const uniqueClassNames = [...new Set(rows.map(r => r.className).filter(Boolean))].sort()

  const classFilteredRows = classFilter === 'all'
    ? rows
    : rows.filter(r => r.className === classFilter)

  const totalExpected = classFilteredRows.reduce((s, r) => s + r.expected, 0)
  const totalPaid = classFilteredRows.reduce((s, r) => s + r.paid, 0)
  const totalDebt = classFilteredRows.reduce((s, r) => s + Math.max(0, r.expected - r.paid), 0)

  // Đếm theo học sinh duy nhất (không theo dòng lớp): 1 học sinh học nhiều
  // lớp chỉ tính "đã đóng đủ" khi mọi lớp đều đủ, tính "chưa đóng" nếu còn
  // nợ ở bất kỳ lớp nào.
  const studentIdsInScope = [...new Set(classFilteredRows.map(r => r.studentId))]
  const paidCount = studentIdsInScope.filter(id =>
    classFilteredRows.filter(r => r.studentId === id).every(r => r.paid >= r.expected)
  ).length
  const debtCount = studentIdsInScope.length - paidCount

  const tabCounts = {
    all:     classFilteredRows.length,
    debt:    classFilteredRows.filter(r => getPaymentStatus(r.paid, r.expected) === 'debt').length,
    paid:    classFilteredRows.filter(r => getPaymentStatus(r.paid, r.expected) === 'paid').length,
    partial: classFilteredRows.filter(r => getPaymentStatus(r.paid, r.expected) === 'partial').length,
  }

  const filteredRows = payStatusFilter === 'all'
    ? classFilteredRows
    : classFilteredRows.filter(r => getPaymentStatus(r.paid, r.expected) === payStatusFilter)

  const exportRows = filteredRows.map(r => ({
    ...r,
    expectedFmt: fmtVND(r.expected),
    paidFmt:     fmtVND(r.paid),
    debtFmt:     fmtVND(Math.max(0, r.expected - r.paid)),
    status:      STATUS_LABELS[getPaymentStatus(r.paid, r.expected)],
  }))

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Học phí</h1>
          <p className="text-sm text-navy-400 mt-0.5">
            Tháng {month}/{year}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportExcelButton
            rows={exportRows}
            columns={FEE_EXPORT_COLUMNS}
            filename={`hoc-phi-thang-${month}-${year}`}
            disabled={loading || filteredRows.length === 0}
          />
          <Button onClick={() => openAdd()} className="shrink-0">
            <Plus size={15} className="mr-1.5" />
            Ghi nhận thanh toán
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard
              label="Tổng thu tháng này"
              value={fmtVND(totalPaid)}
              icon={<Banknote size={16} />}
              accent="success"
            />
            <StatCard
              label="Kỳ vọng"
              value={fmtVND(totalExpected)}
              icon={<Banknote size={16} />}
              accent="navy"
            />
            <StatCard
              label="Đã đóng đủ"
              value={`${paidCount}/${studentIdsInScope.length}`}
              sub="học viên"
              icon={<Users size={16} />}
              accent="navy"
            />
            <StatCard
              label="Còn nợ"
              value={fmtVND(totalDebt)}
              sub={debtCount > 0 ? `${debtCount} học viên` : 'Không có nợ'}
              icon={<AlertCircle size={16} />}
              accent={debtCount > 0 ? 'danger' : 'success'}
            />
          </>
        )}
      </div>

      {/* Filters: class + payment status */}
      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown có nhãn riêng + vạch ngăn: trước đây nó cùng hình pill với dãy tab bên cạnh
              nên trông như tab thứ năm, dù một cái mở menu còn bốn cái kia lọc tại chỗ. */}
          {uniqueClassNames.length > 0 && (
            <>
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-navy-700">Lớp:</span>
                <Select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="text-sm w-auto"
                >
                  <option value="all">Tất cả lớp</option>
                  {uniqueClassNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </Select>
              </label>
              <span className="hidden sm:block w-px h-6 bg-navy-200 shrink-0" aria-hidden="true" />
            </>
          )}
          <div className="flex gap-1 flex-wrap">
          {PAYMENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPayStatusFilter(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                payStatusFilter === tab.id
                  ? 'bg-navy-800 text-white'
                  : 'bg-white text-navy-500 border border-navy-100 hover:text-navy-800 hover:border-navy-300'
              )}
            >
              {tab.label}
              <span className={clsx(
                'ml-1.5 text-xs font-normal',
                payStatusFilter === tab.id ? 'text-navy-200' : 'text-navy-400'
              )}>
                ({tabCounts[tab.id]})
              </span>
            </button>
          ))}
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 rounded-xl" />
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty
          icon="💰"
          title="Chưa có học viên nào trong tháng này"
          desc="Thêm học viên vào lớp để bắt đầu theo dõi học phí"
          action={
            <Button onClick={() => openAdd()}>
              <Plus size={15} className="mr-1.5" />
              Ghi nhận thanh toán đầu tiên
            </Button>
          }
        />
      ) : filteredRows.length === 0 ? (
        <Empty
          icon="🔍"
          title={`Không có học sinh nào trong nhóm "${PAYMENT_TABS.find(t => t.id === payStatusFilter)?.label}"`}
          desc="Thử chọn bộ lọc khác"
        />
      ) : (
        <FeesTable
            rows={filteredRows}
            period={currentPeriod}
            onAddPayment={openAdd}
            onRefresh={() => refresh(true)}
        />
      )}

      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        defaultStudentId={defaultStudentId}
        defaultClassId={defaultClassId}
        defaultPeriod={currentPeriod}
      />
    </div>
  )
}
