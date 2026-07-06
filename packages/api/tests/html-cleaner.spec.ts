import { describe, it, expect } from '@jest/globals'
import { cleanHtml } from '../src/utils/html-cleaner'

describe('html-cleaner', () => {
  describe('cleanHtml', () => {
    it('should strip scripts, styles, stylesheet links, and comments entirely', () => {
      const html = '<html><head><style>.a{color:red}</style><link rel="stylesheet" href="/s.css"></head><body><script>alert(1)</script><!-- comment --><h1>Concierto de Rock</h1></body></html>'

      const result = cleanHtml(html)

      expect(result).not.toContain('alert(1)')
      expect(result).not.toContain('color:red')
      expect(result).not.toContain('stylesheet')
      expect(result).not.toContain('comment')
      expect(result).toContain('<h1>Concierto de Rock</h1>')
    })

    it('should drop non-essential attributes while keeping href, src, role, and datetime', () => {
      const html = '<div class="event-card" data-event-id="42" style="margin:10px"><a href="/eventos/1" class="btn" aria-label="ver">Ver más</a><time datetime="2026-08-15T20:00:00" class="date">15 de agosto</time><img src="/img/x.jpg" srcset="/img/x2.jpg 2x" loading="lazy"/></div>'

      const result = cleanHtml(html)

      expect(result).toBe('<div><a href="/eventos/1">Ver más</a><time datetime="2026-08-15T20:00:00">15 de agosto</time><img src="/img/x.jpg"/></div>')
    })

    it('should keep valueless boolean attributes from the allowlist as-is', () => {
      const html = '<div role class="widget">Contenido</div>'

      const result = cleanHtml(html)

      expect(result).toBe('<div role>Contenido</div>')
    })

    it('should preserve nesting structure across repeated sibling elements', () => {
      const html = '<ul class="list"><li class="item"><a href="/a" class="link">A</a></li><li class="item"><a href="/b" class="link">B</a></li></ul>'

      const result = cleanHtml(html)

      expect(result).toBe('<ul><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul>')
    })

    it('should return an empty string for empty input', () => {
      const result = cleanHtml('')

      expect(result).toBe('')
    })

    it('should leave tags with no attributes unchanged', () => {
      const html = '<div><p>Texto sin atributos</p></div>'

      const result = cleanHtml(html)

      expect(result).toBe('<div><p>Texto sin atributos</p></div>')
    })
  })
})