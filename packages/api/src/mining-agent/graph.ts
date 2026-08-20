import { StateGraph, START, END } from '@langchain/langgraph'

import { StateAnnotation } from './state'
import { createAcquireNode, type AcquireNodeDeps } from './nodes/acquire'
import { createAnalyzeNode } from './nodes/analyze'

export interface MiningGraphOptions extends AcquireNodeDeps {}

export function buildMiningGraph(options: MiningGraphOptions = {}) {
  const graph = new StateGraph(StateAnnotation)
    .addNode('acquire', createAcquireNode(options))
    .addNode('analyze', createAnalyzeNode())
    .addEdge(START, 'acquire')
    .addEdge('acquire', 'analyze')
    .addEdge('analyze', END)

  return graph.compile()
}
