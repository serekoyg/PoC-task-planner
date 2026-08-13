import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  PROJECT_ACCENT_COLORS,
  getProjectColor,
  isBacklogProject,
  type PlannerProject,
  type ProjectAccent,
  type ProjectInput,
} from '../data/projects'

type ProjectSortMode = 'manual' | 'recent' | 'name' | 'count'

const PROJECT_SORT_STORAGE_KEY = 'haru-project-sort-mode'

type ProjectManagementModalProps = {
  projects: PlannerProject[]
  itemCounts: Record<string, number>
  embedded?: boolean
  selectedProjectId?: string
  onClose?: () => void
  onSelectProject?: (projectId: string) => void
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
  onReorderProjects: (orderedProjectIds: string[]) => void
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
  embedded = false,
  selectedProjectId,
  onClose,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onReorderProjects,
}: ProjectManagementModalProps) {
  const [sortMode, setSortMode] = useState<ProjectSortMode>(() => {
    const stored = window.localStorage.getItem(PROJECT_SORT_STORAGE_KEY)
    return stored === 'recent' || stored === 'name' || stored === 'count'
      ? stored
      : 'manual'
  })
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>()
  const [editingProject, setEditingProject] = useState<PlannerProject>()
  const [name, setName] = useState('')
  const [accent, setAccent] = useState<ProjectAccent>('blue')
  const [color, setColor] = useState(PROJECT_ACCENT_COLORS.blue)
  const [error, setError] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>()

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
    window.localStorage.setItem(PROJECT_SORT_STORAGE_KEY, sortMode)
    if (sortMode === 'manual') return
    const sortedIds = sortProjects(projects, sortMode, itemCounts).map(
      (project) => project.id,
    )
    if (sortedIds.every((projectId, index) => projectId === projects[index]?.id)) return
    onReorderProjects(sortedIds)
  }, [itemCounts, onReorderProjects, projects, sortMode])

  const visibleProjects = useMemo(
    () => sortProjects(projects, sortMode, itemCounts),
    [itemCounts, projects, sortMode],
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
    const duplicated = projects.some(
      (project) =>
        project.id !== editingProject?.id && project.name === trimmedName,
    )
    if (duplicated) {
      setError('같은 이름의 목록이 이미 있어요.')
      return
    }

    const input = { name: trimmedName, accent, color }
    if (editingProject) {
      onUpdateProject(editingProject.id, input)
    } else {
      const createdId = onCreateProject(input)
      onSelectProject?.(createdId)
    }
    closeEditor()
  }

  const changeSortMode = (nextMode: ProjectSortMode) => {
    setSortMode(nextMode)
  }

  const moveProject = (projectId: string, amount: -1 | 1) => {
    const currentIndex = projects.findIndex((project) => project.id === projectId)
    const nextIndex = currentIndex + amount
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= projects.length) return
    const reordered = [...projects]
    ;[reordered[currentIndex], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[currentIndex],
    ]
    onReorderProjects(reordered.map((project) => project.id))
  }

  const [red, green, blue] = hexToRgb(color)
  const setRgbPart = (index: number, value: number) => {
    const next = [red, green, blue]
    next[index] = clampRgb(value)
    setAccent('custom')
    setColor(rgbToHex(next[0], next[1], next[2]))
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
            <div><strong>미분류</strong><small>목록을 선택하지 않은 계획</small></div>
            <span>{itemCounts.backlog ?? 0}개</span>
            <em>고정</em>
          </article>
          {visibleProjects.map((project, index) => (
            <article className="project-management-row" key={project.id}>
              <span
                className="project-management-swatch"
                style={{ backgroundColor: getProjectColor(project) }}
                aria-hidden="true"
              />
              <div><strong>{project.name}</strong><small>{itemCounts[project.id] ?? 0}개 항목</small></div>
              {sortMode === 'manual' && (
                <div className="project-order-actions" aria-label={`${project.name} 순서 변경`}>
                  <button type="button" disabled={index === 0} onClick={() => moveProject(project.id, -1)}>위로</button>
                  <button type="button" disabled={index === projects.length - 1} onClick={() => moveProject(project.id, 1)}>아래로</button>
                </div>
              )}
              <div className="project-row-actions">
                <button type="button" aria-label={`${project.name} 목록 편집`} onClick={() => openEditEditor(project)}>편집</button>
                {confirmingDeleteId === project.id ? (
                  <span className="project-delete-confirm">
                    <button type="button" aria-label={`${project.name} 삭제 취소`} onClick={() => setConfirmingDeleteId(undefined)}>취소</button>
                    <button
                      type="button"
                      aria-label={`${project.name} 삭제 확인`}
                      onClick={() => {
                        onDeleteProject(project.id)
                        if (selectedProjectId === project.id) onSelectProject?.('all')
                        setConfirmingDeleteId(undefined)
                        if (editingProject?.id === project.id) closeEditor()
                      }}
                    >삭제 확인</button>
                  </span>
                ) : (
                  <button className="project-delete-action" type="button" aria-label={`${project.name} 목록 삭제`} onClick={() => setConfirmingDeleteId(project.id)}>삭제</button>
                )}
              </div>
            </article>
          ))}
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
              <div className="project-custom-color" aria-label="사용자 색상 RGB 설정">
                <label><span>R</span><input type="number" min="0" max="255" value={red} onChange={(event) => setRgbPart(0, Number(event.target.value))} /></label>
                <label><span>G</span><input type="number" min="0" max="255" value={green} onChange={(event) => setRgbPart(1, Number(event.target.value))} /></label>
                <label><span>B</span><input type="number" min="0" max="255" value={blue} onChange={(event) => setRgbPart(2, Number(event.target.value))} /></label>
                <label className="project-color-picker"><span>색상표</span><input type="color" value={color} onChange={(event) => { setAccent('custom'); setColor(event.target.value) }} /></label>
                <output>{color.toUpperCase()}</output>
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
    </div>
  )
}
