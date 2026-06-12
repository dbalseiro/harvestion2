import { describe, it, expect } from 'vitest'
import type { HarvestCurrentUser, HarvestSettings, HarvestProject, HarvestTask, MessageResponse } from '@/lib/harvest'

describe('Harvest Data Models', () => {
  describe('HarvestCurrentUser', () => {
    it('should create valid current user object', () => {
      const user: HarvestCurrentUser = {
        id: 12345,
      }

      expect(user.id).toBe(12345)
    })
  })

  describe('HarvestSettings', () => {
    it('should create valid settings object', () => {
      const settings: HarvestSettings = {
        accountId: '123456',
        accessToken: 'token_abc123',
      }

      expect(settings.accountId).toBe('123456')
      expect(settings.accessToken).toBe('token_abc123')
    })
  })

  describe('HarvestProject', () => {
    it('should create valid project object', () => {
      const project: HarvestProject = {
        id: 1,
        name: 'Product Design',
        code: 'PD',
        isActive: true,
      }

      expect(project.id).toBe(1)
      expect(project.name).toBe('Product Design')
      expect(project.code).toBe('PD')
      expect(project.isActive).toBe(true)
    })

    it('should allow null code', () => {
      const project: HarvestProject = {
        id: 2,
        name: 'Client Success',
        code: null,
        isActive: true,
      }

      expect(project.code).toBeNull()
    })
  })

  describe('HarvestTask', () => {
    it('should create valid task object', () => {
      const task: HarvestTask = {
        id: 1,
        name: 'Feature Build',
        billableByDefault: true,
        isActive: true,
      }

      expect(task.id).toBe(1)
      expect(task.name).toBe('Feature Build')
      expect(task.billableByDefault).toBe(true)
      expect(task.isActive).toBe(true)
    })
  })

  describe('MessageResponse', () => {
    it('should create success response', () => {
      const response: MessageResponse<{ id: number }> = {
        ok: true,
        data: { id: 123 },
      }

      expect(response.ok).toBe(true)
      if (response.ok) {
        expect(response.data.id).toBe(123)
      }
    })

    it('should create error response', () => {
      const response: MessageResponse<never> = {
        ok: false,
        error: 'Failed to fetch projects',
      }

      expect(response.ok).toBe(false)
      if (!response.ok) {
        expect(response.error).toBe('Failed to fetch projects')
      }
    })

    it('should discriminate union types', () => {
      const successResponse: MessageResponse<string[]> = {
        ok: true,
        data: ['a', 'b'],
      }

      if (successResponse.ok) {
        expect(successResponse.data).toEqual(['a', 'b'])
      }

      const errorResponse: MessageResponse<string[]> = {
        ok: false,
        error: 'Not found',
      }

      if (!errorResponse.ok) {
        expect(errorResponse.error).toBe('Not found')
      }
    })
  })
})
