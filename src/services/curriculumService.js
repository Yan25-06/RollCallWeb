import { supabase } from '@/lib/supabase'
import { getUid } from './studentService'

// ── Months ────────────────────────────────────────────────────
const monthFromDB = (row) => row ? {
  id: row.id,
  courseType: row.course_type,
  monthNo: row.month_no,
  title: row.title,
  createdBy: row.created_by,
  createdAt: row.created_at,
} : null

const monthToDB = (data) => {
  const row = {}
  if (data.courseType !== undefined) row.course_type = data.courseType
  if (data.monthNo !== undefined) row.month_no = data.monthNo
  if (data.title !== undefined) row.title = data.title
  return row
}

// ── Sessions ──────────────────────────────────────────────────
const sessionFromDB = (row) => row ? {
  id: row.id,
  monthId: row.month_id,
  weekNo: row.week_no,
  sessionNo: row.session_no,
  skill: row.skill,
  content: row.content,
  note: row.note,
  createdBy: row.created_by,
  createdAt: row.created_at,
} : null

const sessionToDB = (data) => {
  const row = {}
  if (data.monthId !== undefined) row.month_id = data.monthId
  if (data.weekNo !== undefined) row.week_no = data.weekNo
  if (data.sessionNo !== undefined) row.session_no = data.sessionNo
  if (data.skill !== undefined) row.skill = data.skill
  if (data.content !== undefined) row.content = data.content
  if (data.note !== undefined) row.note = data.note
  return row
}

// ── Materials ─────────────────────────────────────────────────
const materialFromDB = (row) => row ? {
  id: row.id,
  sessionId: row.session_id,
  type: row.type,
  title: row.title,
  url: row.url,
  orderIndex: row.order_index,
  createdBy: row.created_by,
  createdAt: row.created_at,
} : null

const materialToDB = (data) => {
  const row = {}
  if (data.sessionId !== undefined) row.session_id = data.sessionId
  if (data.type !== undefined) row.type = data.type
  if (data.title !== undefined) row.title = data.title
  if (data.url !== undefined) row.url = data.url
  if (data.orderIndex !== undefined) row.order_index = data.orderIndex
  return row
}

export const curriculumService = {
  // Trả cây: [{ ...month, sessions: [{ ...session, materials: [...] }] }]
  async getByCourseType(courseType) {
    const { data: months, error: mErr } = await supabase
      .from('curriculum_months')
      .select('*')
      .eq('course_type', courseType)
      .order('month_no', { ascending: true })
    if (mErr) throw new Error(mErr.message)
    const monthList = (months ?? []).map(monthFromDB)
    if (monthList.length === 0) return []

    const monthIds = monthList.map(m => m.id)
    const { data: sessions, error: sErr } = await supabase
      .from('curriculum_sessions')
      .select('*')
      .in('month_id', monthIds)
      .order('session_no', { ascending: true })
    if (sErr) throw new Error(sErr.message)
    const sessionList = (sessions ?? []).map(sessionFromDB)

    let materialList = []
    if (sessionList.length > 0) {
      const sessionIds = sessionList.map(s => s.id)
      const { data: materials, error: matErr } = await supabase
        .from('curriculum_materials')
        .select('*')
        .in('session_id', sessionIds)
        .order('order_index', { ascending: true })
      if (matErr) throw new Error(matErr.message)
      materialList = (materials ?? []).map(materialFromDB)
    }

    // Lồng cây
    const matBySession = new Map()
    for (const mat of materialList) {
      if (!matBySession.has(mat.sessionId)) matBySession.set(mat.sessionId, [])
      matBySession.get(mat.sessionId).push(mat)
    }
    const sessByMonth = new Map()
    for (const s of sessionList) {
      const withMats = { ...s, materials: matBySession.get(s.id) ?? [] }
      if (!sessByMonth.has(s.monthId)) sessByMonth.set(s.monthId, [])
      sessByMonth.get(s.monthId).push(withMats)
    }
    return monthList.map(m => ({ ...m, sessions: sessByMonth.get(m.id) ?? [] }))
  },

  // ── Months ──
  async createMonth(data) {
    const created_by = await getUid()
    const { data: row, error } = await supabase
      .from('curriculum_months')
      .insert({ ...monthToDB(data), created_by })
      .select().single()
    if (error) throw new Error(error.message)
    return monthFromDB(row)
  },
  async updateMonth(id, data) {
    const { data: row, error } = await supabase
      .from('curriculum_months')
      .update(monthToDB(data)).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return monthFromDB(row)
  },
  async removeMonth(id) {
    const { error } = await supabase.from('curriculum_months').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // ── Sessions ──
  async createSession(data) {
    const created_by = await getUid()
    const { data: row, error } = await supabase
      .from('curriculum_sessions')
      .insert({ ...sessionToDB(data), created_by })
      .select().single()
    if (error) throw new Error(error.message)
    return sessionFromDB(row)
  },
  async updateSession(id, data) {
    const { data: row, error } = await supabase
      .from('curriculum_sessions')
      .update(sessionToDB(data)).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return sessionFromDB(row)
  },
  async removeSession(id) {
    const { error } = await supabase.from('curriculum_sessions').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // ── Materials ──
  async createMaterial(data) {
    const created_by = await getUid()
    const { data: row, error } = await supabase
      .from('curriculum_materials')
      .insert({ ...materialToDB(data), created_by })
      .select().single()
    if (error) throw new Error(error.message)
    return materialFromDB(row)
  },
  async updateMaterial(id, data) {
    const { data: row, error } = await supabase
      .from('curriculum_materials')
      .update(materialToDB(data)).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return materialFromDB(row)
  },
  async removeMaterial(id) {
    const { error } = await supabase.from('curriculum_materials').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
