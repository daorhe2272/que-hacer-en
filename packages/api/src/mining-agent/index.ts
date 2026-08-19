export { StateAnnotation } from './state'
export { buildMiningGraph } from './graph'
export type { MiningGraph, MiningGraphOptions } from './graph'
export type { MiningState, MiningStats } from './state'
export { fetchHtml, pruneHtml, acquireHtml } from './acquire/html'
export type { FetchHtmlOptions, AcquireHtmlOptions } from './acquire/html'
export type { FetchResult, PrunedDocument, AcquisitionResult, SourceType } from './acquire/types'

import { buildMiningGraph, type MiningGraphOptions } from './graph'

export async function runMiningGraph(url: string, options?: MiningGraphOptions): Promise<unknown> {
  const graph = buildMiningGraph(options)
  return graph.invoke({ url })
}