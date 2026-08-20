import { buildMiningGraph, type MiningGraphOptions } from './graph'

import type { MiningState } from './state'
export type { MiningGraphOptions, MiningState }

export async function runMiningGraph(url: string, options?: MiningGraphOptions): Promise<MiningState> {
  const graph = buildMiningGraph(options)
  return graph.invoke({ url })
}
