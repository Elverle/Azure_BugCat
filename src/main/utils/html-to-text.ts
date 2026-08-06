export function htmlToText(html: string | null | undefined): string {
  if (!html) return ''

  let text = html

  // Extract and preserve <pre>/<code> blocks verbatim
  const preserved: string[] = []
  text = text.replace(/<(pre|code)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => {
    const index = preserved.length
    preserved.push(decodeEntities(content))
    return `\n\n\x00PRESERVE_${index}\x00\n\n`
  })

  // Block-level replacements
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/(?:p|div)>/gi, '\n\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<li[^>]*>/gi, '\n- ')
  text = text.replace(/<\/li>/gi, '')
  text = text.replace(/<\/(?:ul|ol)>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')
  text = text.replace(/<\/table>/gi, '\n')

  // Table cell separators (not first in row)
  text = text.replace(/<tr[^>]*>\s*<(td|th)[^>]*>/gi, '')
  text = text.replace(/<(td|th)[^>]*>/gi, ' | ')

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  text = decodeEntities(text)

  // Normalize multiple consecutive spaces (not newlines) to single space per line
  text = text.replace(/[^\S\n]+/g, ' ')

  // Normalize 3+ consecutive newlines to double newline
  text = text.replace(/\n{3,}/g, '\n\n')

  // Re-insert preserved <pre>/<code> content after whitespace normalization.
  // NUL byte (\x00) is used intentionally as a sentinel: it cannot appear in
  // real HTML/text content, so it cannot collide with preserved block markers.
  // eslint-disable-next-line no-control-regex
  text = text.replace(/\x00PRESERVE_(\d+)\x00/g, (_, index) => preserved[Number(index)])

  return text.trim()
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
}
