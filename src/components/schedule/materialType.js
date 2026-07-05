// Loại tài liệu giảng dạy — dùng bởi SessionDetailPanel để hiển thị badge màu.
export const MATERIAL_TYPES = [
  { value: 'ppt',      label: 'PPT',       badge: 'bg-blue-100 text-blue-700' },
  { value: 'handout',  label: 'Handout',   badge: 'bg-green-100 text-green-700' },
  { value: 'reading',  label: 'Đọc dịch',  badge: 'bg-purple-100 text-purple-700' },
  { value: 'homework', label: 'Homework',  badge: 'bg-orange-100 text-orange-700' },
  { value: 'other',    label: 'Khác',      badge: 'bg-navy-50 text-navy-700' },
]

const TYPE_MAP = Object.fromEntries(MATERIAL_TYPES.map(t => [t.value, t]))

export const getMaterialType = (value) => TYPE_MAP[value] ?? TYPE_MAP.other
