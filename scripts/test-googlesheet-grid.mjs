import assert from 'node:assert/strict'
import { extractSpreadsheetId, apiRowsToGrid, attachIds } from '../src/utils/googleSheetGrid.js'

let passed = 0
const test = (name, fn) => { fn(); passed++; console.log('  ✓', name) }

// ── extractSpreadsheetId ──
test('extractSpreadsheetId lấy id từ URL đầy đủ', () => {
  assert.equal(
    extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1AbC-xYz_123/edit#gid=0'),
    '1AbC-xYz_123',
  )
})
test('extractSpreadsheetId trả null khi link sai', () => {
  assert.equal(extractSpreadsheetId('https://example.com/foo'), null)
  assert.equal(extractSpreadsheetId(''), null)
  assert.equal(extractSpreadsheetId(null), null)
})
test('extractSpreadsheetId lấy id từ URL có /u/n/ (nhiều tài khoản Google)', () => {
  assert.equal(
    extractSpreadsheetId('https://docs.google.com/spreadsheets/u/1/d/1AbC-xYz_123/edit#gid=0'),
    '1AbC-xYz_123',
  )
})

// ── apiRowsToGrid ──
test('apiRowsToGrid map formattedValue + hyperlink của ô', () => {
  const rowData = [
    { values: [{ formattedValue: 'THÁNG 1: CƠ BẢN' }] },
    { values: [{ formattedValue: 'Tuần 1' }, { formattedValue: '1', hyperlink: 'https://a.com' }] },
  ]
  const grid = apiRowsToGrid(rowData)
  assert.deepEqual(grid[0][0], { value: 'THÁNG 1: CƠ BẢN', link: null })
  assert.deepEqual(grid[1][1], { value: '1', link: 'https://a.com' })
})
test('apiRowsToGrid lấy link từ textFormatRuns khi không có hyperlink', () => {
  const rowData = [{
    values: [{
      formattedValue: 'Handout: HANDOUT-B1',
      textFormatRuns: [{ startIndex: 0 }, { startIndex: 9, format: { link: { uri: 'https://doc.com/h1' } } }],
    }],
  }]
  assert.equal(apiRowsToGrid(rowData)[0][0].link, 'https://doc.com/h1')
})
test('apiRowsToGrid chịu được dòng/ô rỗng', () => {
  const grid = apiRowsToGrid([{}, { values: [{}] }, undefined])
  assert.deepEqual(grid[0], [])
  assert.deepEqual(grid[1][0], { value: null, link: null })
  assert.deepEqual(grid[2], [])
})

// ── attachIds ──
test('attachIds gắn id ổn định cho tháng/buổi/tài liệu', () => {
  const months = [{
    monthNo: 2, title: 'CHỦ ĐỀ', sessions: [{
      weekNo: 1, sessionNo: 3, skill: 'Reading', content: 'Bài 1', note: null,
      materials: [{ type: 'ppt', title: 'PPT', url: 'https://a.com' }],
    }],
  }]
  const tree = attachIds(months)
  assert.equal(tree[0].id, 'm0')
  assert.equal(tree[0].sessions[0].id, 'm0-s0')
  assert.equal(tree[0].sessions[0].materials[0].id, 'm0-s0-t0')
  // Giữ nguyên field gốc
  assert.equal(tree[0].sessions[0].sessionNo, 3)
  assert.equal(tree[0].sessions[0].materials[0].url, 'https://a.com')
})
test('attachIds không trùng id khi 2 tháng có cùng monthNo (lỗi nhập liệu trên Sheet)', () => {
  const months = [
    { monthNo: 2, title: 'CHỦ ĐỀ A', sessions: [{ sessionNo: 1, materials: [] }] },
    { monthNo: 2, title: 'CHỦ ĐỀ B (trùng số tháng)', sessions: [{ sessionNo: 1, materials: [] }] },
  ]
  const tree = attachIds(months)
  assert.notEqual(tree[0].id, tree[1].id)
  assert.equal(tree[0].id, 'm0')
  assert.equal(tree[1].id, 'm1')
  assert.notEqual(tree[0].sessions[0].id, tree[1].sessions[0].id)
})

console.log(`\n${passed} tests passed ✓`)
