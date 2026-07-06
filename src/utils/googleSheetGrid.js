// Chuyển response Google Sheets API v4 → grid [{ value, link }][] cho curriculumImportParser.
// Thuần (không import gì) → test bằng Node: node scripts/test-googlesheet-grid.mjs

export function extractSpreadsheetId(url) {
  const m = String(url || '').match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

// Link của ô: hyperlink toàn ô, hoặc link đầu tiên trong textFormatRuns (link một phần text)
function cellLink(cell) {
  if (!cell) return null
  if (cell.hyperlink) return cell.hyperlink
  const run = (cell.textFormatRuns || []).find(r => r.format?.link?.uri)
  return run ? run.format.link.uri : null
}

// rowData (Sheets API, fields=formattedValue,hyperlink,textFormatRuns) → grid cho parseCurriculumGrid
export function apiRowsToGrid(rowData = []) {
  return rowData.map(row =>
    (row?.values ?? []).map(cell => ({
      value: cell?.formattedValue ?? null,
      link: cellLink(cell),
    })),
  )
}

// Gắn id tổng hợp (ổn định trong phiên) để UI dùng làm key/selectedSessionId —
// dữ liệu từ Sheet không có id như DB.
export function attachIds(months) {
  return months.map((m, mi) => ({
    id: `m${mi}`,
    ...m,
    sessions: m.sessions.map((s, si) => ({
      id: `m${mi}-s${si}`,
      ...s,
      materials: s.materials.map((t, ti) => ({ id: `m${mi}-s${si}-t${ti}`, ...t })),
    })),
  }))
}
