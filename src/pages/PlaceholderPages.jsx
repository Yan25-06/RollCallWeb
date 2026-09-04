import { Card } from '@/components/ui'
import { CalendarCheck } from 'lucide-react'

const PlaceholderPage = ({ icon: Icon, title, desc, phase }) => (
  <div className="flex flex-col gap-6 animate-fade-in">
    <div>
      <h1 className="text-2xl font-display font-bold text-navy-900">{title}</h1>
      <p className="text-sm text-navy-400 mt-0.5">{desc}</p>
    </div>
    <Card className="p-12 flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-navy-50 flex items-center justify-center text-navy-300">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-semibold text-navy-700">Đang phát triển</p>
        <p className="text-sm text-navy-400 mt-1">Tính năng này sẽ có trong {phase}</p>
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-navy-50 rounded-full text-xs text-navy-600 font-medium">
        <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-pulse-soft" />
        {phase}
      </div>
    </Card>
  </div>
)

export const AttendancePage = ({ year, month }) => (
  <PlaceholderPage
    icon={CalendarCheck}
    title="Điểm danh"
    desc={`Tháng ${month}/${year}`}
    phase="Phase 3"
  />
)


