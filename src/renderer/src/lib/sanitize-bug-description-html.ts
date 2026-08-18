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

/**
 * Shape-only check: does this https url *look like* an ADO work item attachment
 * (`/_apis/wit/attachments/...`)? This deliberately does not, and cannot, check
 * the host — the renderer has no notion of "the user's configured ADO org", so
 * a url passing this check is a *candidate* for main-process resolution, never
 * something safe to render directly. The main process is the only party that
 * knows the configured org and is the actual security boundary: it re-validates
 * every candidate against that org's origin before fetching it
 * (`isAllowedAttachmentUrl` in `src/main/ado/ado-client.ts`), and only a
 * resulting `data:image/...` url (see `resolveAdoAttachmentImages` below) is
 * ever written into the DOM.
 */
export function isAdoAttachmentUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.pathname.includes('/_apis/wit/attachments/')
  } catch {
    return false
  }
}

/**
 * Images are held to a stricter allowlist than other URLs: an inline data:image
 * url is safe to render as-is, while an https url that merely looks like an ADO
 * attachment (see `isAdoAttachmentUrl`) is only a candidate to be resolved by
 * the main process — it must never be rendered as a plain `img[src]` (that is
 * why `stripAdoAttachmentImages` removes it before first paint, and why
 * `resolveAdoAttachmentImages` only ever writes back a `data:image/...` result).
 * Any other third-party https source (e.g. a remote tracking pixel) is dropped.
 */
function isSafeImageUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized.startsWith('data:image/') || isAdoAttachmentUrl(value.trim())
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

    const isImgSrc = element.tagName.toLowerCase() === 'img' && attributeName === 'src'
    const urlIsSafe = isImgSrc ? isSafeImageUrl(attribute.value) : isSafeUrl(attribute.value)

    if (URL_ATTRIBUTE_NAMES.has(attributeName) && !urlIsSafe) {
      element.removeAttribute(attribute.name)
      continue
    }

    if (element.tagName.toLowerCase() === 'a' && attributeName === 'target') {
      element.setAttribute('rel', 'noopener noreferrer')
    }
  }

  if (element.tagName.toLowerCase() === 'a') {
    // Always force _blank, even overwriting an explicit target="_self": with
    // the navigation guard installed, a same-window link is now a dead end
    // instead of a (worse) full-app navigation, so every description link
    // must go through window.open -> setWindowOpenHandler -> shell.openExternal.
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
        // Only a data:image/... result is trusted enough to reach the DOM: the
        // predicate above only tells us the src *looked like* an attachment
        // candidate, not that the IPC layer actually resolved it safely. If it
        // returns anything else (e.g. echoes back a remote url on a bug),
        // remove the image instead of writing an unvalidated value into src.
        if (dataUrl.trim().toLowerCase().startsWith('data:image/')) {
          image.setAttribute('src', dataUrl)
        } else {
          image.remove()
        }
      } catch {
        image.remove()
      }
    })
  )

  return document.body.innerHTML.trim()
}