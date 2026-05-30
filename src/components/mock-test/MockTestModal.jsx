import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button, Input, toast } from '@/components/ui'
import { createMockTest, updateMockTest, getMockTestResultsByTest } from '@/store/db'
import { MockTestSectionBuilder, DEFAULT_SECTIONS } from './MockTestSectionBuilder'

export const MockTestModal = ({ open, onClose, classId, mockTest, onSaved }) => {
  const mode = mockTest ? 'edit' : 'create'

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [sections, setSections] = useState([])
  const [teacherNote, setTeacherNote] = useState('')
  const [hasResults, setHasResults] = useState(false)
  const [warnConfirmed, setWarnConfirmed] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && mockTest) {
      setTitle(mockTest.title)
      setDate(mockTest.date)
      setSections(mockTest.sections ?? [])
      setTeacherNote(mockTest.teacherNote ?? '')
      const results = getMockTestResultsByTest(mockTest.id)
      setHasResults(results.some(r => Object.keys(r.scores).length > 0))
      setWarnConfirmed(false)
    } else {
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setSections(DEFAULT_SECTIONS())
      setTeacherNote('')
      setHasResults(false)
      setWarnConfirmed(false)
    }
  }, [open, mockTest])

  const sectionsValid = sections.length > 0 && sections.every(s => s.name.trim() && s.maxScore > 0)

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('Vui lòng nhập tên bài kiểm tra'); return }
    if (!date) { toast.error('Vui lòng chọn ngày thi'); return }
    if (!sectionsValid) { toast.error('Tên phần thi không được rỗng và điểm tối đa phải > 0'); return }

    if (mode === 'edit' && hasResults && !warnConfirmed) {
      setWarnConfirmed(true)
      toast.warning('Thay đổi phần thi có thể ảnh hưởng điểm đã nhập. Bấm lưu lần nữa để xác nhận.')
      return
    }

    if (mode === 'create') {
      const test = createMockTest({ classId, title: title.trim(), date, sections, teacherNote: teacherNote.trim() })
      toast.success('Đã tạo Mock Test!')
      onSaved?.(test)
    } else {
      const test = updateMockTest(mockTest.id, { title: title.trim(), date, sections, teacherNote: teacherNote.trim() })
      toast.success('Đã cập nhật!')
      onSaved?.(test)
    }
    onClose?.()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-3xl shadow-navy-xl w-full max-w-lg animate-slide-up overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-navy-50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-900">
            {mode === 'create' ? 'Tạo Mock Test mới' : 'Chỉnh sửa Mock Test'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <Input
            label="Tên bài kiểm tra"
            placeholder="VD: Mock Test 1"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Input
            label="Ngày thi"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
              Các phần thi
            </label>
            <div className="flex justify-between text-xs text-navy-400 px-8 pr-10">
              <span className="flex-1">Tên phần thi</span>
              <span className="w-24 text-center">Điểm tối đa</span>
            </div>
            <MockTestSectionBuilder sections={sections} onChange={setSections} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
              Nhận xét chung của GV (không bắt buộc)
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Nhận xét chung về bài kiểm tra này..."
              value={teacherNote}
              onChange={e => setTeacherNote(e.target.value)}
            />
          </div>

          {warnConfirmed && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-xl">
              <strong>Xác nhận:</strong> Thay đổi sẽ ảnh hưởng đến điểm đã nhập. Bấm "Lưu" để tiếp tục.
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-navy-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {mode === 'create' ? 'Tạo Mock Test' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </div>
  )
}
