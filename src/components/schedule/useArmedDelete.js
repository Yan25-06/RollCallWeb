import { useState, useEffect, useCallback } from 'react'

/**
 * useArmedDelete — cơ chế xóa 2 bước dùng chung.
 * Bấm lần 1 "vũ trang" (armedId = id, tự hủy sau `timeout` ms),
 * bấm lần 2 cùng id mới thực sự gọi onDelete.
 */
export const useArmedDelete = (timeout = 3000) => {
  const [armedId, setArmedId] = useState(null)

  useEffect(() => {
    if (armedId === null) return
    const t = setTimeout(() => setArmedId(null), timeout)
    return () => clearTimeout(t)
  }, [armedId, timeout])

  const fire = useCallback((id, onDelete) => {
    if (armedId !== id) { setArmedId(id); return }
    setArmedId(null)
    onDelete()
  }, [armedId])

  return { armedId, fire }
}
