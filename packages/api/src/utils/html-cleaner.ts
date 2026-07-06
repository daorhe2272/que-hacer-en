/**
 * Shared HTML cleaning for LLM inputs (event extraction and enrichment).
 * Strips script/style/comments and non-essential attributes while preserving
 * tag structure, since the extraction model relies on DOM nesting and hrefs
 * to tell events apart and to associate each one with its detail-page URL.
 */

// Attributes worth keeping: href/src carry the links and images extraction needs,
// role/datetime occasionally carry structural or date signal that a bare tag name lacks.
const ATTRS_TO_KEEP = ['href', 'src', 'role', 'datetime']

const ATTR_PATTERN = /\s+([a-zA-Z0-9-:]+)(=("[^"]*"|'[^']*'))?/g

function stripAttributes(html: string): string {
  return html.replace(/<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z0-9-:]+(?:=(?:"[^"]*"|'[^']*'))?)*)(\s*\/?)>/g, (_match, tag, attrs, selfClose) => {
    const kept: string[] = []
    let attrMatch: RegExpExecArray | null
    ATTR_PATTERN.lastIndex = 0
    while ((attrMatch = ATTR_PATTERN.exec(attrs))) {
      const name = attrMatch[1].toLowerCase()
      if (ATTRS_TO_KEEP.includes(name)) kept.push(attrMatch[2] ? `${name}=${attrMatch[3]}` : name)
    }
    const attrString = kept.length > 0 ? ` ${kept.join(' ')}` : ''
    return `<${tag}${attrString}${selfClose.trim()}>`
  })
}

function collapseWhitespace(html: string): string {
  return html
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

/**
 * Cleans HTML for LLM consumption: removes script/style/comments entirely,
 * strips every attribute except ATTRS_TO_KEEP, and collapses leftover whitespace.
 * Used for both event extraction (needs structure across many events) and
 * enrichment (needs structure to confirm a single event's date/time/details).
 */
export function cleanHtml(html: string): string {
  const withoutScriptsAndStyles = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, ' ')

  return collapseWhitespace(stripAttributes(withoutScriptsAndStyles))
}