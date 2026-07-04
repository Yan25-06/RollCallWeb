// Parser giáo trình từ sheet syllabus (Google Sheet xuất .xlsx).
// Lõi thuần: nhận grid [{ value, link }][] — không import xlsx/React → test bằng node.

// Cột trong sheet syllabus (0-based)
const COL = { week: 0, session: 1, skill: 2, content: 3, materials: 4, noteF: 5, noteG: 6, noteH: 7 }

const MONTH_RE = /^\s*THÁNG\s+(\d+)\s*:?\s*(.*)$/i
const WEEK_RE = /tuần\s+(\d+)/i
const URL_RE = /https?:\/\/\S+/

// Nhãn tài liệu → type (khớp cả biến thể không dấu, hoa/thường)
const MATERIAL_LABELS = [
  { re: /^ppt$/i, type: 'ppt' },
  { re: /^handout$/i, type: 'handout' },
  { re: /^(đọc dịch|doc dich|dictation)$/i, type: 'reading' },
  { re: /^homework$/i, type: 'homework' },
]

const DEFAULT_TITLE = { ppt: 'PPT', handout: 'Handout', reading: 'Đọc dịch', homework: 'Homework' }

export function extractFirstUrl(text) {
  if (!text) return null
  const m = String(text).match(URL_RE)
  return m ? m[0].replace(/[)\].,;]+$/, '') : null
}

function labelToType(label) {
  const key = String(label).trim().toLowerCase()
  for (const { re, type } of MATERIAL_LABELS) {
    if (re.test(key)) return type
  }
  return null
}

// Tách 1 ô tài liệu (cột E) → mảng { type, title, url }
export function parseMaterialsCell(cellObj) {
  const text = cellObj?.value != null ? String(cellObj.value) : ''
  const hiddenLink = cellObj?.link || null
  const lines = text.split(/\r?\n/)

  // Tìm trước link PPT để dedupe link ẩn Handout
  let pptUrl = null
  for (const raw of lines) {
    const line = raw.trim()
    const idx = line.indexOf(':')
    if (idx !== -1 && labelToType(line.slice(0, idx)) === 'ppt') {
      pptUrl = extractFirstUrl(line.slice(idx + 1))
      break
    }
  }

  const materials = []
  let currentType = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    let type = null
    let value = line
    const idx = line.indexOf(':')
    if (idx !== -1) {
      const t = labelToType(line.slice(0, idx))
      if (t) { type = t; value = line.slice(idx + 1).trim() }
    }

    if (type) {
      currentType = type
    } else {
      // Dòng nối tiếp (VD link Homework thứ 2) — gắn vào nhãn trước nếu có URL
      if (!currentType) continue
      type = currentType
      value = line
    }

    const url = extractFirstUrl(value)
    if (url) {
      const title = value.replace(url, '').replace(/[-–:]\s*$/, '').trim()
      materials.push({ type, title: title || DEFAULT_TITLE[type], url })
    } else if (value) {
      // Chỉ có mã code, không URL
      let mUrl = null
      if (type === 'handout' && hiddenLink && hiddenLink !== pptUrl) mUrl = hiddenLink
      materials.push({ type, title: value, url: mUrl })
    }
    // value rỗng → bỏ qua nhãn
  }
  return materials
}

const cellText = (c) => (c?.value != null ? String(c.value).trim() : '')

// Parse toàn grid → { months, warnings }
export function parseCurriculumGrid(grid) {
  const months = []
  const warnings = []
  let currentMonth = null
  let currentWeekNo = null

  grid.forEach((row, i) => {
    const aText = cellText(row[COL.week])
    const bCell = row[COL.session]

    // Dòng Tháng
    const mMonth = aText.match(MONTH_RE)
    if (mMonth) {
      currentMonth = { monthNo: Number(mMonth[1]), title: (mMonth[2] || '').trim() || null, sessions: [] }
      months.push(currentMonth)
      currentWeekNo = null
      return
    }

    // Dòng header ("Tuần" | "Buổi")
    if (aText.toLowerCase() === 'tuần' || cellText(bCell).toLowerCase() === 'buổi') return

    // Cập nhật tuần nếu cột A có "Tuần N"
    const mWeek = aText.match(WEEK_RE)
    if (mWeek) currentWeekNo = Number(mWeek[1])

    // Dòng buổi: cột B là số
    const bVal = bCell?.value
    const sessionNo = typeof bVal === 'number'
      ? bVal
      : (cellText(bCell) !== '' && !Number.isNaN(Number(bVal)) ? Number(bVal) : null)
    if (sessionNo == null) return

    if (!currentMonth) {
      warnings.push({ row: i + 1, message: `Buổi ${sessionNo} không thuộc tháng nào (thiếu dòng THÁNG phía trên)` })
      return
    }

    const note = [row[COL.noteF], row[COL.noteG], row[COL.noteH]]
      .map(cellText).filter(Boolean).join('\n') || null

    currentMonth.sessions.push({
      weekNo: currentWeekNo,
      sessionNo,
      skill: cellText(row[COL.skill]) || null,
      content: cellText(row[COL.content]) || null,
      note,
      materials: parseMaterialsCell(row[COL.materials]),
    })
  })

  return { months, warnings }
}

// Adapter mỏng: worksheet SheetJS → grid. Nhận XLSX qua tham số để lõi không phụ thuộc xlsx.
export function worksheetToGrid(ws, XLSX) {
  if (!ws || !ws['!ref']) return []
  const range = XLSX.utils.decode_range(ws['!ref'])
  const grid = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowArr = []
    for (let c = range.s.c; c <= Math.min(range.e.c, COL.noteH); c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      rowArr[c] = cell ? { value: cell.v ?? null, link: cell.l?.Target ?? null } : { value: null, link: null }
    }
    grid.push(rowArr)
  }
  return grid
}

export function parseCurriculumSheet(ws, XLSX) {
  return parseCurriculumGrid(worksheetToGrid(ws, XLSX))
}
