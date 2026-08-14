import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  PROJECT_ACCENT_COLORS,
  getProjectColor,
  isBacklogProject,
  type CalendarTodoVisibility,
  type PlannerProject,
  type ProjectAccent,
  type ProjectInput,
} from '../data/projects'

type ProjectSortMode = 'manual' | 'recent' | 'name' | 'count'

const PROJECT_SORT_STORAGE_KEY = 'haru-project-sort-mode'

type ProjectManagementModalProps = {
  projects: PlannerProject[]
  itemCounts: Record<string, number>
  calendarTodoVisibility: CalendarTodoVisibility
  embedded?: boolean
  onClose?: () => void
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
  onReorderProjects: (orderedProjectIds: string[]) => void
  onUpdateCalendarTodoVisibility: (
    visibility: CalendarTodoVisibility,
  ) => void
  onDirtyChange?: (isDirty: boolean) => void
}

type UnsavedChangesDialogProps = {
  onContinue: () => void
  onLeave: () => void
}

export function UnsavedChangesDialog({
  onContinue,
  onLeave,
}: UnsavedChangesDialogProps) {
  return (
    <div className="unsaved-changes-backdrop" role="presentation">
      <section
        className="unsaved-changes-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
      >
        <span className="unsaved-changes-icon" aria-hidden="true">!</span>
        <div>
          <h2 id="unsaved-changes-title">변경사항을 저장하지 않았어요</h2>
          <p>지금 페이지를 나가면 목록 관리에서 바꾼 내용이 사라집니다.</p>
        </div>
        <div className="unsaved-changes-actions">
          <button type="button" onClick={onContinue}>계속 편집</button>
          <button type="button" onClick={onLeave}>저장하지 않고 나가기</button>
        </div>
      </section>
    </div>
  )
}

const presetOptions: Array<{
  accent: Exclude<ProjectAccent, 'custom'>
  label: string
}> = [
  { accent: 'coral', label: '코랄' },
  { accent: 'blue', label: '블루' },
  { accent: 'green', label: '그린' },
  { accent: 'violet', label: '바이올렛' },
  { accent: 'amber', label: '앰버' },
  { accent: 'rose', label: '로즈' },
]

const clampRgb = (value: number) => Math.max(0, Math.min(255, value || 0))
const toHexPart = (value: number) => clampRgb(value).toString(16).padStart(2, '0')
const rgbToHex = (red: number, green: number, blue: number) =>
  `#${toHexPart(red)}${toHexPart(green)}${toHexPart(blue)}`
const hexToRgb = (color: string) => {
  const normalized = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [37, 99, 235] as const
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const
}

const rgbToHsv = (red: number, green: number, blue: number) => {
  const normalized = [red / 255, green / 255, blue / 255]
  const max = Math.max(...normalized)
  const min = Math.min(...normalized)
  const delta = max - min
  let hue = 0

  if (delta > 0) {
    if (max === normalized[0]) {
      hue = 60 * (((normalized[1] - normalized[2]) / delta) % 6)
    } else if (max === normalized[1]) {
      hue = 60 * ((normalized[2] - normalized[0]) / delta + 2)
    } else {
      hue = 60 * ((normalized[0] - normalized[1]) / delta + 4)
    }
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : (delta / max) * 100,
    value: max * 100,
  }
}

const hsvToHex = (hue: number, saturation: number, value: number) => {
  const chroma = (value / 100) * (saturation / 100)
  const hueSection = hue / 60
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1))
  const offset = value / 100 - chroma
  const [red, green, blue] =
    hueSection < 1
      ? [chroma, secondary, 0]
      : hueSection < 2
        ? [secondary, chroma, 0]
        : hueSection < 3
          ? [0, chroma, secondary]
          : hueSection < 4
            ? [0, secondary, chroma]
            : hueSection < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary]

  return rgbToHex(
    Math.round((red + offset) * 255),
    Math.round((green + offset) * 255),
    Math.round((blue + offset) * 255),
  )
}

