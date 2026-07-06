import { supabase } from '@/lib/supabase'

// Map link Google Sheet theo loại khóa: { 'IELTS': 'https://...', ... }
export const curriculumSheetService = {
  async getAll() {
    const { data, error } = await supabase.from('curriculum_sheets').select('*')
    if (error) throw new Error(error.message)
    return Object.fromEntries((data ?? []).map(r => [r.course_type, r.sheet_url]))
  },

  async upsert(courseType, sheetUrl) {
    const { error } = await supabase
      .from('curriculum_sheets')
      .upsert(
        { course_type: courseType, sheet_url: sheetUrl, updated_at: new Date().toISOString() },
        { onConflict: 'course_type' },
      )
    if (error) throw new Error(error.message)
  },

  async remove(courseType) {
    const { error } = await supabase.from('curriculum_sheets').delete().eq('course_type', courseType)
    if (error) throw new Error(error.message)
  },
}
