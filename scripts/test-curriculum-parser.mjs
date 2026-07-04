import assert from 'node:assert/strict'
import {
  extractFirstUrl,
  parseMaterialsCell,
  parseCurriculumGrid,
} from '../src/utils/curriculumImportParser.js'

const cell = (value, link = null) => ({ value, link })
const empty = { value: null, link: null }
let passed = 0
const test = (name, fn) => { fn(); passed++; console.log('  ✓', name) }

// ── extractFirstUrl ──
test('extractFirstUrl lấy URL đầu tiên, bỏ dấu câu cuối', () => {
  assert.equal(extractFirstUrl('xem: https://a.com/x).'), 'https://a.com/x')
  assert.equal(extractFirstUrl('không có link'), null)
  assert.equal(extractFirstUrl(''), null)
})

// ── parseMaterialsCell: đủ 4 loại ──
test('parseMaterialsCell tách PPT/Handout(link ẩn)/Đọc dịch(code)/Homework', () => {
  const c = cell(
    'PPT: https://canva.link/a\nHandout: HANDOUT-B1\nĐọc dịch: BTB1\nHomework: https://forms.gle/x',
    'https://docs.google.com/document/d/HANDOUT1',
  )
  const m = parseMaterialsCell(c)
  assert.equal(m.length, 4)
  assert.deepEqual(m[0], { type: 'ppt', title: 'PPT', url: 'https://canva.link/a' })
  assert.deepEqual(m[1], { type: 'handout', title: 'HANDOUT-B1', url: 'https://docs.google.com/document/d/HANDOUT1' })
  assert.deepEqual(m[2], { type: 'reading', title: 'BTB1', url: null })
  assert.deepEqual(m[3], { type: 'homework', title: 'Homework', url: 'https://forms.gle/x' })
})

// ── Handout: link ẩn trùng link PPT → bỏ (url null) ──
test('parseMaterialsCell bỏ link ẩn Handout khi trùng link PPT', () => {
  const c = cell(
    'PPT: https://canva.link/x\nHandout: HANDOUT-B\nĐọc dịch:\nHomework: https://forms.gle/y',
    'https://canva.link/x',
  )
  const handout = parseMaterialsCell(c).find(x => x.type === 'handout')
  assert.equal(handout.url, null)
})

// ── Đọc dịch CÓ url trong text → dùng url ──
test('parseMaterialsCell: Đọc dịch có URL thì dùng URL', () => {
  const m = parseMaterialsCell(cell('Đọc dịch: https://docs.google.com/d/z'))
  assert.deepEqual(m, [{ type: 'reading', title: 'Đọc dịch', url: 'https://docs.google.com/d/z' }])
})

// ── Dictation → type reading ──
test('parseMaterialsCell: Dictation map sang type reading', () => {
  const m = parseMaterialsCell(cell('Dictation: NGHE CHÉP CHÍNH TẢ'))
  assert.deepEqual(m, [{ type: 'reading', title: 'NGHE CHÉP CHÍNH TẢ', url: null }])
})

// ── Hai link Homework trong một ô ──
test('parseMaterialsCell: 2 dòng link → 2 homework', () => {
  const m = parseMaterialsCell(cell(
    'Homework: LInk gg form (1): https://forms.gle/a \nLink gg form practice: https://forms.gle/b',
  ))
  const hw = m.filter(x => x.type === 'homework')
  assert.equal(hw.length, 2)
  assert.equal(hw[0].url, 'https://forms.gle/a')
  assert.equal(hw[1].url, 'https://forms.gle/b')
})

// ── Ô tài liệu rỗng → không tạo tài liệu ──
test('parseMaterialsCell: các nhãn rỗng → []', () => {
  assert.deepEqual(parseMaterialsCell(cell('PPT:\nHandout:\nĐọc dịch:\nHomework:')), [])
})

// ── Grid: tháng + forward-fill tuần + buổi + ghi chú ──
test('parseCurriculumGrid: tháng, forward-fill tuần, ghi chú F+G', () => {
  const grid = [
    [cell('THÁNG 1: NỀN TẢNG'), empty, empty, empty, empty, empty, empty],
    [cell('Tuần'), cell('Buổi'), cell('Kỹ năng'), cell('Nội dung'), cell('Tài liệu'), empty, empty],
    [cell('Tuần 1'), cell(1), cell('Reading'), cell('ND1'), cell('PPT: https://canva.link/a'), cell('ghi chú F'), cell('MINI TEST 1')],
    [empty, cell(2), cell('Listening'), cell('ND2'), cell('PPT: https://canva.link/b'), empty, empty],
    [cell('Tuần 2'), cell(3), cell('Reading'), cell('ND3'), cell(''), empty, empty],
  ]
  const { months, warnings } = parseCurriculumGrid(grid)
  assert.equal(warnings.length, 0)
  assert.equal(months.length, 1)
  assert.equal(months[0].monthNo, 1)
  assert.equal(months[0].title, 'NỀN TẢNG')
  assert.equal(months[0].sessions.length, 3)
  assert.equal(months[0].sessions[0].weekNo, 1)
  assert.equal(months[0].sessions[1].weekNo, 1)   // forward-filled
  assert.equal(months[0].sessions[2].weekNo, 2)
  assert.equal(months[0].sessions[0].skill, 'Reading')
  assert.equal(months[0].sessions[0].note, 'ghi chú F\nMINI TEST 1')
  assert.equal(months[0].sessions[2].materials.length, 0)
})

// ── Grid: buổi không có tháng phía trên → warning ──
test('parseCurriculumGrid: buổi mồ côi → warning, không tạo', () => {
  const grid = [
    [empty, cell(5), cell('Reading'), cell('ND'), cell('PPT: https://a.com/x'), empty, empty],
  ]
  const { months, warnings } = parseCurriculumGrid(grid)
  assert.equal(months.length, 0)
  assert.equal(warnings.length, 1)
})

console.log(`\n${passed} test(s) passed.`)
