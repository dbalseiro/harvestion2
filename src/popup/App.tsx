import { useEffect, useMemo, useState } from 'react'
import type {
  HarvestCurrentUser,
  HarvestProject,
  HarvestSettingsStatus,
  HarvestTask,
  MessageResponse,
} from '@/lib/harvest'

const notionTags = ['notion', 'priority-p2', 'customer-facing']

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function parseResponse<T>(response: MessageResponse<T>) {
  if (response.ok) {
    return response.data
  }

  throw new Error(response.error)
}

export default function App() {
  const [hours, setHours] = useState('')
  const [notes, setNotes] = useState('')
  const [projectQuery, setProjectQuery] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false)
  const [activeProjectIndex, setActiveProjectIndex] = useState(0)
  const [activeTaskIndex, setActiveTaskIndex] = useState(0)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [projects, setProjects] = useState<HarvestProject[]>([])
  const [tasks, setTasks] = useState<HarvestTask[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [message, setMessage] = useState('')
  const [messageVariant, setMessageVariant] = useState<'success' | 'error' | 'info'>('info')

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

  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase()
    if (query === '') {
      return projects
    }

    return projects.filter((project) => {
      const code = project.code?.toLowerCase() ?? ''
      return project.name.toLowerCase().includes(query) || code.includes(query)
    })
  }, [projectQuery, projects])

  const filteredTasks = useMemo(() => {
    const query = taskQuery.trim().toLowerCase()
    if (query === '') {
      return tasks
    }

    return tasks.filter((task) => task.name.toLowerCase().includes(query))
  }, [taskQuery, tasks])

  const loadProjects = async () => {
    setIsLoadingProjects(true)
    setMessage('')

    try {
      const projectsResponse = (await chrome.runtime.sendMessage({
        type: 'harvest:getProjects',
      })) as MessageResponse<HarvestProject[]>

      const fetchedProjects = parseResponse(projectsResponse)
      const sortedProjects = [...fetchedProjects].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
      console.log('[Harvestion][popup] Projects loaded:', sortedProjects)
      setProjects(sortedProjects)
      setProjectQuery('')
      setTaskQuery('')
      setIsProjectMenuOpen(false)
      setIsTaskMenuOpen(false)

      const nextProject = sortedProjects[0] ?? null
      setSelectedProjectId(nextProject?.id ?? null)
      setTasks([])
      setSelectedTaskId(null)

      if (sortedProjects.length === 0) {
        setMessageVariant('info')
        setMessage('No active Harvest projects were returned for this account.')
      }
    } catch (error) {
      console.error('[Harvestion][popup] Failed to load projects:', error)
      setMessageVariant('error')
      setMessage(error instanceof Error ? error.message : 'Failed to load Harvest projects.')
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const loadTasks = async (projectId: number) => {
    setIsLoadingTasks(true)
    setMessage('')

    try {
      const tasksResponse = (await chrome.runtime.sendMessage({
        type: 'harvest:getProjectTasks',
        projectId,
      })) as MessageResponse<HarvestTask[]>

      const fetchedTasks = parseResponse(tasksResponse)
      const sortedTasks = [...fetchedTasks].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
      console.log('[Harvestion][popup] Tasks loaded:', sortedTasks)
      setTasks(sortedTasks)
      setTaskQuery('')
      setIsTaskMenuOpen(false)
      setSelectedTaskId(sortedTasks[0]?.id ?? null)

      if (sortedTasks.length === 0) {
        setMessageVariant('info')
        setMessage('This project has no active task assignments in Harvest.')
      }
    } catch (error) {
      console.error('[Harvestion][popup] Failed to load tasks:', error)
      setMessageVariant('error')
      setMessage(error instanceof Error ? error.message : 'Failed to load project tasks.')
    } finally {
      setIsLoadingTasks(false)
    }
  }

  useEffect(() => {
    const boot = async () => {
      try {
        const statusResponse = (await chrome.runtime.sendMessage({
          type: 'harvest:getSettingsStatus',
        })) as MessageResponse<HarvestSettingsStatus>

        const status = parseResponse(statusResponse)
        setConfigured(status.configured)

        if (status.configured) {
          try {
            const userResponse = (await chrome.runtime.sendMessage({
              type: 'harvest:getCurrentUser',
            })) as MessageResponse<HarvestCurrentUser>

            const user = parseResponse(userResponse)
            console.info('[Harvestion][popup] Current user id loaded:', user.id)
          } catch (error) {
            console.error('[Harvestion][popup] Failed to fetch current user:', error)
          }

          await loadProjects()
        } else {
          console.warn('[Harvestion][popup] Harvest is not configured')
        }
      } catch (error) {
        console.error('[Harvestion][popup] Boot failed:', error)
        setConfigured(false)
        setMessageVariant('error')
        setMessage(error instanceof Error ? error.message : 'Failed to check Harvest settings.')
      }
    }

    void boot()
  }, [])

  useEffect(() => {
    if (selectedProjectId === null) {
      return
    }

    void loadTasks(selectedProjectId)
  }, [selectedProjectId])

  const openSettings = async () => {
    try {
      await chrome.runtime.openOptionsPage()
    } catch {
      const optionsUrl = chrome.runtime.getURL('src/options/index.html')
      window.open(optionsUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCreateEntry = async () => {
    if (selectedProjectId === null || selectedTaskId === null) {
      setMessageVariant('error')
      setMessage('Select both a project and task before creating a time entry.')
      return
    }

    const parsedHours = hours.trim() === '' ? undefined : Number.parseFloat(hours)

    if (parsedHours !== undefined && (Number.isNaN(parsedHours) || parsedHours <= 0)) {
      setMessageVariant('error')
      setMessage('Hours must be a positive number.')
      return
    }

    const isTimer = parsedHours === undefined

    setIsCreatingEntry(true)
    setMessage('')

    try {
      const createResponse = (await chrome.runtime.sendMessage({
        type: 'harvest:createTimeEntry',
        payload: {
          projectId: selectedProjectId,
          taskId: selectedTaskId,
          spentDate: todayIsoDate(),
          notes: notes.trim(),
          ...(parsedHours !== undefined ? { hours: parsedHours } : {}),
        },
      })) as MessageResponse<{ id: number }>

      const created = parseResponse(createResponse)
      setMessageVariant('success')
      setMessage(isTimer ? `Timer started in Harvest (ID ${created.id}).` : `Time entry created in Harvest (ID ${created.id}).`)
    } catch (error) {
      console.error('[Harvestion][popup] Failed to create time entry:', error)
      setMessageVariant('error')
      setMessage(error instanceof Error ? error.message : 'Failed to create Harvest time entry.')
    } finally {
      setIsCreatingEntry(false)
    }
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null

  const chooseProjectOption = (project: HarvestProject) => {
    setSelectedProjectId(project.id)
    setIsProjectMenuOpen(false)
  }

  const chooseTaskOption = (task: HarvestTask) => {
    setSelectedTaskId(task.id)
    setIsTaskMenuOpen(false)
  }

  return (
    <main className="popup-shell min-h-screen min-w-[360px] px-4 py-5 text-stone-900">
      <section className="mx-auto w-full max-w-md overflow-visible rounded-3xl border border-black/10 bg-white/85 shadow-[0_16px_40px_-22px_rgba(42,33,12,0.55)] backdrop-blur-sm">
        <header className="border-b border-black/10 bg-gradient-to-r from-amber-200/70 via-orange-100 to-emerald-100 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700">Harvestion</p>
              <h1 className="mt-1 text-[26px] font-bold leading-none tracking-tight">Notion to Harvest</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void loadProjects()
                }}
                aria-label="Refresh projects"
                disabled={configured !== true || isLoadingProjects || isLoadingTasks}
                className="rounded-full border border-stone-400/40 bg-white/80 p-2 text-stone-600 transition hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 15.56-6.36"/>
                  <path d="M18 3v6h-6"/>
                  <path d="M21 12a9 9 0 0 1-15.56 6.36"/>
                  <path d="M6 21v-6h6"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  void openSettings()
                }}
                aria-label="Settings"
                className="rounded-full border border-stone-400/40 bg-white/80 p-2 text-stone-600 transition hover:bg-white hover:text-stone-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-stone-700">
            Capture this ticket as a polished time entry without leaving your flow.
          </p>
        </header>

        <div className="space-y-4 p-5">
          {configured === false && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              Harvest is not configured yet. Open Settings to add your account ID and personal access token.
            </div>
          )}

          <article className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Current Notion Ticket</p>
            <h2 className="mt-2 text-base font-semibold leading-tight text-stone-900">
              Improve onboarding toast behavior for enterprise workspace switching
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {notionTags.map((tag) => (
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
            <div className="relative space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Project</span>
              <button
                type="button"
                disabled={configured !== true || isLoadingProjects || projects.length === 0}
                onClick={() => {
                  setIsProjectMenuOpen((open) => {
                    const nextOpen = !open
                    if (nextOpen) {
                      const selectedIndex = filteredProjects.findIndex((project) => project.id === selectedProjectId)
                      setActiveProjectIndex(selectedIndex >= 0 ? selectedIndex : 0)
                    }
                    return nextOpen
                  })
                  setIsTaskMenuOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="truncate">
                  {isLoadingProjects
                    ? 'Loading projects...'
                    : selectedProject
                      ? selectedProject.code
                        ? `${selectedProject.code} - ${selectedProject.name}`
                        : selectedProject.name
                      : 'Select project'}
                </span>
                <span className="text-stone-500">▾</span>
              </button>
              {isProjectMenuOpen && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-stone-300 bg-white p-2 shadow-lg">
                  <input
                    autoFocus
                    className="mb-2 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-medium text-stone-800 outline-none placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                    value={projectQuery}
                    onChange={(event) => {
                      setProjectQuery(event.target.value)
                      setActiveProjectIndex(0)
                    }}
                    onKeyDown={(event) => {
                      if (filteredProjects.length === 0) {
                        if (event.key === 'Escape') {
                          setIsProjectMenuOpen(false)
                        }
                        return
                      }

                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setActiveProjectIndex((index) => Math.min(index + 1, filteredProjects.length - 1))
                        return
                      }

                      if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setActiveProjectIndex((index) => Math.max(index - 1, 0))
                        return
                      }

                      if (event.key === 'Enter') {
                        event.preventDefault()
                        const option = filteredProjects[activeProjectIndex] ?? filteredProjects[0]
                        if (option) {
                          chooseProjectOption(option)
                        }
                        return
                      }

                      if (event.key === 'Escape') {
                        setIsProjectMenuOpen(false)
                      }
                    }}
                    placeholder="Filter projects"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-stone-500">No projects match search</p>
                    ) : (
                      filteredProjects.map((project, index) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => {
                            chooseProjectOption(project)
                          }}
                          onMouseEnter={() => setActiveProjectIndex(index)}
                          className={`block w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-100 ${
                            index === activeProjectIndex ? 'bg-orange-50' : ''
                          }`}
                        >
                          {project.code ? `${project.code} - ${project.name}` : project.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Task</span>
              <button
                type="button"
                disabled={configured !== true || isLoadingTasks || tasks.length === 0}
                onClick={() => {
                  setIsTaskMenuOpen((open) => {
                    const nextOpen = !open
                    if (nextOpen) {
                      const selectedIndex = filteredTasks.findIndex((task) => task.id === selectedTaskId)
                      setActiveTaskIndex(selectedIndex >= 0 ? selectedIndex : 0)
                    }
                    return nextOpen
                  })
                  setIsProjectMenuOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="truncate">
                  {isLoadingTasks ? 'Loading tasks...' : selectedTask ? selectedTask.name : 'Select task'}
                </span>
                <span className="text-stone-500">▾</span>
              </button>
              {isTaskMenuOpen && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-stone-300 bg-white p-2 shadow-lg">
                  <input
                    autoFocus
                    className="mb-2 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-medium text-stone-800 outline-none placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                    value={taskQuery}
                    onChange={(event) => {
                      setTaskQuery(event.target.value)
                      setActiveTaskIndex(0)
                    }}
                    onKeyDown={(event) => {
                      if (filteredTasks.length === 0) {
                        if (event.key === 'Escape') {
                          setIsTaskMenuOpen(false)
                        }
                        return
                      }

                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setActiveTaskIndex((index) => Math.min(index + 1, filteredTasks.length - 1))
                        return
                      }

                      if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setActiveTaskIndex((index) => Math.max(index - 1, 0))
                        return
                      }

                      if (event.key === 'Enter') {
                        event.preventDefault()
                        const option = filteredTasks[activeTaskIndex] ?? filteredTasks[0]
                        if (option) {
                          chooseTaskOption(option)
                        }
                        return
                      }

                      if (event.key === 'Escape') {
                        setIsTaskMenuOpen(false)
                      }
                    }}
                    placeholder="Filter tasks"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {filteredTasks.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-stone-500">No tasks match search</p>
                    ) : (
                      filteredTasks.map((task, index) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            chooseTaskOption(task)
                          }}
                          onMouseEnter={() => setActiveTaskIndex(index)}
                          className={`block w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-100 ${
                            index === activeTaskIndex ? 'bg-orange-50' : ''
                          }`}
                        >
                          {task.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
              disabled={configured !== true || isCreatingEntry}
              onClick={() => {
                void handleCreateEntry()
              }}
              className="flex-1 rounded-xl border border-orange-500 bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingEntry ? 'Creating...' : hours.trim() === '' ? 'Start Timer' : 'Create Entry'}
            </button>
          </div>

          {message && (
            <p
              className={`rounded-xl border px-3 py-2 text-xs ${
                messageVariant === 'error'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : messageVariant === 'success'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {message}
            </p>
          )}

          <footer className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
            <span className="font-medium">Project: {selectedProject?.name ?? 'none'}</span>
            <span className="font-medium">Task: {selectedTask?.name ?? 'none'}</span>
          </footer>
        </div>
      </section>
    </main>
  )
}
