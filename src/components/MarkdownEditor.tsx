import { Fragment, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  onSaveShortcut?: () => void
  maxLength?: number
  placeholder?: string
}

type InlineMatch = {
  pattern: RegExp
  render: (match: RegExpMatchArray, key: string) => ReactNode
}

const inlineMatches: InlineMatch[] = [
  {
    pattern: /^\*\*(.+)\*\*$/,
    render: (match, key) => <strong key={key}>{match[1]}</strong>,
  },
  {
    pattern: /^~~(.+)~~$/,
    render: (match, key) => <del key={key}>{match[1]}</del>,
  },
  {
    pattern: /^`(.+)`$/,
    render: (match, key) => <code key={key}>{match[1]}</code>,
  },
  {
    pattern: /^\[(.+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)$/,
    render: (match, key) => (
      <a href={match[2]} key={key} rel="noreferrer" target="_blank">
        {match[1]}
      </a>
    ),
  },
  {
    pattern: /^\*([^*]+)\*$/,
    render: (match, key) => <em key={key}>{match[1]}</em>,
  },
]

const inlineTokenPattern = /(\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^\s)]+\)|\*[^*\n]+\*)/g

const renderInline = (text: string, keyPrefix: string) =>
  text.split(inlineTokenPattern).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    for (const candidate of inlineMatches) {
      const match = part.match(candidate.pattern)
      if (match) return candidate.render(match, key)
    }
    return <Fragment key={key}>{part}</Fragment>
  })

const isBlockStart = (line: string) =>
  !line.trim() ||
  /^```/.test(line) ||
  /^#{1,3}\s/.test(line) ||
  /^>\s?/.test(line) ||
  /^[-*]\s/.test(line) ||
  /^\d+\.\s/.test(line)

export function MarkdownContent({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="markdown-empty-state">
        아직 내용이 없어요. 편집 탭에서 필요한 내용을 작성해 보세요.
      </p>
    )
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    if (/^```/.test(line)) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !/^```/.test(lines[index])) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(
        <pre data-language={language || undefined} key={`code-${index}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const children = renderInline(heading[2], `heading-${index}`)
      blocks.push(
        heading[1].length === 1 ? (
          <h1 key={`heading-${index}`}>{children}</h1>
        ) : heading[1].length === 2 ? (
          <h2 key={`heading-${index}`}>{children}</h2>
        ) : (
          <h3 key={`heading-${index}`}>{children}</h3>
        ),
      )
      index += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push(
        <blockquote key={`quote-${index}`}>
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`quote-line-${quoteIndex}`}>
              {renderInline(quoteLine, `quote-${index}-${quoteIndex}`)}
            </p>
          ))}
        </blockquote>,
      )
      continue
    }

    if (/^[-*]\s/.test(line)) {
      const items: { checked?: boolean; text: string }[] = []
      while (index < lines.length && /^[-*]\s/.test(lines[index])) {
        const itemText = lines[index].replace(/^[-*]\s/, '')
        const task = itemText.match(/^\[([ xX])\]\s*(.*)$/)
        items.push(
          task
            ? { checked: task[1].toLowerCase() === 'x', text: task[2] }
            : { text: itemText },
        )
        index += 1
      }
      const hasTasks = items.some((item) => item.checked !== undefined)
      blocks.push(
        <ul className={hasTasks ? 'markdown-task-list' : undefined} key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`list-item-${itemIndex}`}>
              {item.checked !== undefined && (
                <input
                  aria-label={item.checked ? '완료된 항목' : '미완료 항목'}
                  checked={item.checked}
                  disabled
                  type="checkbox"
                />
              )}
              <span>{renderInline(item.text, `list-${index}-${itemIndex}`)}</span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s/, ''))
        index += 1
      }
      blocks.push(
        <ol key={`ordered-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`ordered-item-${itemIndex}`}>
              {renderInline(item, `ordered-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      )
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (index < lines.length && !isBlockStart(lines[index])) {
      paragraphLines.push(lines[index])
      index += 1
    }
    blocks.push(
      <p key={`paragraph-${index}`}>
        {paragraphLines.map((paragraphLine, paragraphIndex) => (
          <Fragment key={`paragraph-line-${paragraphIndex}`}>
            {paragraphIndex > 0 && <br />}
            {renderInline(paragraphLine, `paragraph-${index}-${paragraphIndex}`)}
          </Fragment>
        ))}
      </p>,
    )
  }

  return <div className="markdown-content">{blocks}</div>
}

