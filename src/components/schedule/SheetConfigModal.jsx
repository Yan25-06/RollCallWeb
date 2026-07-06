import { useState, useEffect } from 'react'
import { Modal, Button, Input, toast } from '@/components/ui'
import { COURSE_TYPES } from '@/utils/courseTypes'
import { curriculumSheetService } from '@/services/curriculumSheetService'

/**
 * SheetConfigModal — admin dán link Google Sheet giáo trình cho từng loại khóa.
 * @param {Object} sheetMap - { courseType: url } hiện tại
 * @param {Function} onSaved - gọi sau khi lưu thành công (parent reload map)
 */
export const SheetConfigModal = ({ open, onClose, sheetMap, onSaved }) => {
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setValues({ ...sheetMap }) }, [open, sheetMap])

  const set = (ct, v) => setValues(s => ({ ...s, [ct]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const ct of COURSE_TYPES) {
        const url = (values[ct] || '').trim()
        const old = sheetMap[ct] || ''
        if (url === old) continue
        if (url) await curriculumSheetService.upsert(ct, url)
        else await curriculumSheetService.remove(ct)
      }
      toast.success('Đã lưu cấu hình Sheet')
      onSaved?.()
      onClose?.()
    } catch (e) {
      toast.error(e.message || 'Không thể lưu cấu hình')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cấu hình Google Sheet giáo trình"
      footer={
        <div className="flex gap-2 ml-auto justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-navy-500">
          Dán link file Google Sheet giáo trình cho từng loại khóa. Sheet phải ở chế độ chia sẻ
          «Ai có link đều xem được». Để trống để gỡ link.
        </p>
        {COURSE_TYPES.map(ct => (
          <Input
            key={ct}
            label={ct}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            value={values[ct] || ''}
            onChange={e => set(ct, e.target.value)}
          />
        ))}
      </div>
    </Modal>
  )
}
