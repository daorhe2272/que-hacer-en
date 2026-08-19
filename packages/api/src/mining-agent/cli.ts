import { buildMiningGraph } from './graph'

const USAGE = 'Usage: pnpm --filter @que-hacer-en/api mine:agent --url <url>'

async function main(): Promise<void> {
  const urlIndex = process.argv.indexOf('--url')
  const url = urlIndex !== -1 ? process.argv[urlIndex + 1] : undefined
  if (!url) {
    console.error(USAGE)
    process.exit(1)
  }

  const graph = buildMiningGraph()
  const stream = await graph.stream({ url })

  for await (const chunk of stream) {
    console.log(JSON.stringify(chunk))
  }
}

main().catch(error => {
  console.error('[mining-agent] run failed', error)
  process.exit(1)
})