export const HARVEST_STORAGE_KEY = 'harvestSettings'

export type HarvestSettings = {
  accountId: string
  accessToken: string
}

export type HarvestProject = {
  id: number
  name: string
  code: string | null
  isActive: boolean
}

export type HarvestTask = {
  id: number
  name: string
  billableByDefault: boolean
  isActive: boolean
}

export type MessageRequest =
  | { type: 'harvest:getSettingsStatus' }
  | { type: 'harvest:getProjects' }
  | { type: 'harvest:getProjectTasks'; projectId: number }
  | {
      type: 'harvest:createTimeEntry'
      payload: {
        projectId: number
        taskId: number
        spentDate: string
        notes: string
        hours?: number
      }
    }

export type MessageResponse<T = unknown> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
    }

export type HarvestSettingsStatus = {
  configured: boolean
}