const sortProjects = (
  projects: PlannerProject[],
  sortMode: ProjectSortMode,
  itemCounts: Record<string, number>,
) => {
  const next = [...projects]
  if (sortMode === 'manual') return next
  if (sortMode === 'name') {
    return next.sort((first, second) => first.name.localeCompare(second.name, 'ko'))
  }
  if (sortMode === 'count') {
    return next.sort(
      (first, second) =>
        (itemCounts[second.id] ?? 0) - (itemCounts[first.id] ?? 0),
    )
  }
  return next.sort((first, second) =>
    (second.createdAt ?? '').localeCompare(first.createdAt ?? ''),
  )
}

export default function ProjectManagementModal({
  projects,
  itemCounts,
  calendarTodoVisibility,
  embedded = false,
  onClose,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onReorderProjects,
  onUpdateCalendarTodoVisibility,
  onDirtyChange,
}: ProjectManagementModalProps) {
  const [sortMode, setSortMode] = useState<ProjectSortMode>(() => {
    const stored = window.localStorage.getItem(PROJECT_SORT_STORAGE_KEY)
    return stored === 'recent' || stored === 'name' || stored === 'count'
      ? stored
      : 'manual'
  })
  const [savedSortMode, setSavedSortMode] = useState(sortMode)
  const [draftProjects, setDraftProjects] = useState(projects)
  const [draftCalendarTodoVisibility, setDraftCalendarTodoVisibility] =
    useState(calendarTodoVisibility)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string>()
  const allowPageLeaveRef = useRef(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>()
  const [editingProject, setEditingProject] = useState<PlannerProject>()
  const [name, setName] = useState('')
  const [accent, setAccent] = useState<ProjectAccent>('blue')
  const [color, setColor] = useState(PROJECT_ACCENT_COLORS.blue)
  const [error, setError] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>()
  const [isPickingColor, setIsPickingColor] = useState(false)
  const [draggingProjectId, setDraggingProjectId] = useState<string>()
  const hasEditorChanges = Boolean(
    editorMode === 'create'
      ? name.trim() || accent !== 'blue' || color !== PROJECT_ACCENT_COLORS.blue
      : editorMode === 'edit' &&
          editingProject &&
          (name !== editingProject.name ||
            accent !== editingProject.accent ||
            color !== getProjectColor(editingProject)),
  )
  const hasPendingChanges = hasUnsavedChanges || hasEditorChanges

  useEffect(() => {
    onDirtyChange?.(hasPendingChanges)
    return () => onDirtyChange?.(false)
  }, [hasPendingChanges, onDirtyChange])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (editorMode) {
        setEditorMode(undefined)
        setEditingProject(undefined)
        setError('')
        return
      }
      onClose?.()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [editorMode, onClose])

  useEffect(() => {
    if (!hasUnsavedChanges && !editorMode) {
      setDraftProjects(projects)
      setDraftCalendarTodoVisibility(calendarTodoVisibility)
    }
  }, [calendarTodoVisibility, editorMode, hasUnsavedChanges, projects])

  useEffect(() => {
    if (!hasPendingChanges) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowPageLeaveRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    const blockLinkNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const targetUrl = new URL(anchor.href, window.location.href)
      if (
        targetUrl.origin !== window.location.origin ||
        targetUrl.href === window.location.href
      ) return
      event.preventDefault()
      event.stopPropagation()
      setPendingNavigation(targetUrl.href)
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    document.addEventListener('click', blockLinkNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
      document.removeEventListener('click', blockLinkNavigation, true)
    }
  }, [hasPendingChanges])

  const visibleProjects = useMemo(
    () => sortProjects(draftProjects, sortMode, itemCounts),
    [draftProjects, itemCounts, sortMode],
  )

  const openCreateEditor = () => {
    setEditorMode('create')
    setEditingProject(undefined)
    setName('')
    setAccent('blue')
    setColor(PROJECT_ACCENT_COLORS.blue)
    setError('')
  }

  const openEditEditor = (project: PlannerProject) => {
    setEditorMode('edit')
    setEditingProject(project)
    setName(project.name)
    setAccent(project.accent)
    setColor(getProjectColor(project))
    setError('')
  }

  const closeEditor = () => {
    setEditorMode(undefined)
    setEditingProject(undefined)
    setError('')
  }

  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('목록 이름을 입력해 주세요.')
      return
    }
    if (isBacklogProject(trimmedName)) {
      setError('미분류는 목록을 선택하지 않은 계획을 위한 기본 공간이에요.')
      return
    }
    const duplicated = draftProjects.some(
      (project) =>
        project.id !== editingProject?.id && project.name === trimmedName,
    )
    if (duplicated) {
      setError('같은 이름의 목록이 이미 있어요.')
      return
    }

    const input = { name: trimmedName, accent, color }
    if (editingProject) {
      setDraftProjects((current) =>
        current.map((project) =>
          project.id === editingProject.id ? { ...project, ...input } : project,
        ),
      )
    } else {
      setDraftProjects((current) => [
        ...current,
        {
          id: `draft-project-${crypto.randomUUID()}`,
          ...input,
          createdAt: new Date().toISOString(),
        },
      ])
    }
    setHasUnsavedChanges(true)
    closeEditor()
  }

  const changeSortMode = (nextMode: ProjectSortMode) => {
    setSortMode(nextMode)
    if (nextMode !== 'manual') {
      setDraftProjects((current) => sortProjects(current, nextMode, itemCounts))
    }
    setHasUnsavedChanges(true)
  }

  const moveProjectToIndex = (projectId: string, nextIndex: number) => {
    const currentIndex = draftProjects.findIndex(
      (project) => project.id === projectId,
    )
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= draftProjects.length ||
      currentIndex === nextIndex
    ) return
    const reordered = [...draftProjects]
    const [movedProject] = reordered.splice(currentIndex, 1)
    reordered.splice(nextIndex, 0, movedProject)
    setDraftProjects(reordered)
    setHasUnsavedChanges(true)
  }

  const moveProjectOver = (
    projectId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const row = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-project-id]')
    const targetProjectId = row?.dataset.projectId
    if (!targetProjectId || targetProjectId === projectId) return
    const targetIndex = draftProjects.findIndex(
      (project) => project.id === targetProjectId,
    )
    moveProjectToIndex(projectId, targetIndex)
  }

  const saveAllChanges = () => {
    const originalById = new Map(projects.map((project) => [project.id, project]))
    const draftIds = new Set(draftProjects.map((project) => project.id))
    const createdIdMap = new Map<string, string>()

    projects.forEach((project) => {
      if (!draftIds.has(project.id)) onDeleteProject(project.id)
    })

    draftProjects.forEach((project) => {
      const original = originalById.get(project.id)
      const input = {
        name: project.name,
        accent: project.accent,
        color: getProjectColor(project),
      }
      if (!original) {
        createdIdMap.set(project.id, onCreateProject(input))
        return
      }
      if (
        original.name !== project.name ||
        original.accent !== project.accent ||
        getProjectColor(original) !== getProjectColor(project)
      ) {
        onUpdateProject(project.id, input)
      }
    })

    const savedProjects = draftProjects.map((project) => ({
      ...project,
      id: createdIdMap.get(project.id) ?? project.id,
    }))
    const savedCalendarTodoVisibility: CalendarTodoVisibility = {
      backlog: Boolean(draftCalendarTodoVisibility.backlog),
    }
    draftProjects.forEach((project) => {
      const savedProjectId = createdIdMap.get(project.id) ?? project.id
      savedCalendarTodoVisibility[savedProjectId] = Boolean(
        draftCalendarTodoVisibility[project.id],
      )
    })
    onReorderProjects(savedProjects.map((project) => project.id))
    onUpdateCalendarTodoVisibility(savedCalendarTodoVisibility)
    window.localStorage.setItem(PROJECT_SORT_STORAGE_KEY, sortMode)
    setSavedSortMode(sortMode)
    setDraftProjects(savedProjects)
    setHasUnsavedChanges(false)
  }

  const discardAllChanges = () => {
    setDraftProjects(projects)
    setDraftCalendarTodoVisibility(calendarTodoVisibility)
    setSortMode(savedSortMode)
    setHasUnsavedChanges(false)
    closeEditor()
  }

  const toggleCalendarTodos = (projectId: string) => {
    setDraftCalendarTodoVisibility((current) => ({
      ...current,
      [projectId]: !current[projectId],
    }))
    setHasUnsavedChanges(true)
  }

  const [red, green, blue] = hexToRgb(color)
  const { hue, saturation, value } = rgbToHsv(red, green, blue)
  const setCustomHsvColor = (
    nextHue: number,
    nextSaturation: number,
    nextValue: number,
  ) => {
    setAccent('custom')
    setColor(hsvToHex(nextHue, nextSaturation, nextValue))
  }
  const setRgbPart = (index: number, value: number) => {
    const next = [red, green, blue]
    next[index] = clampRgb(value)
    setAccent('custom')
    setColor(rgbToHex(next[0], next[1], next[2]))
  }

  const pickSaturationAndValue = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const nextSaturation = Math.max(
      0,
      Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
    )
    const nextValue = Math.max(
      0,
      Math.min(100, (1 - (event.clientY - bounds.top) / bounds.height) * 100),
    )
    setCustomHsvColor(hue, nextSaturation, nextValue)
  }

  const handleColorFieldKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    const amount = event.shiftKey ? 10 : 2
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const nextSaturation =
      event.key === 'ArrowLeft'
        ? Math.max(0, saturation - amount)
        : event.key === 'ArrowRight'
          ? Math.min(100, saturation + amount)
          : saturation
    const nextValue =
      event.key === 'ArrowDown'
        ? Math.max(0, value - amount)
        : event.key === 'ArrowUp'
          ? Math.min(100, value + amount)
          : value
    setCustomHsvColor(hue, nextSaturation, nextValue)
  }

  return (
    <div
      className={embedded ? 'settings-list-management' : 'project-modal-backdrop'}
      role={embedded ? undefined : 'presentation'}
      onMouseDown={(event) => {
        if (!embedded && event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        className={
          embedded
            ? 'settings-card settings-list-management-panel'
            : 'project-create-modal project-management-modal'
        }
        role={embedded ? 'region' : 'dialog'}
        aria-modal={embedded ? undefined : 'true'}
        aria-label={embedded ? '목록 관리' : undefined}
        aria-labelledby={embedded ? undefined : 'project-management-title'}
      >
        {!embedded && (
          <div className="project-modal-heading">
            <div>
              <p className="eyebrow">나의 계획 정리</p>
              <h2 id="project-management-title">목록 관리</h2>
              <p>목록의 표시 순서와 색상을 한곳에서 관리하세요.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="목록 관리 닫기">×</button>
          </div>
        )}

        <div className="project-management-toolbar">
          <label>
            <span>정렬 방식</span>
            <select
              value={sortMode}
              onChange={(event) =>
                changeSortMode(event.target.value as ProjectSortMode)
              }
            >
              <option value="manual">직접 정렬</option>
              <option value="recent">최근 만든 순</option>
              <option value="name">이름순</option>
              <option value="count">항목 많은 순</option>
            </select>
          </label>
          <button type="button" onClick={openCreateEditor}>새 목록 만들기</button>
        </div>

        <div className="project-management-list" aria-label="목록 표시 순서">
          <article className="project-management-row fixed">
            <span className="project-management-swatch neutral" aria-hidden="true" />
            <div>
              <strong>미분류</strong>
              <small>목록을 선택하지 않은 계획</small>
              <label className="project-calendar-todo-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(draftCalendarTodoVisibility.backlog)}
                  onChange={() => toggleCalendarTodos('backlog')}
                />
                <span aria-hidden="true" />
                캘린더에 할 일 표시
              </label>
            </div>
            <span>{itemCounts.backlog ?? 0}개</span>
            <em>고정</em>
          </article>
          {visibleProjects.map((project) => (
            <article
              className={`project-management-row${draggingProjectId === project.id ? ' dragging' : ''}`}
              key={project.id}
              data-project-id={project.id}
            >
              <span
                className="project-management-swatch"
                style={{ backgroundColor: getProjectColor(project) }}
                aria-hidden="true"
              />
              <div>
                <strong>{project.name}</strong>
                <small>{itemCounts[project.id] ?? 0}개 항목</small>
                <label className="project-calendar-todo-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(
                      draftCalendarTodoVisibility[project.id],
                    )}
                    onChange={() => toggleCalendarTodos(project.id)}
                  />
                  <span aria-hidden="true" />
                  캘린더에 할 일 표시
                </label>
              </div>
              <div className="project-row-actions">
                <button type="button" aria-label={`${project.name} 목록 편집`} onClick={() => openEditEditor(project)}>편집</button>
                {confirmingDeleteId === project.id ? (
                  <span className="project-delete-confirm">
                    <button type="button" aria-label={`${project.name} 삭제 취소`} onClick={() => setConfirmingDeleteId(undefined)}>취소</button>
                    <button
                      type="button"
                      aria-label={`${project.name} 삭제 확인`}
                      onClick={() => {
                        setDraftProjects((current) =>
                          current.filter((item) => item.id !== project.id),
                        )
                        setHasUnsavedChanges(true)
                        setConfirmingDeleteId(undefined)
                        if (editingProject?.id === project.id) closeEditor()
                      }}
                    >삭제 확인</button>
                  </span>
                ) : (
                  <button className="project-delete-action" type="button" aria-label={`${project.name} 목록 삭제`} onClick={() => setConfirmingDeleteId(project.id)}>삭제</button>
                )}
              </div>
              {sortMode === 'manual' && (
                <button
                  className="project-drag-handle"
                  type="button"
                  aria-label={`${project.name} 순서 변경`}
                  title="끌어서 순서 변경"
                  onKeyDown={(event) => {
                    const currentIndex = draftProjects.findIndex(
                      (item) => item.id === project.id,
                    )
                    if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      moveProjectToIndex(project.id, currentIndex - 1)
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      moveProjectToIndex(project.id, currentIndex + 1)
                    }
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.currentTarget.focus()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDraggingProjectId(project.id)
                  }}
                  onPointerMove={(event) => {
                    if (draggingProjectId === project.id) {
                      moveProjectOver(project.id, event)
                    }
                  }}
                  onPointerUp={(event) => {
                    setDraggingProjectId(undefined)
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }
                  }}
                  onPointerCancel={() => setDraggingProjectId(undefined)}
                >
                  <span aria-hidden="true">⋮⋮</span>
                </button>
              )}
            </article>
          ))}
        </div>

        <div
          className={`project-management-savebar${hasPendingChanges ? ' dirty' : ''}`}
          aria-live="polite"
        >
          <div>
            <strong>
              {hasEditorChanges
                ? '편집 중인 목록을 먼저 반영해 주세요.'
                : hasUnsavedChanges
                  ? '저장되지 않은 변경사항이 있어요.'
                  : '모든 변경사항이 저장되어 있어요.'}
            </strong>
            <span>
              {hasPendingChanges
                ? '저장하지 않고 페이지를 나가면 변경사항이 사라져요.'
                : '목록 설정을 변경하면 여기에서 한 번에 저장할 수 있어요.'}
            </span>
          </div>
          <div>
            {hasUnsavedChanges && (
              <button type="button" onClick={discardAllChanges}>변경 취소</button>
            )}
            <button
              type="button"
              disabled={!hasUnsavedChanges || hasEditorChanges}
              onClick={saveAllChanges}
            >
              변경사항 저장
            </button>
          </div>
        </div>

        {editorMode && (
          <form className="project-inline-editor" onSubmit={saveProject}>
            <div className="project-inline-heading">
              <div><p className="eyebrow">목록 설정</p><h3>{editorMode === 'edit' ? '목록 편집' : '새 목록'}</h3></div>
              <button type="button" onClick={closeEditor}>편집 닫기</button>
            </div>
            <label>
              <span>목록 이름</span>
              <input autoFocus maxLength={30} value={name} placeholder="예: 개인 생활" onChange={(event) => { setName(event.target.value); setError('') }} />
            </label>
            <fieldset>
              <legend>목록 색상</legend>
              <div className="project-color-options project-preset-colors">
                {presetOptions.map((option) => (
                  <label key={option.accent}>
                    <input
                      type="radio"
                      name="project-accent"
                      checked={accent === option.accent}
                      onChange={() => {
                        setAccent(option.accent)
                        setColor(PROJECT_ACCENT_COLORS[option.accent])
                      }}
                    />
                    <span style={{ backgroundColor: PROJECT_ACCENT_COLORS[option.accent] }} aria-hidden="true" />
                    {option.label}
                  </label>
                ))}
                <label>
                  <input type="radio" name="project-accent" checked={accent === 'custom'} onChange={() => setAccent('custom')} />
                  <span style={{ backgroundColor: color }} aria-hidden="true" />
                  사용자 색상
                </label>
              </div>
            </fieldset>
            {accent === 'custom' && (
              <div className="project-custom-color" aria-label="사용자 색상 설정">
                <div className="project-visual-color-picker">
                  <div
                    className="project-saturation-field"
                    style={{ '--picker-hue': `${hue}` } as CSSProperties}
                    role="slider"
                    tabIndex={0}
                    aria-label="채도와 밝기"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(saturation)}
                    aria-valuetext={`채도 ${Math.round(saturation)}%, 밝기 ${Math.round(value)}%`}
                    onKeyDown={handleColorFieldKeyDown}
                    onPointerDown={(event) => {
                      setIsPickingColor(true)
                      event.currentTarget.setPointerCapture(event.pointerId)
                      pickSaturationAndValue(event)
                    }}
                    onPointerMove={(event) => {
                      if (isPickingColor) pickSaturationAndValue(event)
                    }}
                    onPointerUp={(event) => {
                      setIsPickingColor(false)
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }}
                    onPointerCancel={() => setIsPickingColor(false)}
                  >
                    <span
                      className="project-color-cursor"
                      style={{
                        left: `${saturation}%`,
                        top: `${100 - value}%`,
                        backgroundColor: color,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <label className="project-hue-control">
                    <span className="sr-only">색상 계열</span>
                    <input
                      type="range"
                      min="0"
                      max="359"
                      value={Math.round(hue)}
                      aria-label="색상 계열"
                      onChange={(event) =>
                        setCustomHsvColor(
                          Number(event.target.value),
                          saturation,
                          value,
                        )
                      }
                    />
                  </label>
                </div>
                <div className="project-color-values">
                  <div className="project-color-hex">
                    <span>HEX</span>
                    <output>{color.toUpperCase()}</output>
                  </div>
                  <label><span>R</span><input type="number" min="0" max="255" value={red} onChange={(event) => setRgbPart(0, Number(event.target.value))} /></label>
                  <label><span>G</span><input type="number" min="0" max="255" value={green} onChange={(event) => setRgbPart(1, Number(event.target.value))} /></label>
                  <label><span>B</span><input type="number" min="0" max="255" value={blue} onChange={(event) => setRgbPart(2, Number(event.target.value))} /></label>
                </div>
              </div>
            )}
            <div className="project-color-preview" style={{ '--project-color': color } as CSSProperties}>
              <strong>{name || '목록 미리보기'}</strong>
              <span>이 색상이 일정과 할 일에 함께 표시돼요.</span>
            </div>
            {error && <p className="event-form-error" role="alert">{error}</p>}
            <div className="project-inline-actions"><button type="button" onClick={closeEditor}>취소</button><button type="submit">저장</button></div>
          </form>
        )}
      </section>

      {pendingNavigation && (
        <UnsavedChangesDialog
          onContinue={() => setPendingNavigation(undefined)}
          onLeave={() => {
            allowPageLeaveRef.current = true
            window.location.assign(pendingNavigation)
          }}
        />
      )}
    </div>
  )
}