export default function MarkdownEditor({
  value,
  onChange,
  onSaveShortcut,
  maxLength = 16000,
  placeholder = '내용을 입력하세요. Markdown 문법을 사용할 수 있어요.',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')

  const replaceSelection = (
    before: string,
    after: string,
    fallback: string,
    selectFallback = true,
  ) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end) || fallback
    const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
      .slice(0, maxLength)
    onChange(nextValue)
    window.requestAnimationFrame(() => {
      textarea.focus()
      const selectionStart = start + before.length
      const selectionEnd = selectFallback && start === end
        ? selectionStart + selected.length
        : selectionStart + selected.length + after.length
      textarea.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  const prefixLines = (prefix: string, fallback: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1
    const followingBreak = value.indexOf('\n', selectionEnd)
    const lineEnd = followingBreak === -1 ? value.length : followingBreak
    const selectedLines = value.slice(lineStart, lineEnd) || fallback
    const replacement = selectedLines
      .split('\n')
      .map((line) => `${prefix}${line || fallback}`)
      .join('\n')
    const nextValue = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`
      .slice(0, maxLength)
    onChange(nextValue)
    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + replacement.length)
    })
  }

  const addLink = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const label = value.slice(start, end) || '링크 텍스트'
    const replacement = `[${label}](https://)`
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`.slice(0, maxLength))
    window.requestAnimationFrame(() => {
      textarea.focus()
      const urlStart = start + label.length + 3
      textarea.setSelectionRange(urlStart, urlStart + 8)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault()
      replaceSelection('**', '**', '굵은 텍스트')
    }
    if (event.key.toLowerCase() === 'i') {
      event.preventDefault()
      replaceSelection('*', '*', '기울임 텍스트')
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      onSaveShortcut?.()
    }
  }

  return (
    <div className="markdown-editor">
      <div className="markdown-editor-topbar">
        <div className="markdown-editor-tabs" role="tablist" aria-label="내용 표시 방식">
          <button
            aria-selected={mode === 'write'}
            className={mode === 'write' ? 'active' : ''}
            role="tab"
            type="button"
            onClick={() => setMode('write')}
          >
            편집
          </button>
          <button
            aria-selected={mode === 'preview'}
            className={mode === 'preview' ? 'active' : ''}
            role="tab"
            type="button"
            onClick={() => setMode('preview')}
          >
            미리보기
          </button>
        </div>
        <span>Markdown</span>
      </div>

      {mode === 'write' ? (
        <>
          <div className="markdown-toolbar" role="toolbar" aria-label="Markdown 서식">
            <button aria-label="제목 추가" title="제목" type="button" onClick={() => prefixLines('## ', '제목')}>H2</button>
            <button aria-label="굵게" title="굵게 (⌘B)" type="button" onClick={() => replaceSelection('**', '**', '굵은 텍스트')}><strong>B</strong></button>
            <button aria-label="기울임" title="기울임 (⌘I)" type="button" onClick={() => replaceSelection('*', '*', '기울임 텍스트')}><em>I</em></button>
            <button aria-label="취소선" title="취소선" type="button" onClick={() => replaceSelection('~~', '~~', '취소선 텍스트')}><del>S</del></button>
            <span aria-hidden="true" />
            <button aria-label="글머리 목록" title="글머리 목록" type="button" onClick={() => prefixLines('- ', '목록 항목')}>• 목록</button>
            <button aria-label="체크리스트" title="체크리스트" type="button" onClick={() => prefixLines('- [ ] ', '할 일')}>☑</button>
            <button aria-label="인용문" title="인용문" type="button" onClick={() => prefixLines('> ', '인용문')}>❞</button>
            <button aria-label="링크" title="링크" type="button" onClick={addLink}>↗</button>
            <button aria-label="인라인 코드" title="인라인 코드" type="button" onClick={() => replaceSelection('`', '`', '코드')}>{'</>'}</button>
          </div>
          <textarea
            aria-label="계획 내용 Markdown 편집기"
            maxLength={maxLength}
            placeholder={placeholder}
            ref={textareaRef}
            spellCheck="true"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </>
      ) : (
        <div className="markdown-preview" role="tabpanel" tabIndex={0}>
          <MarkdownContent content={value} />
        </div>
      )}

      <div className="markdown-editor-footer">
        <span>`# 제목`, `- [ ] 체크리스트`, `**굵게**`를 바로 사용할 수 있어요.</span>
        <small>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</small>
      </div>
    </div>
  )
}
