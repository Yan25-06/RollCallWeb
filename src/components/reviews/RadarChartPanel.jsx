import { useEffect, useRef } from 'react'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, BarController, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Button } from '@/components/ui'
import { PlusCircle, TrendingUp } from 'lucide-react'
import { DEFAULT_SKILL_CONFIG } from '@/services/classService'

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, BarController, CategoryScale, LinearScale, BarElement)

// Color palette for overlaid datasets (max 6 visible)
const DATASET_COLORS = [
  { border: 'rgba(30,64,175,0.9)',   bg: 'rgba(30,64,175,0.08)'  }, // navy
  { border: 'rgba(13,148,136,0.9)',  bg: 'rgba(13,148,136,0.08)' }, // teal
  { border: 'rgba(217,119,6,0.9)',   bg: 'rgba(217,119,6,0.08)'  }, // amber
  { border: 'rgba(139,92,246,0.9)',  bg: 'rgba(139,92,246,0.08)' }, // violet
  { border: 'rgba(239,68,68,0.9)',   bg: 'rgba(239,68,68,0.08)'  }, // red
  { border: 'rgba(34,197,94,0.9)',   bg: 'rgba(34,197,94,0.08)'  }, // green
]

const fmtDate = (dateStr) => {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

/**
 * RadarChartPanel — displays skill radar chart with multi-period overlay.
 * Normalizes all scores to % (value/maxScore*100) so skills with different
 * maxScore values are comparable on a single 0–100 axis.
 *
 * @param {Array}    reviews       - sorted DESC review records for this student
 * @param {Array}    skillConfig   - [{ name, maxScore, order }] from class
 * @param {Function} onAddReview   - callback to open ReviewForm for new review
 */
export const RadarChartPanel = ({ reviews = [], skillConfig, onAddReview }) => {
  const skills = skillConfig ?? DEFAULT_SKILL_CONFIG
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  // Show up to 6 most recent periods, display in ASC order on chart
  const visible = [...reviews].slice(0, 6).reverse()

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()

    const labels = skills.map(sk => sk.name)

    const tooltipLabel = (ctx) => {
      const rev = visible[ctx.datasetIndex]
      const skill = skills[ctx.dataIndex]
      const raw = rev?.scores?.[skill?.name]
      const pct = ctx.raw
      return raw != null
        ? ` ${ctx.dataset.label}: ${raw}/${rev?.scoreMax?.[skill?.name] ?? 9} (${pct}%)`
        : ` ${ctx.dataset.label}: —`
    }

    const datasets = visible.map((rev, i) => {
      const color = DATASET_COLORS[i % DATASET_COLORS.length]
      const data = skills.map(sk => {
        const raw = rev.scores?.[sk.name]
        if (raw == null) return 0
        const max = rev.scoreMax?.[sk.name] ?? 9
        return Math.round((raw / max) * 1000) / 10 // % with 1 decimal
      })
      return {
        label: fmtDate(rev.date),
        data,
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        pointBackgroundColor: color.border,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    })

    const sharedPlugins = {
      legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#3B72BD', padding: 12 } },
      tooltip: { callbacks: { label: tooltipLabel } },
    }

    if (skills.length < 3) {
      chartRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            x: {
              ticks: { font: { size: 12, weight: '600', family: "'Plus Jakarta Sans', sans-serif" }, color: '#1B3A6B' },
              grid: { display: false },
            },
            y: {
              min: 0, max: 100,
              ticks: { stepSize: 25, font: { size: 10 }, color: '#7FAADA', callback: v => `${v}%` },
              grid: { color: 'rgba(127,170,218,0.2)' },
            },
          },
          plugins: sharedPlugins,
        },
      })
    } else {
      chartRef.current = new Chart(canvasRef.current, {
        type: 'radar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              min: 0, max: 100,
              ticks: { stepSize: 25, font: { size: 10 }, color: '#7FAADA', callback: v => `${v}%` },
              grid:  { color: 'rgba(127,170,218,0.2)' },
              angleLines: { color: 'rgba(127,170,218,0.3)' },
              pointLabels: {
                font: { size: 12, weight: '600', family: "'Plus Jakarta Sans', sans-serif" },
                color: '#1B3A6B',
              },
            },
          },
          plugins: sharedPlugins,
        },
      })
    }
    return () => chartRef.current?.destroy()
  }, [reviews.length, JSON.stringify(visible.map(r => r.id)), JSON.stringify(skills)])

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[280px]">
        <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center">
          <TrendingUp size={24} className="text-navy-300" />
        </div>
        <div>
          <p className="font-semibold text-navy-700">Chưa có đánh giá nào</p>
          <p className="text-sm text-navy-400 mt-1">Tạo đánh giá đầu tiên để theo dõi năng lực học viên</p>
        </div>
        {onAddReview ? (
          <Button variant="primary" size="sm" onClick={onAddReview} className="flex items-center gap-1.5">
            <PlusCircle size={14} />
            Tạo Đánh Giá Đầu Tiên
          </Button>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Cần tạo mock test trước khi thêm đánh giá
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-navy-800">Biểu đồ năng lực</p>
          <p className="text-xs text-navy-400">{reviews.length} đợt đánh giá · chuẩn hóa 0–100%</p>
        </div>
        {onAddReview ? (
          <Button variant="secondary" size="sm" onClick={onAddReview} className="flex items-center gap-1.5">
            <PlusCircle size={13} />
            Thêm đánh giá
          </Button>
        ) : (
          <span className="text-xs text-navy-400 italic">Tạo mock test trước</span>
        )}
      </div>
      <canvas ref={canvasRef} />
    </div>
  )
}
