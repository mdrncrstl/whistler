import { describe, expect, it, vi, afterEach } from 'vitest'
import { stockQuery, questionGroups, researchAnswer } from '../src/lib/assistantResearch'
import { portfolioAnswer } from '../src/lib/portfolioAssistant'
import { demoBundle } from '../src/data/demo'

afterEach(() => vi.unstubAllGlobals())
describe('assistant research routing', () => {
  it('supports ticker and company queries without sending portfolio questions to search', () => {
    expect(stockQuery('Tell me about Apple')).toBe('Apple')
    expect(stockQuery('BHP.AX')).toBe('BHP.AX')
    expect(stockQuery('What is my portfolio value?')).toBeNull()
    expect(stockQuery('What are unrealised gains?')).toBeNull()
  })
  it('has working deterministic handlers for every non-stock starting question', () => {
    for (const group of ['Portfolio', 'Exposure', 'Records'] as const) {
      for (const question of questionGroups[group]) {
        expect(portfolioAnswer(question, demoBundle).title, question).not.toBe('Try a portfolio question')
      }
    }
  })
  it('surfaces provider errors and passes through cancellation', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'No matching listing found.'}), {status:404}))
    vi.stubGlobal('fetch', fetcher)
    const signal = new AbortController().signal
    await expect(researchAnswer('unknown', signal)).rejects.toThrow('No matching listing')
    expect(fetcher).toHaveBeenCalledWith('/api/stock-research?q=unknown', {signal})
  })
})
