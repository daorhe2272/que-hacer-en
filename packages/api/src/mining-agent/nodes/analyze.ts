import type { AcquisitionResult } from '../acquire/types'
import type { MiningState, MiningStateUpdate, MiningStats } from '../state'

export function createAnalyzeNode() {
  return async function analyzeNode(state: MiningState): Promise<MiningStateUpdate> {
    const { result } = state
    const stats = computeStats(result)
    logRun(stats)
    return { stats }
  }
}

function computeStats(result: AcquisitionResult | undefined): MiningStats {
  if (!result || !result.success) {
    return {
      success: false,
      rawEstimatedTokens: 0,
      prunedEstimatedTokens: 0,
      error: result?.error ?? 'No acquisition result',
    }
  }

  const rawChars = result.document?.rawLength ?? result.rawLength
  const prunedChars = result.document?.prunedLength ?? result.prunedLength

  return {
    success: true,
    rawEstimatedTokens: Math.ceil(rawChars / 4),
    prunedEstimatedTokens: Math.ceil(prunedChars / 4),
  }
}

function logRun(stats: MiningStats): void {
  if (!stats.success) {
    console.log(`[mining-agent] analyze failed: ${stats.error ?? 'unknown error'}`)
    return
  }
  console.log(
    `[mining-agent] analyze: ~${stats.rawEstimatedTokens} tokens raw -> ~${stats.prunedEstimatedTokens} tokens after pruning`
  )
}