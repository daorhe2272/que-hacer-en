export type SourceType = 'html'

export interface RawFetchResult {
  success: boolean
  html?: string
  error?: string
}

export interface FetchResult extends RawFetchResult {
  method?: 'static' | 'dynamic'
  durationMs: number
  staticRejectedReason?: string
}

export interface PrunedDocument {
  content: string
  rawLength: number
  rawWords: number
  prunedLength: number
  prunedWords: number
}

export interface AcquisitionResult {
  success: boolean
  sourceType: SourceType
  url: string
  method?: 'static' | 'dynamic'
  durationMs: number
  rawLength: number
  prunedLength: number
  error?: string
  document?: PrunedDocument
}