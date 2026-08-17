import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals'

const mockOpenAIConstructor = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: mockOpenAIConstructor,
}))

type LlmClientModule = typeof import('../src/utils/llm-client')

async function loadFreshModule(): Promise<LlmClientModule> {
  jest.resetModules()
  mockOpenAIConstructor.mockClear()
  return import('../src/utils/llm-client')
}

describe('llm-client', () => {
  const originalApiKey = process.env.KILO_API_KEY

  beforeEach(() => {
    process.env.KILO_API_KEY = 'test-kilo-key'
  })

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.KILO_API_KEY
    else process.env.KILO_API_KEY = originalApiKey
  })

  it('lazily constructs the Kilo client with the gateway config', async () => {
    const { getKiloClient } = await loadFreshModule()

    const instance = getKiloClient()

    expect(mockOpenAIConstructor).toHaveBeenCalledTimes(1)
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      baseURL: 'https://api.kilo.ai/api/gateway',
      apiKey: 'test-kilo-key',
    })
    expect(instance).toBeDefined()
  })

  it('returns the same cached instance on subsequent calls', async () => {
    const { getKiloClient } = await loadFreshModule()

    const first = getKiloClient()
    const second = getKiloClient()

    expect(mockOpenAIConstructor).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
  })

  it('passes the configured KILO_API_KEY from the environment', async () => {
    process.env.KILO_API_KEY = 'custom-key'
    const { getKiloClient } = await loadFreshModule()

    getKiloClient()

    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      baseURL: 'https://api.kilo.ai/api/gateway',
      apiKey: 'custom-key',
    })
  })
})