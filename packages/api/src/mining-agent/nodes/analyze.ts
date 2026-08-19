import type { AcquisitionResult, SourceType } from '../acquire/types'
import type { MiningState, MiningStateUpdate, MiningStats } from '../state'

export function createAnalyzeNode() {
  return async function analyzeNode(state: MiningState): Promise<MiningStateUpdate> {
    const { url, sourceType, result } = state
    const stats = computeStats(result)
    logRun(url, sourceType, stats)
    return { stats }
  }
}

function computeStats(result: AcquisitionResult | undefined): MiningStats {
  if (!result || !result.success) {
    return {
      success: false,
      durationMs: result?.durationMs ?? 0,
      rawChars: result?.rawLength ?? 0,
      rawWords: 0,
      rawEstimatedTokens: 0,
      prunedChars: result?.prunedLength ?? 0,
      prunedWords: 0,
      prunedEstimatedTokens: 0,
      reductionPct: 0,
      error: result?.error ?? 'No acquisition result',
    }
  }

  const document = result.document
  const rawChars = document?.rawLength ?? result.rawLength
  const prunedChars = document?.prunedLength ?? result.prunedLength
  const rawWords = document?.rawWords ?? 0
  const prunedWords = document?.prunedWords ?? 0

  return {
    success: true,
    method: result.method,
    durationMs: result.durationMs,
    rawChars,
    rawWords,
    rawEstimatedTokens: Math.ceil(rawChars / 4),
    prunedChars,
    prunedWords,
    prunedEstimatedTokens: Math.ceil(prunedChars / 4),
    reductionPct: computeReductionPct(rawChars, prunedChars),
  }
}

function computeReductionPct(rawChars: number, prunedChars: number): number {
  if (rawChars <= 0) return 0
  return Math.round(((rawChars - prunedChars) / rawChars) * 1000) / 10
}

function logRun(url: string, sourceType: SourceType, stats: MiningStats): void {
  console.log(`[mining-agent] ${JSON.stringify({ url, sourceType, stats })}`)
}