import {
  HARVEST_STORAGE_KEY,
  type HarvestProject,
  type HarvestSettings,
  type HarvestTask,
  type MessageRequest,
  type MessageResponse,
} from '@/lib/harvest'

const HARVEST_API_BASE = 'https://api.harvestapp.com/v2'

type HarvestPaginated<T> = {
  total_pages: number
  next_page: number | null
} & T

type HarvestProjectResponse = HarvestPaginated<{
  projects: Array<{
    id: number
    name: string
    code: string | null
    is_active: boolean
  }>
}>

type HarvestTaskAssignmentsResponse = HarvestPaginated<{
  task_assignments: Array<{
    task: {
      id: number
      name: string
      billable_by_default: boolean
      is_active: boolean
    }
  }>
}>

function sendSuccess<T>(sendResponse: (response: MessageResponse<T>) => void, data: T) {
  sendResponse({ ok: true, data })
}

function sendError(sendResponse: (response: MessageResponse) => void, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  sendResponse({ ok: false, error: message })
}

async function getStoredSettings(): Promise<HarvestSettings | null> {
  const stored = await chrome.storage.local.get(HARVEST_STORAGE_KEY)
  const parsed = stored[HARVEST_STORAGE_KEY] as HarvestSettings | undefined

  if (!parsed?.accountId || !parsed?.accessToken) {
    return null
  }

  return parsed
}

function getHeaders(settings: HarvestSettings) {
  return {
    Authorization: `Bearer ${settings.accessToken}`,
    'Harvest-Account-ID': settings.accountId,
    'Content-Type': 'application/json',
  }
}

async function harvestRequest<T>(
  settings: HarvestSettings,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${HARVEST_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getHeaders(settings),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const bodyText = await response.text()
    throw new Error(`Harvest request failed (${response.status}): ${bodyText}`)
  }

  return (await response.json()) as T
}

async function fetchAllProjects(settings: HarvestSettings): Promise<HarvestProject[]> {
  let page = 1
  let totalPages = 1
  const projects: HarvestProject[] = []

  while (page <= totalPages) {
    const data = await harvestRequest<HarvestProjectResponse>(
      settings,
      `/projects?is_active=true&per_page=200&page=${page}`,
    )

    totalPages = data.total_pages
    page += 1

    projects.push(
      ...data.projects.map((project) => ({
        id: project.id,
        name: project.name,
        code: project.code,
        isActive: project.is_active,
      })),
    )
  }

  return projects
}

async function fetchProjectTasks(settings: HarvestSettings, projectId: number): Promise<HarvestTask[]> {
  let page = 1
  let totalPages = 1
  const taskMap = new Map<number, HarvestTask>()

  while (page <= totalPages) {
    const data = await harvestRequest<HarvestTaskAssignmentsResponse>(
      settings,
      `/projects/${projectId}/task_assignments?is_active=true&per_page=200&page=${page}`,
    )

    totalPages = data.total_pages
    page += 1

    for (const assignment of data.task_assignments) {
      const { task } = assignment
      taskMap.set(task.id, {
        id: task.id,
        name: task.name,
        billableByDefault: task.billable_by_default,
        isActive: task.is_active,
      })
    }
  }

  return [...taskMap.values()]
}

async function createTimeEntry(
  settings: HarvestSettings,
  payload: {
    projectId: number
    taskId: number
    spentDate: string
    notes: string
    hours?: number
  },
) {
  const body: Record<string, unknown> = {
    project_id: payload.projectId,
    task_id: payload.taskId,
    spent_date: payload.spentDate,
    notes: payload.notes,
  }
  if (payload.hours !== undefined) {
    body.hours = payload.hours
  }
  return harvestRequest<{ id: number }>(settings, '/time_entries', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

chrome.runtime.onMessage.addListener((request: MessageRequest, _sender, sendResponse) => {
  void (async () => {
    try {
      const settings = await getStoredSettings()

      if (request.type === 'harvest:getSettingsStatus') {
        sendSuccess(sendResponse, { configured: settings !== null })
        return
      }

      if (!settings) {
        throw new Error('Harvest is not configured yet. Open Settings and add your account details.')
      }

      if (request.type === 'harvest:getProjects') {
        const projects = await fetchAllProjects(settings)
        sendSuccess(sendResponse, projects)
        return
      }

      if (request.type === 'harvest:getProjectTasks') {
        const tasks = await fetchProjectTasks(settings, request.projectId)
        sendSuccess(sendResponse, tasks)
        return
      }

      if (request.type === 'harvest:createTimeEntry') {
        const created = await createTimeEntry(settings, request.payload)
        sendSuccess(sendResponse, created)
      }
    } catch (error) {
      sendError(sendResponse, error)
    }
  })()

  return true
})
