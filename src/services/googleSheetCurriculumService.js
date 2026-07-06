import { parseCurriculumGrid } from '@/utils/curriculumImportParser'
import { extractSpreadsheetId, apiRowsToGrid, attachIds } from '@/utils/googleSheetGrid'

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
// Chỉ lấy field cần thiết — giảm payload đáng kể so với full gridData
const FIELDS = 'sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns))))'

// Đọc giáo trình trực tiếp từ Google Sheet (sheet tab đầu tiên).
// Trả { tree, warnings } — tree cùng shape curriculumService.getByCourseType cũ
// ([{ ...month, sessions: [{ ...session, materials: [] }] }]) để UI con dùng nguyên.
export const googleSheetCurriculumService = {
  async fetchCurriculum(sheetUrl) {
    if (!API_KEY) throw new Error('Chưa cấu hình VITE_GOOGLE_SHEETS_API_KEY trong .env')
    const id = extractSpreadsheetId(sheetUrl)
    if (!id) throw new Error('Link Google Sheet không hợp lệ')

    let res
    try {
      res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${id}?includeGridData=true&fields=${encodeURIComponent(FIELDS)}&key=${API_KEY}`,
      )
    } catch {
      throw new Error('Không kết nối được Google Sheets — kiểm tra mạng')
    }
    if (res.status === 403)
      throw new Error('Không có quyền đọc Sheet — kiểm tra chia sẻ "Ai có link đều xem được" và API key')
    if (res.status === 404) throw new Error('Không tìm thấy Sheet — kiểm tra lại link')
    if (!res.ok) throw new Error(`Google Sheets API lỗi (${res.status})`)

    const json = await res.json()
    const rowData = json.sheets?.[0]?.data?.[0]?.rowData ?? []
    const { months, warnings } = parseCurriculumGrid(apiRowsToGrid(rowData))
    return { tree: attachIds(months), warnings }
  },
}
