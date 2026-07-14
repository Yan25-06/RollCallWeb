import { supabase } from '@/lib/supabase'

const fromDB = (row) => row ? {
  id: row.id,
  studentId: row.student_id,
  classId: row.class_id,
  amount: row.amount,
  paidAt: row.paid_at,
  method: row.method,
  period: row.period,
  note: row.note,
  createdAt: row.created_at,
} : null

const toDB = (data) => {
  const row = {
    student_id: data.studentId,
    amount: data.amount,
    paid_at: data.paidAt,
    method: data.method,
    period: data.period,
  }
  if (data.classId !== undefined) row.class_id = data.classId
  if (data.note !== undefined) row.note = data.note
  return row
}

export const paymentService = {
  async getByStudent(studentId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('paid_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(fromDB)
  },

  async getByStudentClass(studentId, classId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .order('paid_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(fromDB)
  },

  async getByPeriod(period) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('period', period)
      .order('paid_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(fromDB)
  },

  async getPaidAmount(studentId, period, classId) {
    let query = supabase
      .from('payments')
      .select('amount')
      .eq('student_id', studentId)
      .eq('period', period)
    if (classId) query = query.eq('class_id', classId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  },

  async create(data) {
    const { data: row, error } = await supabase
      .from('payments')
      .insert(toDB(data))
      .select()
      .single()
    if (error) throw new Error(error.message)
    return fromDB(row)
  },

  async update(id, data) {
    const { data: row, error } = await supabase
      .from('payments')
      .update(toDB(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return fromDB(row)
  },

  async remove(id) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}
