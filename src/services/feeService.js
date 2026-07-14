import { supabase } from '@/lib/supabase'
import { paymentService } from './paymentService'
import { enrollmentService } from './enrollmentService'

const fromDB = (row) => row ? {
  id: row.id,
  studentId: row.student_id,
  classId: row.class_id,
  year: row.year,
  month: row.month,
  surcharge: row.surcharge ?? 0,
  paid: row.paid ?? false,
  note: row.note,
} : null

export const feeService = {
  async getByStudentMonth(studentId, classId, year, month) {
    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return fromDB(data)
  },

  async upsert(data) {
    const payload = {
      student_id: data.studentId,
      class_id: data.classId,
      year: data.year,
      month: data.month,
    }
    if (data.surcharge !== undefined) payload.surcharge = data.surcharge
    if (data.paid !== undefined) payload.paid = data.paid
    if (data.note !== undefined) payload.note = data.note

    const { data: row, error } = await supabase
      .from('fees')
      .upsert(payload, { onConflict: 'student_id,class_id,year,month' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return fromDB(row)
  },

  // expected = monthly_fee + surcharge  |  course_fee (no session counting)
  async calcFee(studentId, classId, year, month) {
    const [feeRec, enr] = await Promise.all([
      this.getByStudentMonth(studentId, classId, year, month),
      enrollmentService.get(studentId, classId),
    ])
    if (!enr) return 0

    if (enr.feeType === 'course') return enr.courseFee ?? 0
    return (enr.monthlyFee ?? 0) + (feeRec?.surcharge ?? 0)
  },

  async isFeePaid(studentId, classId, year, month) {
    const period = `${year}-${String(month).padStart(2, '0')}`
    const [totalFee, totalPaid] = await Promise.all([
      this.calcFee(studentId, classId, year, month),
      paymentService.getPaidAmount(studentId, period, classId),
    ])
    return totalFee > 0 && totalPaid >= totalFee
  },

  // Bulk load for FeesPage — 3 queries only (no sessions/attendance needed)
  async buildFeesRows(year, month) {
    const period = `${year}-${String(month).padStart(2, '0')}`

    // 1. Active enrollments with student + class names
    const { data: enrollments, error: enrErr } = await supabase
      .from('enrollments')
      .select('student_id, class_id, fee_type, monthly_fee, course_fee, students(id, name), classes(id, name)')
      .neq('status', 'dropped')
    if (enrErr) throw new Error(enrErr.message)
    if (!enrollments || enrollments.length === 0) return []

    const studentIds = [...new Set(enrollments.map(e => e.student_id))]

    // 2. Parallel: fee records for surcharge, payments for period
    const [feeRes, payRes] = await Promise.all([
      supabase
        .from('fees')
        .select('student_id, class_id, surcharge')
        .in('student_id', studentIds)
        .eq('year', year)
        .eq('month', month),
      supabase
        .from('payments')
        .select('student_id, class_id, amount')
        .in('student_id', studentIds)
        .eq('period', period),
    ])
    if (feeRes.error) throw new Error(feeRes.error.message)
    if (payRes.error) throw new Error(payRes.error.message)

    const key = (studentId, classId) => `${studentId}:${classId}`

    const surchargeByKey = {}
    for (const f of feeRes.data ?? []) {
      if (!f.class_id) continue
      surchargeByKey[key(f.student_id, f.class_id)] = f.surcharge ?? 0
    }

    // Payments without a class_id (legacy data, ambiguous for multi-class
    // students) are excluded — they can't be attributed to one class row.
    const paidByKey = {}
    for (const p of payRes.data ?? []) {
      if (!p.class_id) continue
      const k = key(p.student_id, p.class_id)
      paidByKey[k] = (paidByKey[k] ?? 0) + (p.amount ?? 0)
    }

    // One row per (student, class) — a student enrolled in multiple classes
    // gets one row per active enrollment.
    return enrollments.map(e => {
      const feeType = e.fee_type ?? 'monthly'
      const monthlyFee = e.monthly_fee ?? 0
      const courseFee = e.course_fee ?? 0
      const surcharge = surchargeByKey[key(e.student_id, e.class_id)] ?? 0
      const expected = feeType === 'course' ? courseFee : monthlyFee + surcharge

      return {
        studentId: e.student_id,
        classId: e.class_id,
        name: e.students?.name ?? '—',
        className: e.classes?.name ?? '—',
        feeType,
        expected,
        paid: paidByKey[key(e.student_id, e.class_id)] ?? 0,
      }
    })
  },
}
