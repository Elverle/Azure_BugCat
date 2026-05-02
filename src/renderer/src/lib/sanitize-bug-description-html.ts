const BLOCKED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'])
const URL_ATTRIBUTE_NAMES = new Set(['href', 'src'])
const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['title', 'aria-label'])
const ALLOWED_ATTRIBUTES_BY_TAG = new Map<string, Set<string>>([
  ['a', new Set(['href', 'target', 'rel'])],
  ['img', new Set(['src', 'alt', 'title', 'width', 'height'])],
  ['td', new Set(['colspan', 'rowspan'])],
  ['th', new Set(['colspan', 'rowspan'])]
])

function isSafeUrl(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase()
  return (
    normalizedValue === '' ||
    normalizedValue.startsWith('http://') ||
    normalizedValue.startsWith('https://') ||
    normalizedValue.startsWith('data:image/') ||
    normalizedValue.startsWith('blob:') ||
    normalizedValue.startsWith('/')
  )
}

export function isAdoAttachmentUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.pathname.includes('/_apis/wit/attachments/')
  } catch {
    return false
  }
}

function sanitizeAttributes(element: Element): void {
  const allowedAttributes = ALLOWED_ATTRIBUTES_BY_TAG.get(element.tagName.toLowerCase())

  for (const attribute of [...element.attributes]) {
    const attributeName = attribute.name.toLowerCase()
    const isAllowed =
      GLOBAL_ALLOWED_ATTRIBUTES.has(attributeName) || allowedAttributes?.has(attributeName)

    if (!isAllowed) {
      element.removeAttribute(attribute.name)
      continue
    }

    if (URL_ATTRIBUTE_NAMES.has(attributeName) && !isSafeUrl(attribute.value)) {
      element.removeAttribute(attribute.name)
      continue
    }

    if (element.tagName.toLowerCase() === 'a' && attributeName === 'target') {
      element.setAttribute('rel', 'noopener noreferrer')
    }
  }

  if (element.tagName.toLowerCase() === 'a' && !element.getAttribute('target')) {
    element.setAttribute('target', '_blank')
    element.setAttribute('rel', 'noopener noreferrer')
  }

  if (element.tagName.toLowerCase() === 'img' && !element.getAttribute('src')) {
    element.remove()
  }
}

export function sanitizeBugDescriptionHtml(html: string | null | undefined): string {
  if (!html?.trim()) {
    return ''
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  for (const element of [...document.body.querySelectorAll('*')]) {
    const tagName = element.tagName.toLowerCase()
    if (BLOCKED_TAGS.has(tagName)) {
      element.remove()
      continue
    }

    sanitizeAttributes(element)
  }

  return document.body.innerHTML.trim()
}

export function stripAdoAttachmentImages(html: string): string {
  if (!html.trim()) {
    return ''
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  for (const image of [...document.body.querySelectorAll('img[src]')]) {
    const src = image.getAttribute('src')
    if (src && isAdoAttachmentUrl(src)) {
      image.remove()
    }
  }

  return document.body.innerHTML.trim()
}

export async function resolveAdoAttachmentImages(
  html: string,
  fetchDataUrl: (src: string) => Promise<string>
): Promise<string> {
  if (!html.trim()) {
    return ''
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  const images = [...document.body.querySelectorAll('img[src]')]

  await Promise.all(
    images.map(async (image) => {
      const src = image.getAttribute('src')
      if (!src || !isAdoAttachmentUrl(src)) {
        return
      }

      try {
        const dataUrl = await fetchDataUrl(src)
        image.setAttribute('src', dataUrl)
      } catch {
        image.remove()
      }
    })
  )

  return document.body.innerHTML.trim()
}