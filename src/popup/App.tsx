import { useMemo, useState } from 'react'

const sampleProjects = ['Product Design', 'Frontend Platform', 'Client Success']
const sampleTasks = ['Feature Build', 'Bug Investigation', 'Client Sync']
const sampleTags = ['notion', 'priority-p2', 'customer-facing']

export default function App() {
  const [project, setProject] = useState(sampleProjects[0])
  const [task, setTask] = useState(sampleTasks[0])
  const [hours, setHours] = useState('1.5')
  const [notes, setNotes] = useState('QA follow-up for ticket comments and release checklist updates.')
  const [isRunning, setIsRunning] = useState(false)

  const formattedDuration = useMemo(() => {
    const parsed = Number.parseFloat(hours)
    if (Number.isNaN(parsed) || parsed <= 0) {
      return '0h 00m'
    }

    const totalMinutes = Math.round(parsed * 60)
    const displayHours = Math.floor(totalMinutes / 60)
    const displayMinutes = totalMinutes % 60
    return `${displayHours}h ${displayMinutes.toString().padStart(2, '0')}m`
  }, [hours])

  return (
    <main className="popup-shell min-h-screen min-w-[360px] px-4 py-5 text-stone-900">
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white/85 shadow-[0_16px_40px_-22px_rgba(42,33,12,0.55)] backdrop-blur-sm">
        <header className="border-b border-black/10 bg-gradient-to-r from-amber-200/70 via-orange-100 to-emerald-100 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700">Harvestion</p>
              <h1 className="mt-1 text-[26px] font-bold leading-none tracking-tight">Notion to Harvest</h1>
            </div>
            <span className="rounded-full border border-emerald-700/20 bg-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-900">
              Notion detected
            </span>
          </div>
          <p className="mt-3 text-sm text-stone-700">
            Capture this ticket as a polished time entry without leaving your flow.
          </p>
        </header>

        <div className="space-y-4 p-5">
          <article className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Current Notion Ticket</p>
            <h2 className="mt-2 text-base font-semibold leading-tight text-stone-900">
              Improve onboarding toast behavior for enterprise workspace switching
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {sampleTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Project</span>
              <select
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                value={project}
                onChange={(event) => setProject(event.target.value)}
              >
                {sampleProjects.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Task</span>
              <select
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                value={task}
                onChange={(event) => setTask(event.target.value)}
              >
                {sampleTasks.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Hours</span>
              <input
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                inputMode="decimal"
                placeholder="0.0"
              />
            </label>
            <span className="rounded-xl border border-stone-300 bg-stone-100 px-3 py-2.5 text-sm font-semibold text-stone-700">
              {formattedDuration}
            </span>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Notes</span>
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Describe what was completed"
            />
          </label>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setIsRunning((value) => !value)}
              className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:bg-stone-100"
            >
              {isRunning ? 'Stop Timer' : 'Start Timer'}
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl border border-orange-500 bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              Create Entry
            </button>
          </div>

          <footer className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
            <span className="font-medium">Project: {project}</span>
            <span className="font-medium">Task: {task}</span>
          </footer>
        </div>
      </section>
    </main>
  )
}
