import { Annotation } from '@langchain/langgraph'

import type { AcquisitionResult, SourceType } from './acquire/types'

export interface MiningStats {
  success: boolean
  rawEstimatedTokens: number
  prunedEstimatedTokens: number
  error?: string
}

export const StateAnnotation = Annotation.Root({
  url: Annotation<string>,
  sourceType: Annotation<SourceType>,
  result: Annotation<AcquisitionResult | undefined>,
  stats: Annotation<MiningStats | undefined>,
})

export type MiningState = typeof StateAnnotation.State
export type MiningStateUpdate = typeof StateAnnotation.Update
