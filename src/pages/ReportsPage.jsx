import { useState, useEffect } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { ReportCard } from '@/components/reports/ReportCard'
import { Modal } from '@/components/ui'
import { classService }          from '@/services/classService'
import { studentService }        from '@/services/studentService'
import { enrollmentService }     from '@/services/enrollmentService'
import { sessionService }        from '@/services/sessionService'
import { attendanceService }     from '@/services/attendanceService'
import { mockTestService }       from '@/services/mockTestService'
import { mockTestResultService } from '@/services/mockTestResultService'
import { paymentService }        from '@/services/paymentService'
import { homeworkService }       from '@/services/homeworkService'
import { fmtVND, fmtDate } from '@/utils/helpers'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const BASE_CHART_OPTS = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
  scales: { y: { beginAtZero: true } },
}

const monthsBetween = (from, to) => {
  const result = []
  const cur = new Date(from + '-01')
  const end = new Date(to + '-01')
  while (cur <= end) {
    result.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return result
}

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const sixMonthsAgo = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 5)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const fmtMonth = (m) => { const [y, mo] = m.split('-'); return `${mo}/${y}` }

// Golden-angle HSL for distinct colors with many series
const genColor = (i) => `hsl(${Math.round((i * 137.508) % 360)}, 60%, 45%)`

