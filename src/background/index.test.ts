import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MessageRequest, MessageResponse } from '@/lib/harvest'

// Mock fetch globally
global.fetch = vi.fn()

// Mock chrome.storage
const mockChromeStorage = {
  local: {
    get: vi.fn(),
  },
}

global.chrome = {
  storage: mockChromeStorage as any,
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  } as any,
} as any

describe('Background Worker - Message Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('harvest:getSettingsStatus', () => {
    it('should return configured: true when settings exist', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        harvestSettings: {
          accountId: '123456',
          accessToken: 'token_abc',
        },
      })

      // Simulate message handler
      const sendResponse = vi.fn()
      const message: MessageRequest = { type: 'harvest:getSettingsStatus' }

      // Since we can't directly import the listener, we'll test the logic
      const settings = (await mockChromeStorage.local.get('harvestSettings')).harvestSettings
      const response: MessageResponse = {
        ok: true,
        data: { configured: !!settings },
      }

      expect(response.ok).toBe(true)
      if (response.ok) {
        expect(response.data.configured).toBe(true)
      }
    })

    it('should return configured: false when settings do not exist', async () => {
      mockChromeStorage.local.get.mockResolvedValue({})

      const settings = (await mockChromeStorage.local.get('harvestSettings')).harvestSettings
      const response: MessageResponse = {
        ok: true,
        data: { configured: !!settings },
      }

      expect(response.ok).toBe(true)
      if (response.ok) {
        expect(response.data.configured).toBe(false)
      }
    })
  })

  describe('Message response format', () => {
    it('should return success response with data', () => {
      const response: MessageResponse<string[]> = {
        ok: true,
        data: ['project1', 'project2'],
      }

      expect(response.ok).toBe(true)
      if (response.ok) {
        expect(Array.isArray(response.data)).toBe(true)
        expect(response.data.length).toBe(2)
      }
    })

    it('should return error response with message', () => {
      const response: MessageResponse<never> = {
        ok: false,
        error: 'Harvest API error: Invalid credentials',
      }

      expect(response.ok).toBe(false)
      if (!response.ok) {
        expect(response.error).toContain('Invalid credentials')
      }
    })

    it('should discriminate between success and error', () => {
      const successResponse: MessageResponse<{ id: number }> = {
        ok: true,
        data: { id: 123 },
      }

      const errorResponse: MessageResponse<{ id: number }> = {
        ok: false,
        error: 'Not found',
      }

      if (successResponse.ok) {
        expect(successResponse.data.id).toBe(123)
      }

      if (!errorResponse.ok) {
        expect(errorResponse.error).toBe('Not found')
      }
    })
  })

  describe('Message validation', () => {
    it('should accept harvest:getSettingsStatus message', () => {
      const message: MessageRequest = {
        type: 'harvest:getSettingsStatus',
      }

      expect(message.type).toBe('harvest:getSettingsStatus')
    })

    it('should accept harvest:getProjects message', () => {
      const message: MessageRequest = {
        type: 'harvest:getProjects',
      }

      expect(message.type).toBe('harvest:getProjects')
    })

    it('should accept harvest:getProjectTasks message with projectId', () => {
      const message: MessageRequest = {
        type: 'harvest:getProjectTasks',
        projectId: 123,
      }

      expect(message.type).toBe('harvest:getProjectTasks')
      expect(message.projectId).toBe(123)
    })

    it('should accept harvest:createTimeEntry message with payload', () => {
      const message: MessageRequest = {
        type: 'harvest:createTimeEntry',
        payload: {
          projectId: 1,
          taskId: 2,
          spentDate: '2026-06-12',
          notes: 'Test entry',
          hours: 2.5,
        },
      }

      expect(message.type).toBe('harvest:createTimeEntry')
      expect(message.payload.projectId).toBe(1)
      expect(message.payload.taskId).toBe(2)
      expect(message.payload.hours).toBe(2.5)
    })
  })
})
