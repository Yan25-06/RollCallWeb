import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { DEFAULT_SKILL_CONFIG } from '@/services/classService'

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  scores: {},
  tags: [], advice: '', remark: '',
}

const clampScore = (val, maxScore) => {
  const n = parseFloat(val)
  if (isNaN(n)) return ''
  return Math.min(maxScore, Math.max(0, n))
}

export const ReviewForm = ({ open, onClose, editingReview, studentId, classId, teacherName, skillConfig, latestMockEntry, onSave }) => {
  const skills = skillConfig ?? DEFAULT_SKILL_CONFIG
  const isEdit = !!editingReview
  const [form, setForm]               = useState(EMPTY_FORM)
  const [errors, setErrors]           = useState({})
  const [prefillSource, setPrefillSource] = useState(null)
  const [scoreMaxSnapshot, setScoreMaxSnapshot] = useState({})

  useEffect(() => {
    if (open) {
      if (editingReview) {
        setForm({
          date:   editingReview.date ?? EMPTY_FORM.date,
          scores: editingReview.scores ?? {},
          tags:   editingReview.tags   ?? [],
          advice: editingReview.advice ?? '',
          remark: editingReview.remark ?? '',
        })
        // Build scoreMax: stored snapshot takes priority; fallback to latestMockEntry sections for skills missing from stored snapshot
        const storedMax = editingReview.scoreMax ?? {}
        const resolvedMax = {}
        ;(skillConfig ?? DEFAULT_SKILL_CONFIG).forEach(skill => {
          if (storedMax[skill.name] != null) {
            resolvedMax[skill.name] = storedMax[skill.name]
          } else if (latestMockEntry) {
            const section = (latestMockEntry.mockTest.sections ?? []).find(s => s.name === skill.name)
            resolvedMax[skill.name] = section?.maxScore ?? 9
          } else {
            resolvedMax[skill.name] = 9
          }
        })
        setScoreMaxSnapshot(resolvedMax)
        setPrefillSource(null)
      } else if (latestMockEntry) {
        const { result, mockTest } = latestMockEntry
        const prefillScores = {}
        const scoreMax = {}
        skills.forEach(skill => {
          const val = result.scores?.[skill.name]
          if (val != null) prefillScores[skill.name] = val
          const section = (mockTest.sections ?? []).find(s => s.name === skill.name)
          scoreMax[skill.name] = section?.maxScore ?? 9
        })
        setForm({ ...EMPTY_FORM, scores: prefillScores, remark: result.teacherNote ?? '' })
        setScoreMaxSnapshot(scoreMax)
        setPrefillSource({ title: mockTest.title, date: mockTest.date })
      } else {
        setForm(EMPTY_FORM)
        setScoreMaxSnapshot({})
        setPrefillSource(null)
      }
      setErrors({})
    }
  }, [open, editingReview])

  const setScore = (name, val) =>
    setForm(f => ({ ...f, scores: { ...f.scores, [name]: val } }))

  const getMaxScore = (skillName) => scoreMaxSnapshot[skillName] ?? 9

  const validate = () => {
    const e = {}
    if (!form.date) e.date = 'Vui lòng chọn ngày'
    for (const skill of skills) {
      const maxScore = getMaxScore(skill.name)
      const val = form.scores?.[skill.name]
      if (val !== '' && val != null) {
        const n = parseFloat(val)
        if (isNaN(n) || n < 0 || n > maxScore)
          e[skill.name] = `Điểm 0–${maxScore}`
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const cleanScores = {}
    for (const skill of skills) {
      const val = form.scores?.[skill.name]
      if (val !== '' && val != null) {
        const n = parseFloat(val)
        if (!isNaN(n)) cleanScores[skill.name] = n
      }
    }
    const data = {
      studentId, classId,
      date:        form.date,
      scores:      cleanScores,
      scoreMax:    scoreMaxSnapshot,
      tags:        form.tags,
      advice:      form.advice.trim() || undefined,
      remark:      form.remark.trim() || undefined,
      teacherName: teacherName || undefined,
    }
    onSave?.(data)
    onClose?.()
  }

  const ScoreInput = ({ skill }) => {
    const maxScore = getMaxScore(skill.name)
    const val = form.scores?.[skill.name] ?? ''
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-navy-700">{skill.name}</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            max={maxScore}
            step={maxScore <= 9 ? 0.5 : 1}
            placeholder="—"
            value={val}
            onChange={e => setScore(skill.name, e.target.value)}
            onBlur={e => {
              const clamped = clampScore(e.target.value, maxScore)
              setScore(skill.name, clamped === '' ? '' : clamped)
            }}
            className={`input text-center pr-8 ${errors[skill.name] ? 'border-red-400' : ''}`}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-navy-400 pointer-events-none select-none">
            /{maxScore}
          </span>
        </div>
        {errors[skill.name] && <span className="text-xs text-red-500">{errors[skill.name]}</span>}
      </div>
    )
  }

  const cols = skills.length <= 4 ? skills.length : 4

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa đánh giá' : 'Thêm đánh giá'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            {isEdit ? 'Cập nhật' : 'Lưu đánh giá'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5">
        {prefillSource && (
          <div className="flex items-center gap-2 bg-navy-50 border border-navy-200 rounded-xl px-3 py-2">
            <span className="text-xs text-navy-600 font-medium flex-1">
              Điền từ {prefillSource.title}
            </span>
            <button
              type="button"
              onClick={() => { setForm(EMPTY_FORM); setPrefillSource(null); setScoreMaxSnapshot({}) }}
              className="p-0.5 text-navy-400 hover:text-navy-700 rounded transition-colors"
              aria-label="Xóa dữ liệu đã điền sẵn"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Date */}
        <Input
          label="Ngày đánh giá"
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          error={errors.date}
        />

        {/* Dynamic skill scores */}
        <div>
          <p className="text-sm font-medium text-navy-700 mb-1.5">Điểm kỹ năng</p>
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {skills.map(skill => <ScoreInput key={skill.name} skill={skill} />)}
          </div>
        </div>

        {/* Remark */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Nhận xét thêm</label>
          <textarea
            className="input resize-none"
            rows={10}
            placeholder="Ghi chú thêm về buổi học..."
            value={form.remark}
            onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
          />
        </div>

        {/* Advice */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Lời khuyên cá nhân</label>
          <textarea
            className="input resize-none"
            rows={5}
            placeholder="Lời khuyên cho học viên và phụ huynh..."
            value={form.advice}
            onChange={e => setForm(f => ({ ...f, advice: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  )
}
