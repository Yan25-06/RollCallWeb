import { useState } from 'react'
import { Modal, Button, ConfirmModal } from '@/components/ui'
import { toast } from '@/components/ui'
import { fmtVND, fmtDate } from '@/utils/helpers'
import { Banknote, ArrowLeftRight, Trash2, Pencil, Check, X, Plus } from 'lucide-react'
import { paymentService } from '@/services/paymentService'

const METHOD_LABEL = { cash: 'Tiền mặt', transfer: 'Chuyển khoản' }

const BLANK_EDIT = { amount: '', paidAt: '', period: '', method: 'cash', note: '' }

export const StudentPaymentHistoryPanel = ({ open, onClose, student, payments, loading, onDeleted, onAddPayment }) => {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(BLANK_EDIT)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null })

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditForm({ amount: p.amount, paidAt: p.paidAt ?? '', period: p.period ?? '', method: p.method ?? 'cash', note: p.note ?? '' })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm(BLANK_EDIT) }

  const handleUpdate = async (id) => {
    const amt = Number(editForm.amount)
    if (!amt || amt <= 0) { toast.error('Số tiền phải lớn hơn 0'); return }
    setSaving(true)
    try {
      await paymentService.update(id, { ...editForm, amount: amt })
      toast.success('Đã cập nhật')
      setEditingId(null)
      onDeleted?.()
    } catch {
      toast.error('Cập nhật không thành công, vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id) => {
    setConfirmDelete({ open: true, id })
  }

  const doDelete = async () => {
    try {
      await paymentService.remove(confirmDelete.id)
      toast.success('Đã xoá')
      onDeleted?.()
    } catch {
      toast.error('Xoá không thành công, vui lòng thử lại.')
    }
  }

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={`Lịch sử thanh toán — ${student?.name ?? ''}${student?.className ? ` (${student.className})` : ''}`}
      footer={
        onAddPayment && (
          <div className="w-full">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => { onClose(); onAddPayment(student?.studentId, student?.classId) }}
            >
              <Plus size={14} className="mr-1.5" />
              Thêm khoản thanh toán
            </Button>
          </div>
        )
      }
    >
      {loading ? (
        <p className="text-sm text-navy-400 py-6 text-center">Đang tải...</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-navy-400 py-6 text-center">Chưa có khoản nào</p>
      ) : (
        <div className="flex flex-col divide-y divide-navy-50 max-h-96 overflow-y-auto">
          {payments.map(p => (
            <div key={p.id} className="py-3">
              {editingId === p.id ? (
                /* ── Inline edit form ── */
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editForm.amount}
                      onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="Số tiền (đ)"
                      className="input text-sm w-full py-1.5"
                    />
                    <select
                      value={editForm.method}
                      onChange={e => setEditForm(f => ({ ...f, method: e.target.value }))}
                      className="select text-sm py-1.5 w-full"
                    >
                      <option value="cash">Tiền mặt</option>
                      <option value="transfer">Chuyển khoản</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={editForm.paidAt}
                      onChange={e => setEditForm(f => ({ ...f, paidAt: e.target.value }))}
                      className="input text-sm flex-1 py-1.5"
                    />
                    <input
                      type="month"
                      value={editForm.period}
                      onChange={e => setEditForm(f => ({ ...f, period: e.target.value }))}
                      className="input text-sm flex-1 py-1.5"
                    />
                  </div>
                  <input
                    type="text"
                    value={editForm.note}
                    onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Ghi chú (tuỳ chọn)"
                    className="input text-sm py-1.5"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-navy-500 hover:bg-navy-50 transition-colors"
                    >
                      <X size={13} /> Huỷ
                    </button>
                    <button
                      onClick={() => handleUpdate(p.id)}
                      disabled={saving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Lưu
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Display row ── */
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    {p.method === 'cash'
                      ? <Banknote size={15} className="text-emerald-600" />
                      : <ArrowLeftRight size={15} className="text-blue-500" />
                    }
                    <span className="text-xs text-navy-400">{METHOD_LABEL[p.method]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{fmtVND(p.amount)}</p>
                    <p className="text-xs text-navy-400">
                      {fmtDate(p.paidAt)} · Tháng {p.period?.replace('-', '/')}
                      {p.note ? ` · ${p.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => startEdit(p)}
                      title="Sửa"
                      className="p-1.5 rounded-lg text-navy-300 hover:text-navy-700 hover:bg-navy-50 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      title="Xoá"
                      className="p-1.5 rounded-lg text-navy-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>

    <ConfirmModal
      open={confirmDelete.open}
      onClose={() => setConfirmDelete({ open: false, id: null })}
      onConfirm={doDelete}
      title="Xoá thanh toán"
      message="Xoá khoản thanh toán này?"
      confirmLabel="Xoá"
    />
    </>
  )
}
