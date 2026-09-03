import type { ReactNode } from 'react'

type Block =
  | { type: 'h2' | 'h3' | 'paragraph' | 'quote'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'hr' }

const MARKDOWN_BLOCK_RE = /^(#{2,3}\s|[-*]\s|\d+\.\s|>\s|---\s*$)/m
const LINK_VALIDATION_BASE = new URL('https://streetrise.invalid/blog/post')

function safeHref(value: string): string | null {
  const href = value.trim()
  if (!href) return null

  try {
    const resolved = new URL(href, LINK_VALIDATION_BASE)
    const hasExplicitScheme = /^[a-z][a-z0-9+.-]*:/i.test(href)

    if (hasExplicitScheme) {
      return ['http:', 'https:', 'mailto:'].includes(resolved.protocol) ? href : null
    }

    // Document-relative forms such as `resource-name`, `../resources`,
    // `?page=2`, `#details`, and `/map` are safe only when resolving them
    // cannot change the origin. This also rejects protocol-relative URLs
    // (`//example.com`) and backslash variants that URL parsing treats as a
    // host change.
    return resolved.origin === LINK_VALIDATION_BASE.origin ? href : null
  } catch {
    return null
  }
}

function renderInline(text: string, keyPrefix = 'inline'): ReactNode[] {
  const tokens: ReactNode[] = []
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) tokens.push(text.slice(cursor, match.index))

    if (match[2] && match[3]) {
      const href = safeHref(match[3])
      if (href) {
        const external = /^https?:\/\//i.test(href)
        tokens.push(
          <a
            key={`${keyPrefix}-link-${match.index}`}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="font-medium text-primary-700 underline decoration-primary-300 decoration-2 underline-offset-2 transition-colors hover:text-primary-900 dark:text-primary-300 dark:decoration-primary-700 dark:hover:text-primary-200"
          >
            {match[2]}
          </a>,
        )
      } else {
        tokens.push(match[2])
      }
    } else if (match[4]) {
      tokens.push(<strong key={`${keyPrefix}-strong-${match.index}`} className="font-semibold text-slate-900 dark:text-white">{match[4]}</strong>)
    } else if (match[5]) {
      tokens.push(<em key={`${keyPrefix}-em-${match.index}`}>{match[5]}</em>)
    }

    cursor = pattern.lastIndex
  }

  if (cursor < text.length) tokens.push(text.slice(cursor))
  return tokens
}

/** Preserve authored hard line breaks while still applying inline formatting. */
function renderInlineWithBreaks(text: string): ReactNode[] {
  const lines = text.split('\n')
  const nodes: ReactNode[] = []

  lines.forEach((line, index) => {
    if (index > 0) nodes.push(<br key={`line-${index}-br`} />)
    // `renderInline` starts match indexes at zero for every line, so include
    // the line index in its key prefix to keep sibling token keys unique.
    nodes.push(...renderInline(line, `line-${index}`))
  })

  return nodes
}

function splitLegacySentences(value: string): string[] {
  return value
    .replace(/[\t ]+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“])/)
    .filter(Boolean)
}

function legacyParagraphs(source: string): Block[] {
  const blocks: Block[] = []
  let preservedLines: string[] = []

  const flushPreservedLines = () => {
    if (!preservedLines.length) return
    blocks.push({ type: 'paragraph', text: preservedLines.join('\n') })
    preservedLines = []
  }

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushPreservedLines()
      continue
    }

    const sentences = splitLegacySentences(line)

    // Long legacy lines benefit from the old sentence-grouping fallback, but
    // grouping is performed per authored line so a hard break can never be
    // swallowed into the surrounding prose.
    if (sentences.length >= 4) {
      flushPreservedLines()
      for (let i = 0; i < sentences.length; i += 2) {
        blocks.push({ type: 'paragraph', text: sentences.slice(i, i + 2).join(' ') })
      }
      continue
    }

    // Short lines may be headings, addresses, phone numbers, or CTAs. Keep
    // their exact line boundaries and render them with explicit <br> elements.
    preservedLines.push(line)
  }

  flushPreservedLines()
  return blocks
}

function parseBlocks(source: string): Block[] {
  const normalized = source.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []

  // Older StreetRise posts were stored as plain text. Give one-line prose a
  // readable paragraph rhythm, but preserve every authored hard line break.
  if (!MARKDOWN_BLOCK_RE.test(normalized) && !normalized.includes('\n\n')) {
    return legacyParagraphs(normalized)
  }

  const lines = normalized.split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text) blocks.push({ type: 'paragraph', text })
    paragraph = []
  }

  const flushList = () => {
    if (listType && listItems.length) blocks.push({ type: listType, items: listItems })
    listType = null
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (/^---+$/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'hr' })
      continue
    }

    const h3 = line.match(/^###\s+(.+)/)
    if (h3) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h3', text: h3[1] })
      continue
    }

    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h2', text: h2[1] })
      continue
    }

    const quote = line.match(/^>\s+(.+)/)
    if (quote) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'quote', text: quote[1] })
      continue
    }

    const ul = line.match(/^[-*]\s+(.+)/)
    if (ul) {
      flushParagraph()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(ul[1])
      continue
    }

    const ol = line.match(/^\d+\.\s+(.+)/)
    if (ol) {
      flushParagraph()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(ol[1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

export default function BlogBody({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <div className="mt-8 text-[1.05rem] leading-8 text-slate-700 dark:text-slate-300">
      {blocks.map((block, index) => {
        if (block.type === 'h2') {
          return (
            <h2 key={index} className="mb-4 mt-10 text-2xl font-bold tracking-tight text-slate-950 first:mt-0 dark:text-white sm:text-3xl">
              {renderInline(block.text, `block-${index}`)}
            </h2>
          )
        }
        if (block.type === 'h3') {
          return (
            <h3 key={index} className="mb-3 mt-8 text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
              {renderInline(block.text, `block-${index}`)}
            </h3>
          )
        }
        if (block.type === 'paragraph') {
          return <p key={index} className="mb-6">{renderInlineWithBreaks(block.text)}</p>
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={index} className="my-8 rounded-r-2xl border-l-4 border-primary-500 bg-primary-50/70 px-5 py-4 text-lg font-medium leading-8 text-slate-800 dark:bg-primary-950/30 dark:text-slate-100">
              {renderInline(block.text, `block-${index}`)}
            </blockquote>
          )
        }
        if (block.type === 'ul') {
          return (
            <ul key={index} className="mb-7 ml-6 list-disc space-y-2 marker:text-primary-500">
              {block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{renderInline(item, `block-${index}-item-${itemIndex}`)}</li>)}
            </ul>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol key={index} className="mb-7 ml-6 list-decimal space-y-2 marker:font-semibold marker:text-primary-600 dark:marker:text-primary-400">
              {block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{renderInline(item, `block-${index}-item-${itemIndex}`)}</li>)}
            </ol>
          )
        }
        return <hr key={index} className="my-10 border-slate-200 dark:border-slate-700" />
      })}
    </div>
  )
}