// ─── Attendance card ──────────────────────────────────────
const AttendanceCard = ({ classId }) => {
  const [fromMonth,   setFromMonth]   = useState(sixMonthsAgo())
  const [toMonth,     setToMonth]     = useState(currentMonth())
  const [loading,     setLoading]     = useState(false)
  const [chartData,   setChartData]   = useState(null)
  const [tableRows,   setTableRows]   = useState([])
  const [hasData,     setHasData]     = useState(false)
  const [months,      setMonths]      = useState([])
  const [drillMonth,  setDrillMonth]  = useState(null)
  const [drillRows,   setDrillRows]   = useState([])
  // cached data for drill-down reuse
  const [cachedSessions,    setCachedSessions]    = useState([])
  const [cachedAttendance,  setCachedAttendance]  = useState([])
  const [cachedStudents,    setCachedStudents]    = useState([])

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    const load = async () => {
      try {
        const ms = monthsBetween(fromMonth, toMonth)
        const [sessions, allAttendance, enrollments, allStudents] = await Promise.all([
          sessionService.getByClass(classId),
          attendanceService.getByClass(classId),
          enrollmentService.getByClass(classId),
          studentService.getAll(),
        ])
        const activeEnrollments = enrollments.filter(e => e.status !== 'dropped')
        const students = allStudents.filter(s => activeEnrollments.some(e => e.studentId === s.id))
        setCachedSessions(sessions)
        setCachedAttendance(allAttendance)
        setCachedStudents(students)

        const labels = ms.map(fmtMonth)
        const attMap = new Map(allAttendance.map(a => [`${a.sessionId}_${a.studentId}`, a]))

        const dataByMonth = ms.map(m => {
          const monthSessions = sessions.filter(s => s.date.startsWith(m))
          if (!monthSessions.length) return null
          let present = 0, total = 0
          students.forEach(s => {
            monthSessions.forEach(ses => {
              const a = attMap.get(`${ses.id}_${s.id}`)
              total++
              if (!a || a.present !== false) present++
            })
          })
          return total ? Math.round((present / total) * 100) : null
        })

        const hasDataNow = dataByMonth.some(d => d !== null)
        const rows = ms.map((m, i) => ({ month: labels[i], rate: dataByMonth[i] != null ? `${dataByMonth[i]}%` : '—' }))
        setHasData(hasDataNow)
        setTableRows(rows)
        setMonths(ms)
        setChartData({
          labels,
          datasets: [{ data: dataByMonth, backgroundColor: 'rgba(30,64,175,0.7)', borderRadius: 6, spanGaps: true }],
        })
      } catch { /* show empty */ }
      finally { setLoading(false) }
    }
    load()
  }, [classId, fromMonth, toMonth])

  const handleBarClick = (_, elements) => {
    if (!elements.length) return
    const idx = elements[0].index
    const month = months[idx]
    const attMap = new Map(cachedAttendance.map(a => [`${a.sessionId}_${a.studentId}`, a]))
    const monthSessions = cachedSessions.filter(s => s.date.startsWith(month))
    const rows = []
    monthSessions.forEach(ses => {
      cachedStudents.forEach(st => {
        const a = attMap.get(`${ses.id}_${st.id}`)
        rows.push({
          date: fmtDate(ses.date),
          topic: ses.topic || '—',
          student: st.name,
          status: (!a || a.present !== false) ? 'Có mặt' : 'Vắng',
        })
      })
    })
    setDrillRows(rows)
    setDrillMonth(month)
  }

  const excelCols = [{ key: 'month', label: 'Tháng' }, { key: 'rate', label: 'Tỉ lệ có mặt' }]

  return (
    <>
      <ReportCard
        title="Điểm danh theo tháng"
        hasData={hasData}
        excelRows={tableRows}
        excelColumns={excelCols}
        excelFilename="bao-cao-diem-danh"
        pdfFilename="bao-cao-diem-danh"
        filters={
          <div className="flex flex-wrap gap-2 items-center">
            <input type="month" className="input text-xs py-1 w-32" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
            <span className="text-navy-400 text-xs">→</span>
            <input type="month" className="input text-xs py-1 w-32" value={toMonth} onChange={e => setToMonth(e.target.value)} />
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-navy-400 py-8 text-center">Đang tải...</p>
        ) : !hasData ? (
          <p className="text-sm text-navy-400 py-8 text-center">Chưa có dữ liệu điểm danh trong khoảng thời gian này</p>
        ) : (
          <Bar
            data={chartData}
            options={{
              ...BASE_CHART_OPTS,
              scales: { y: { beginAtZero: true, max: 100 } },
              onClick: handleBarClick,
            }}
          />
        )}
      </ReportCard>

      <Modal open={!!drillMonth} onClose={() => setDrillMonth(null)} title={`Chi tiết điểm danh — ${drillMonth ? fmtMonth(drillMonth) : ''}`}>
        {drillRows.length === 0 ? (
          <p className="text-sm text-navy-400 py-4 text-center">Không có dữ liệu</p>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy-100">
                  <th className="py-2 pr-3 font-medium text-navy-600">Ngày</th>
                  <th className="py-2 pr-3 font-medium text-navy-600">Buổi</th>
                  <th className="py-2 pr-3 font-medium text-navy-600">Học viên</th>
                  <th className="py-2 font-medium text-navy-600">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {drillRows.map((r, i) => (
                  <tr key={i} className="border-b border-navy-50">
                    <td className="py-1.5 pr-3 text-navy-700">{r.date}</td>
                    <td className="py-1.5 pr-3 text-navy-500 truncate max-w-[120px]">{r.topic}</td>
                    <td className="py-1.5 pr-3 text-navy-700">{r.student}</td>
                    <td className={`py-1.5 font-medium ${r.status === 'Vắng' ? 'text-red-500' : 'text-green-600'}`}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  )
}

// ─── Mock Test card ───────────────────────────────────────
const MockTestCard = ({ classId }) => {
  const [classStudents, setClassStudents] = useState([])
  const [studentId,     setStudentId]     = useState('')
  const [loading,       setLoading]       = useState(false)
  const [chartData,     setChartData]     = useState(null)
  const [tableRows,     setTableRows]     = useState([])
  const [excelCols,     setExcelCols]     = useState([])
  const [hasData,       setHasData]       = useState(false)

  useEffect(() => {
    if (!classId) return
    Promise.all([
      enrollmentService.getByClass(classId),
      studentService.getAll(),
    ]).then(([enrollments, allStudents]) => {
      const active = enrollments.filter(e => e.status !== 'dropped')
      setClassStudents(allStudents.filter(s => active.some(e => e.studentId === s.id)))
      setStudentId('')
    }).catch(() => setClassStudents([]))
  }, [classId])

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    const load = async () => {
      try {
        const [tests, results] = await Promise.all([
          mockTestService.getByClass(classId),
          mockTestResultService.getByClass(classId),
        ])
        const sorted = [...tests].reverse()
        const targetStudents = studentId
          ? classStudents.filter(s => s.id === studentId)
          : classStudents

        if (sorted.length < 2) { setHasData(false); setLoading(false); return }

        const labels = sorted.map(t => fmtDate(t.date))
        const datasets = targetStudents.map((s, i) => ({
          label: s.name,
          data: sorted.map(t => {
            const r = results.find(r => r.mockTestId === t.id && r.studentId === s.id)
            return r ? r.totalScore : null
          }),
          borderColor: genColor(i),
          backgroundColor: genColor(i).replace(')', ', 0.12)').replace('hsl(', 'hsla('),
          tension: 0.3,
          spanGaps: true,
          pointRadius: 4,
        }))

        const rows = sorted.map((t, i) => ({
          date: labels[i],
          ...Object.fromEntries(targetStudents.map(s => {
            const r = results.find(r => r.mockTestId === t.id && r.studentId === s.id)
            return [s.name, r ? r.totalScore : '—']
          }))
        }))

        setChartData({ labels, datasets })
        setTableRows(rows)
        setExcelCols([
          { key: 'date', label: 'Ngày' },
          ...targetStudents.map(s => ({ key: s.name, label: s.name }))
        ])
        setHasData(true)
      } catch { setHasData(false) }
      finally { setLoading(false) }
    }
    load()
  }, [classId, studentId, classStudents])

  return (
    <ReportCard
      title="Tiến độ Mock Test"
      hasData={hasData}
      excelRows={tableRows}
      excelColumns={excelCols}
      excelFilename="bao-cao-mock-test"
      pdfFilename="bao-cao-mock-test"
      filters={
        <div className="flex flex-wrap gap-2 items-center">
          <select className="select text-xs py-1" value={studentId} onChange={e => setStudentId(e.target.value)}>
            <option value="">Tất cả học viên</option>
            {classStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-navy-400 py-8 text-center">Đang tải...</p>
      ) : !hasData ? (
        <p className="text-sm text-navy-400 py-8 text-center">Cần ít nhất 2 mốc Mock Test để vẽ tiến độ</p>
      ) : (
        <Line
          data={chartData}
          options={{
            ...BASE_CHART_OPTS,
            plugins: {
              ...BASE_CHART_OPTS.plugins,
              legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            },
          }}
        />
      )}
    </ReportCard>
  )
}

// ─── Fees card ────────────────────────────────────────────
const FeesReportCard = ({ classId }) => {
  const [fromMonth,  setFromMonth]  = useState(sixMonthsAgo())
  const [toMonth,    setToMonth]    = useState(currentMonth())
  const [loading,    setLoading]    = useState(false)
  const [chartData,  setChartData]  = useState(null)
  const [tableRows,  setTableRows]  = useState([])
  const [hasData,    setHasData]    = useState(false)
  const [months,     setMonths]     = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [drillMonth, setDrillMonth] = useState(null)
  const [drillRows,  setDrillRows]  = useState([])

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      try {
        const ms = monthsBetween(fromMonth, toMonth)
        const allPaymentsArrays = await Promise.all(ms.map(m => paymentService.getByPeriod(m)))

        const totals = allPaymentsArrays.map(payments =>
          payments.reduce((s, p) => s + (p.amount ?? 0), 0)
        )

        const hasDataNow = totals.some(t => t > 0)
        const labels = ms.map(fmtMonth)
        const rows = ms.map((m, i) => ({ month: labels[i], total: fmtVND(totals[i]) }))

        setHasData(hasDataNow)
        setTableRows(rows)
        setMonths(ms)
        setAllPayments(allPaymentsArrays)
        setChartData({
          labels,
          datasets: [{ data: totals, backgroundColor: 'rgba(5,150,105,0.7)', borderRadius: 6 }],
        })
      } catch { /* show empty */ }
      finally { setLoading(false) }
    }
    load()
  }, [classId, fromMonth, toMonth])

  const handleBarClick = (_, elements) => {
    if (!elements.length) return
    const idx = elements[0].index
    const monthPayments = allPayments[idx] ?? []
    const rows = monthPayments.map(p => ({
      studentId: p.studentId,
      amount: fmtVND(p.amount ?? 0),
      paidAt: p.paidAt ? fmtDate(p.paidAt) : '—',
      method: p.method || '—',
    }))
    setDrillRows(rows)
    setDrillMonth(months[idx])
  }

  const excelCols = [{ key: 'month', label: 'Tháng' }, { key: 'total', label: 'Tổng thu' }]

  return (
    <>
      <ReportCard
        title="Tổng thu Học phí"
        hasData={hasData}
        excelRows={tableRows}
        excelColumns={excelCols}
        excelFilename="bao-cao-hoc-phi"
        pdfFilename="bao-cao-hoc-phi"
        filters={
          <div className="flex flex-wrap gap-2 items-center">
            <input type="month" className="input text-xs py-1 w-32" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
            <span className="text-navy-400 text-xs">→</span>
            <input type="month" className="input text-xs py-1 w-32" value={toMonth} onChange={e => setToMonth(e.target.value)} />
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-navy-400 py-4 text-center">Đang tải...</p>
        ) : !hasData ? (
          <p className="text-sm text-navy-400 py-4 text-center">Chưa có dữ liệu thanh toán</p>
        ) : (
          <Bar
            data={chartData}
            options={{
              ...BASE_CHART_OPTS,
              plugins: {
                ...BASE_CHART_OPTS.plugins,
                tooltip: {
                  callbacks: {
                    label: ctx => fmtVND(ctx.parsed.y),
                  },
                },
              },
              onClick: handleBarClick,
            }}
          />
        )}
      </ReportCard>

      <Modal open={!!drillMonth} onClose={() => setDrillMonth(null)} title={`Chi tiết học phí — ${drillMonth ? fmtMonth(drillMonth) : ''}`}>
        {drillRows.length === 0 ? (
          <p className="text-sm text-navy-400 py-4 text-center">Không có thanh toán nào trong tháng này</p>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy-100">
                  <th className="py-2 pr-3 font-medium text-navy-600">Ngày đóng</th>
                  <th className="py-2 pr-3 font-medium text-navy-600">Số tiền</th>
                  <th className="py-2 font-medium text-navy-600">Phương thức</th>
                </tr>
              </thead>
              <tbody>
                {drillRows.map((r, i) => (
                  <tr key={i} className="border-b border-navy-50">
                    <td className="py-1.5 pr-3 text-navy-700">{r.paidAt}</td>
                    <td className="py-1.5 pr-3 text-navy-700 font-medium">{r.amount}</td>
                    <td className="py-1.5 text-navy-500">{r.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  )
}

// ─── Homework Progress card ───────────────────────────────
const HomeworkProgressCard = ({ classId }) => {
  const [loading,   setLoading]   = useState(false)
  const [chartData, setChartData] = useState(null)
  const [tableRows, setTableRows] = useState([])
  const [hasData,   setHasData]   = useState(false)

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    const load = async () => {
      try {
        const [sessions, homeworks] = await Promise.all([
          sessionService.getByClass(classId),
          homeworkService.getByClass(classId),
        ])

        if (!sessions.length || !homeworks.length) {
          setHasData(false)
          setLoading(false)
          return
        }

        const sessionDateMap = new Map(sessions.map(s => [s.id, s.date]))

        // Group by month
        const monthMap = {}
        sessions.forEach(s => {
          const m = s.date.substring(0, 7)
          if (!monthMap[m]) monthMap[m] = new Set()
          monthMap[m].add(s.id)
        })

        const sortedMonths = Object.keys(monthMap).sort()
        const data = sortedMonths.map(m => {
          const sessionIds = monthMap[m]
          const monthHWs = homeworks.filter(hw => sessionIds.has(hw.sessionId))
          const total = monthHWs.length
          const done = monthHWs.filter(hw => hw.progress === 'done' || hw.progress === 100).length
          return { total, done }
        })

        const hasDataNow = data.some(d => d.total > 0)
        const labels = sortedMonths.map(fmtMonth)
        const rows = sortedMonths.map((m, i) => ({
          month: labels[i],
          total: data[i].total,
          done: data[i].done,
          rate: data[i].total ? `${Math.round((data[i].done / data[i].total) * 100)}%` : '—',
        }))

        setHasData(hasDataNow)
        setTableRows(rows)
        setChartData({
          labels,
          datasets: [
            {
              label: 'Tổng giao',
              data: data.map(d => d.total),
              backgroundColor: 'rgba(30,64,175,0.3)',
              borderColor: 'rgba(30,64,175,0.8)',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Hoàn thành',
              data: data.map(d => d.done),
              backgroundColor: 'rgba(5,150,105,0.7)',
              borderColor: 'rgba(5,150,105,1)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        })
      } catch { /* show empty */ }
      finally { setLoading(false) }
    }
    load()
  }, [classId])

  const excelCols = [
    { key: 'month', label: 'Tháng' },
    { key: 'total', label: 'Tổng giao' },
    { key: 'done', label: 'Hoàn thành' },
    { key: 'rate', label: 'Tỉ lệ' },
  ]

  return (
    <ReportCard
      title="Tiến độ Bài tập"
      hasData={hasData}
      excelRows={tableRows}
      excelColumns={excelCols}
      excelFilename="bao-cao-bai-tap"
      pdfFilename="bao-cao-bai-tap"
    >
      {loading ? (
        <p className="text-sm text-navy-400 py-8 text-center">Đang tải...</p>
      ) : !hasData ? (
        <p className="text-sm text-navy-400 py-8 text-center">Lớp này chưa có dữ liệu bài tập</p>
      ) : (
        <Bar
          data={chartData}
          options={{
            ...BASE_CHART_OPTS,
            plugins: {
              ...BASE_CHART_OPTS.plugins,
              legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            },
          }}
        />
      )}
    </ReportCard>
  )
}

// ─── ReportsPage ──────────────────────────────────────────
export const ReportsPage = () => {
  const [classes,         setClasses]         = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')

  useEffect(() => {
    classService.getAll().then(cls => {
      setClasses(cls)
      if (cls.length > 0) setSelectedClassId(cls[0].id)
    }).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Báo cáo</h1>
          <p className="text-sm text-navy-400 mt-0.5">Tổng hợp điểm danh, Mock Test, học phí và bài tập</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-navy-600 whitespace-nowrap">Lớp:</label>
          <select
            className="select text-sm py-1.5 min-w-[160px]"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AttendanceCard classId={selectedClassId} />
        <MockTestCard classId={selectedClassId} />
        <FeesReportCard classId={selectedClassId} />
        <HomeworkProgressCard classId={selectedClassId} />
      </div>
    </div>
  )
}
