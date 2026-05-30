import { useState, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { upsertSubmission } from '@/store/db'
import { getInitials } from '@/utils/helpers'
import { Check } from 'lucide-react'

const SavedIndicator = ({ show }) => (
  <span className={clsx(
    'text-xs text-emerald-600 flex items-center gap-0.5 transition-opacity duration-300',
    show ? 'opacity-100' : 'opacity-0'
  )}>
    <Check size={11} /> đã lưu
  </span>
)

const SubmissionRow = ({ student, submission, hwAssignmentId, onUpdate }) => {
  const [saved, setSaved] = useState(false)
  const [scoreError, setScoreError] = useState('')
  // Controlled state so inputs stay in sync when submission prop changes
  const [scoreVal, setScoreVal] = useState(submission?.score ?? '')
  const [commentVal, setCommentVal] = useState(submission?.comment ?? '')
  const debounceRef = useRef(null)

  // Sync controlled inputs when parent passes updated submission
  useEffect(() => {
    setScoreVal(submission?.score ?? '')
    setCommentVal(submission?.comment ?? '')
  }, [submission?.score, submission?.comment])

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }

  const save = useCallback((data) => {
    upsertSubmission({ hwAssignmentId, studentId: student.id, ...data })
    flash()
    onUpdate?.()
  }, [hwAssignmentId, student.id, onUpdate])

  const handleCheckbox = (e) => {
    save({ submitted: e.target.checked, score: submission?.score, comment: submission?.comment })
  }

  const handleScore = (val) => {
    setScoreVal(val)
    const n = val === '' ? undefined : Number(val)
    if (val !== '' && (isNaN(n) || n < 0 || n > 10)) {
      setScoreError('0–10')
      return
    }
    setScoreError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save({ submitted: submission?.submitted ?? false, score: n, comment: commentVal })
    }, 300)
  }

  const handleComment = (val) => {
    setCommentVal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save({ submitted: submission?.submitted ?? false, score: submission?.score, comment: val })
    }, 300)
  }

  // gradedAt is stored as Unix timestamp (Date.now()) → format correctly
  const gradedAt = submission?.gradedAt
    ? new Date(submission.gradedAt).toLocaleDateString('vi-VN')
    : '—'

  return (
    <tr className={clsx(
      'transition-colors',
      submission?.submitted ? 'hover:bg-navy-50/30' : 'bg-red-50/40 hover:bg-red-50/60'
    )}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {getInitials(student.name)}
          </div>
          <span className="font-medium text-navy-900 text-sm">{student.name}</span>
        </div>
      </td>
      <td className="px-5 py-3 text-center">
        <input
          type="checkbox"
          checked={submission?.submitted ?? false}
          onChange={handleCheckbox}
          className="w-4 h-4 accent-navy-800 cursor-pointer"
        />
      </td>
      <td className="px-5 py-3">
        <div className="flex flex-col gap-0.5">
          <input
            type="number"
            min="0"
            max="10"
            step="0.25"
            placeholder="—"
            value={scoreVal}
            onChange={e => handleScore(e.target.value)}
            className={clsx(
              'input text-sm w-20 text-center',
              scoreError && 'border-red-400'
            )}
          />
          {scoreError && <span className="text-xs text-red-500">{scoreError}</span>}
        </div>
      </td>
      <td className="px-5 py-3">
        <input
          type="text"
          placeholder="Nhận xét..."
          value={commentVal}
          onChange={e => handleComment(e.target.value)}
          className="input text-sm w-full"
        />
      </td>
      <td className="px-5 py-3 text-xs text-navy-400">
        <div className="flex flex-col gap-0.5">
          <span>{gradedAt}</span>
          <SavedIndicator show={saved} />
        </div>
      </td>
    </tr>
  )
}

export const SubmissionTable = ({ students, submissions, hwAssignmentId, onUpdate }) => {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead>
            <tr className="bg-navy-50/60 border-b border-navy-100">
              <th className="px-5 py-3 font-semibold text-navy-700">Học viên</th>
              <th className="px-5 py-3 font-semibold text-navy-700 text-center">Đã nộp</th>
              <th className="px-5 py-3 font-semibold text-navy-700">Điểm (0–10)</th>
              <th className="px-5 py-3 font-semibold text-navy-700">Nhận xét</th>
              <th className="px-5 py-3 font-semibold text-navy-700">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {students.map(student => {
              const sub = submissions.find(s => s.studentId === student.id)
              return (
                <SubmissionRow
                  key={student.id}
                  student={student}
                  submission={sub}
                  hwAssignmentId={hwAssignmentId}
                  onUpdate={onUpdate}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
