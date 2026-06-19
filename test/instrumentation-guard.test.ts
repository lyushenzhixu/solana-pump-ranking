import { describe, it, expect } from 'vitest'
import { shouldRegister } from '../instrumentation'

describe('shouldRegister', () => {
  it('仅 nodejs runtime 注册', () => {
    expect(shouldRegister('nodejs')).toBe(true)
    expect(shouldRegister('edge')).toBe(false)
    expect(shouldRegister(undefined)).toBe(false)
  })
})
