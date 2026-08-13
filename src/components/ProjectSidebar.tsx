import { type FormEvent, useEffect, useState } from 'react'
import type {
  PlannerProject,
  ProjectAccent,
  ProjectInput,
} from '../data/projects'
import { BACKLOG_PROJECT_NAME } from '../data/projects'

export type ProjectFilter = 'all' | 'backlog' | string
export type PlanCollection = 'completed' | 'trash'

type ProjectSidebarProps = {
  projects: PlannerProject[]
  selectedProjectId: ProjectFilter
  itemCounts: Record<string, number>
  itemLabel: string
  collectionCounts?: Record<PlanCollection, number>
  selectedCollection?: PlanCollection
  onSelectProject: (projectId: ProjectFilter) => void
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
  onSelectCollection?: (collection: PlanCollection) => void
}

const accentLabels: Record<ProjectAccent, string> = {
  coral: '코랄',
  blue: '블루',
  green: '그린',
  violet: '바이올렛',
}

export default function ProjectSidebar({
  projects,
  selectedProjectId,
  itemCounts,
  itemLabel,
  collectionCounts,
  selectedCollection,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onSelectCollection,
}: ProjectSidebarProps) {
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>()
  const [editingProject, setEditingProject] = useState<PlannerProject>()
  const [name, setName] = useState('')
  const [accent, setAccent] = useState<ProjectAccent>('coral')
  const [error, setError] = useState('')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)

  useEffect(() => {
    if (!editorMode) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  })

  const closeEditor = () => {
    setEditorMode(undefined)
    setEditingProject(undefined)
    setName('')
    setAccent('coral')
    setError('')
    setIsDeleteConfirming(false)
  }

  const openCreateEditor = () => {
    setEditorMode('create')
    setEditingProject(undefined)
    setName('')
    setAccent('coral')
    setError('')
  }

  const openEditEditor = (project: PlannerProject) => {
    setEditorMode('edit')
    setEditingProject(project)
    setName(project.name)
    setAccent(project.accent)
    setError('')
  }

  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('프로젝트 이름을 입력해 주세요.')
      return
    }

    if (trimmedName === BACKLOG_PROJECT_NAME) {
      setError('백로그는 분류되지 않은 계획을 위한 기본 공간이에요.')
      return
    }

    const duplicated = projects.some(
      (project) =>
        project.id !== editingProject?.id && project.name === trimmedName,
    )
    if (duplicated) {
      setError('같은 이름의 프로젝트가 이미 있어요.')
      return
    }

    if (editingProject) {
      onUpdateProject(editingProject.id, { name: trimmedName, accent })
    } else {
      const createdId = onCreateProject({ name: trimmedName, accent })
      onSelectProject(createdId)
    }
    closeEditor()
  }

  return (
    <>
      <aside className="shared-project-sidebar" aria-label="프로젝트 필터">
        <div className="shared-project-heading">
          <div>
            <p className="eyebrow">공통 카테고리</p>
            <h2>프로젝트</h2>
          </div>
          <button
            type="button"
            onClick={openCreateEditor}
            aria-label="새 프로젝트 만들기"
          >
            ＋
          </button>
        </div>
        <p className="shared-project-description">
          일정과 할 일을 같은 프로젝트로 묶어보세요.
        </p>

        <nav className="shared-project-list" aria-label={`프로젝트별 ${itemLabel}`}>
          <button
            className={selectedProjectId === 'all' ? 'active' : ''}
            type="button"
            onClick={() => onSelectProject('all')}
          >
            <span className="project-filter-icon all" aria-hidden="true">◆</span>
            <span>모든 프로젝트</span>
            <small>{itemCounts.all ?? 0}</small>
          </button>
          <button
            className={selectedProjectId === 'backlog' ? 'active' : ''}
            type="button"
            onClick={() => onSelectProject('backlog')}
          >
            <span className="project-filter-icon backlog" aria-hidden="true">○</span>
            <span>백로그</span>
            <small>{itemCounts.backlog ?? 0}</small>
          </button>

          {projects.map((project) => (
            <div className="shared-project-row" key={project.id}>
              <button
                className={selectedProjectId === project.id ? 'active' : ''}
                type="button"
                onClick={() => onSelectProject(project.id)}
              >
                <span className={`project-filter-icon ${project.accent}`} aria-hidden="true" />
                <span>{project.name}</span>
                <small>{itemCounts[project.id] ?? 0}</small>
              </button>
              <button
                className="shared-project-edit"
                type="button"
                onClick={() => openEditEditor(project)}
                aria-label={`${project.name} 프로젝트 편집`}
              >
                ···
              </button>
            </div>
          ))}
        </nav>

        <button className="shared-project-add" type="button" onClick={openCreateEditor}>
          <span aria-hidden="true">＋</span> 새 프로젝트
        </button>

        {collectionCounts && onSelectCollection && (
          <nav className="plan-collection-list" aria-label="계획 보관함">
            <button
              className={selectedCollection === 'completed' ? 'active' : ''}
              type="button"
              onClick={() => onSelectCollection('completed')}
            >
              <span className="plan-collection-icon completed" aria-hidden="true">✓</span>
              <span>완료 모음</span>
              <small>{collectionCounts.completed}</small>
            </button>
            <button
              className={selectedCollection === 'trash' ? 'active' : ''}
              type="button"
              onClick={() => onSelectCollection('trash')}
            >
              <span className="plan-collection-icon trash" aria-hidden="true">♲</span>
              <span>쓰레기통</span>
              <small>{collectionCounts.trash}</small>
            </button>
          </nav>
        )}
      </aside>

      {editorMode && (
        <div
          className="project-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor()
          }}
        >
          <section
            className="project-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-editor-title"
          >
            <div className="project-modal-heading">
              <div>
                <p className="eyebrow">공통 카테고리</p>
                <h2 id="project-editor-title">
                  {editorMode === 'edit' ? '프로젝트 편집' : '새 프로젝트'}
                </h2>
              </div>
              <button type="button" onClick={closeEditor} aria-label="프로젝트 창 닫기">×</button>
            </div>

            <form onSubmit={saveProject}>
              <label>
                <span>프로젝트 이름</span>
                <input
                  autoFocus
                  maxLength={30}
                  placeholder="예: 코딩 테스트"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setError('')
                  }}
                />
              </label>

              <fieldset>
                <legend>색상</legend>
                <div className="project-color-options">
                  {(Object.keys(accentLabels) as ProjectAccent[]).map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="project-accent"
                        value={option}
                        checked={accent === option}
                        onChange={() => setAccent(option)}
                      />
                      <span className={option} aria-hidden="true" />
                      {accentLabels[option]}
                    </label>
                  ))}
                </div>
              </fieldset>

              {error && <p className="event-form-error" role="alert">{error}</p>}

              <div className="project-modal-actions">
                <div>
                  {editingProject && !isDeleteConfirming && (
                    <button
                      className="event-delete-button"
                      type="button"
                      onClick={() => setIsDeleteConfirming(true)}
                    >
                      프로젝트 삭제
                    </button>
                  )}
                  {editingProject && isDeleteConfirming && (
                    <div className="event-delete-confirm">
                      <span>연결된 항목은 백로그로 이동해요.</span>
                      <button type="button" onClick={() => setIsDeleteConfirming(false)}>취소</button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteProject(editingProject.id)
                          if (selectedProjectId === editingProject.id) onSelectProject('all')
                          closeEditor()
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <button type="button" onClick={closeEditor}>취소</button>
                  <button type="submit">저장</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
