import { useEffect, useMemo, useState } from 'react'
import type {
  HarvestCurrentUser,
  HarvestProject,
  HarvestSettingsStatus,
  HarvestTask,
  MessageResponse,
} from '@/lib/harvest'

type TicketDetectionResult = {
  isTicket: boolean
  id: string | null
  title: string | null
  pills: string[]
}
const LAST_SELECTION_STORAGE_KEY = 'harvestLastSelection'

type LastSelection = {
  projectId: number
  taskId: number
}

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
  const [isTicketPage, setIsTicketPage] = useState(false)
  const [ticketId, setTicketId] = useState<string>('')
  const [ticketTitle, setTicketTitle] = useState<string>('')
  const [ticketPills, setTicketPills] = useState<string[]>([])
  const [lastSelection, setLastSelection] = useState<LastSelection | null>(null)
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

  const loadProjects = async (preferredSelection?: LastSelection | null) => {
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

      const preferredProject =
        preferredSelection !== null && preferredSelection !== undefined
          ? sortedProjects.find((project) => project.id === preferredSelection.projectId) ?? null
          : null
      const nextProject = preferredProject ?? sortedProjects[0] ?? null
      const nextProjectId = nextProject?.id ?? null
      const preferredTaskId =
        preferredSelection !== null && preferredSelection !== undefined && preferredSelection.projectId === nextProjectId
          ? preferredSelection.taskId
          : undefined

      setSelectedProjectId(nextProjectId)

      if (nextProjectId === null) {
        setTasks([])
        setSelectedTaskId(null)
      } else if (nextProjectId === selectedProjectId) {
        await loadTasks(nextProjectId, preferredTaskId)
      }

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

  const loadTasks = async (projectId: number, preferredTaskId?: number) => {
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
      const preferredTask =
        preferredTaskId !== undefined ? sortedTasks.find((task) => task.id === preferredTaskId) ?? null : null
      setSelectedTaskId((preferredTask ?? sortedTasks[0] ?? null)?.id ?? null)

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
        let storedSelection: LastSelection | null = null
        try {
          const stored = await chrome.storage.local.get(LAST_SELECTION_STORAGE_KEY)
          const parsed = stored[LAST_SELECTION_STORAGE_KEY] as LastSelection | undefined
          if (parsed && typeof parsed.projectId === 'number' && typeof parsed.taskId === 'number') {
            storedSelection = parsed
            setLastSelection(parsed)
          }
        } catch (error) {
          console.error('[Harvestion][popup] Failed to load last selection:', error)
        }

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

          await loadProjects(storedSelection)
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

    const preferredTaskId = lastSelection?.projectId === selectedProjectId ? lastSelection.taskId : undefined
    void loadTasks(selectedProjectId, preferredTaskId)
  }, [selectedProjectId, lastSelection])

  useEffect(() => {
    const detectNotionTicket = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const activeTab = tabs[0]
        const activeUrl = activeTab?.url ?? ''
        const tabId = activeTab?.id
        const isNotion =
          /^https:\/\/([a-z0-9-]+\.)?notion\.so\//i.test(activeUrl) ||
          /^https:\/\/app\.notion\.com\//i.test(activeUrl)

        if (!isNotion || tabId === undefined) {
          setIsTicketPage(false)
          setTicketId('')
          setTicketTitle('')
          setTicketPills([])
          return
        }

        const [execution] = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const root = document.querySelector('main#main') ?? document.body
            const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()

            const rows = Array.from(root.querySelectorAll('[role="row"]'))
            const labels = new Set<string>()
            const propertyValuesByLabel = new Map<string, string>()
            const propertyPairs: Array<{ label: string; value: string }> = []

            for (const row of rows) {
              const labelNode = row.querySelector('[role="cell"][id]')
              const valueNode =
                row.querySelector('[data-testid="property-value"]') ??
                (row.querySelectorAll('[role="cell"]')[1] as HTMLElement | undefined)

              const label = normalize(labelNode?.textContent ?? '')
              const value = normalize(valueNode?.textContent ?? '')

              if (label !== '') {
                labels.add(label)
              }
              if (label !== '' && value !== '') {
                propertyValuesByLabel.set(label.toLowerCase(), value)
                propertyPairs.push({ label, value })
              }
            }

            const hasComments = Array.from(root.querySelectorAll('div')).some(
              (node) => normalize(node.textContent ?? '') === 'Comments',
            )

            const knownLabels = ['Status', 'Priority', 'Assignees', 'Requestor', 'ID', 'Product', 'Blocked?', 'Date']
            const labelMatches = knownLabels.filter((label) => labels.has(label)).length

            let score = 0
            if (labels.has('Status')) score += 2
            if (labels.has('ID')) score += 2
            if (labels.has('Priority')) score += 1
            if (labels.has('Assignees')) score += 1
            if (labels.has('Requestor')) score += 1
            if (hasComments) score += 1

            const hasTicketFields = labelMatches >= 3
            const mediumSignal = hasComments && rows.length >= 2
            const scoreSignal = score >= 5
            const isTicket = hasTicketFields || mediumSignal || scoreSignal

            const titleCandidates: string[] = []

            const h1 = normalize(root.querySelector('h1')?.textContent ?? '')
            if (h1 !== '') {
              titleCandidates.push(h1)
            }

            const titleProperty =
              propertyValuesByLabel.get('title') ?? propertyValuesByLabel.get('name') ?? propertyValuesByLabel.get('ticket')
            if (titleProperty) {
              titleCandidates.push(titleProperty)
            }

            const externalBlock = root.querySelector('.notion-external_object_instance-block')
            if (externalBlock) {
              const externalTexts = Array.from(externalBlock.querySelectorAll('[spellcheck="false"], div'))
                .map((node) => normalize(node.textContent ?? ''))
                .filter((text) => text.length >= 12)
                .filter((text) => text !== 'Open')
              if (externalTexts[0]) {
                titleCandidates.push(externalTexts[0])
              }
            }

            if (titleCandidates.length === 0) {
              const textBlocks = Array.from(root.querySelectorAll('[role="textbox"], .notion-text-block, div'))
                .map((node) => normalize(node.textContent ?? ''))
                .filter((text) => text.length >= 12)
                .filter((text) => text !== 'Comments' && text !== 'Empty')
              if (textBlocks[0]) {
                titleCandidates.push(textBlocks[0])
              }
            }

            const unique = Array.from(new Set(titleCandidates))
            const title = unique[0] ?? null
            const idValue =
              propertyValuesByLabel.get('id') ??
              propertyValuesByLabel.get('ticket id') ??
              propertyValuesByLabel.get('ticket') ??
              null
            const pillDenylist = new Set(['date', 'last edited time', 'id'])
            const emptyValueTokens = new Set(['', 'empty', '-', '--', 'n/a', 'none'])
            const pills = Array.from(
              new Set(
                propertyPairs
                  .filter(({ label, value }) => {
                    const normalizedValue = normalize(value).toLowerCase()
                    return !pillDenylist.has(label.toLowerCase()) && !emptyValueTokens.has(normalizedValue)
                  })
                  .map(({ label, value }) => `${label}: ${value}`),
              ),
            )

            return {
              isTicket,
              id: idValue,
              title,
              pills,
            }
          },
        })

        const result = execution?.result as TicketDetectionResult | undefined
        const detectedTicket = result?.isTicket === true
        const extractedId = result?.id?.trim() ?? ''
        const extractedTitle = result?.title?.trim() ?? ''
        const extractedPills = result?.pills ?? []

        setIsTicketPage(detectedTicket)
        setTicketId(detectedTicket ? extractedId : '')
        setTicketTitle(detectedTicket ? extractedTitle : '')
        setTicketPills(detectedTicket ? extractedPills : [])

        if (detectedTicket && extractedTitle !== '') {
          const formattedNotes = extractedId !== '' ? `[${extractedId}] ${extractedTitle}` : extractedTitle
          setNotes(formattedNotes)
        }
      } catch (error) {
        console.error('[Harvestion][popup] Failed to detect active tab url:', error)
        setIsTicketPage(false)
        setTicketId('')
        setTicketTitle('')
        setTicketPills([])
      }
    }

    void detectNotionTicket()
  }, [])

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

    if (notes.trim() === '') {
      setMessageVariant('error')
      setMessage('Notes are required before creating a time entry or starting a timer.')
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
      setHours('')
      setNotes('')

      const selectionToPersist: LastSelection = {
        projectId: selectedProjectId,
        taskId: selectedTaskId,
      }
      setLastSelection(selectionToPersist)
      try {
        await chrome.storage.local.set({ [LAST_SELECTION_STORAGE_KEY]: selectionToPersist })
      } catch (error) {
        console.error('[Harvestion][popup] Failed to persist last selection:', error)
      }
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
    <main className="popup-shell min-h-screen min-w-[540px] px-4 py-5 text-stone-900">
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

          {isTicketPage && (
            <article className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Current Notion Ticket</p>
              <h2 className="mt-2 text-base font-semibold leading-tight text-stone-900">
                {ticketId !== '' && ticketTitle !== '' ? `[${ticketId}] ${ticketTitle}` : ticketTitle || 'Ticket detected'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {ticketPills.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          )}

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
        </div>
      </section>
    </main>
  )
}
