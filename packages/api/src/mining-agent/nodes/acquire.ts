import { acquireHtml, type AcquireHtmlOptions } from '../acquire/html'
import type { MiningState, MiningStateUpdate } from '../state'

export interface AcquireNodeDeps {
  fetcher?: AcquireHtmlOptions['fetcher']
}

export function createAcquireNode(deps: AcquireNodeDeps = {}) {
  return async function acquireNode(state: MiningState): Promise<MiningStateUpdate> {
    const acquisition = await acquireHtml(state.url, { fetcher: deps.fetcher })
    return { sourceType: 'html', result: acquisition }
  }
}