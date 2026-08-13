import { useState } from 'react'
import { getProjectColor, type PlannerProject } from '../data/projects'

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
  onSelectCollection?: (collection: PlanCollection) => void
}

export default function ProjectSidebar({
  projects,
  selectedProjectId,
  itemCounts,
  itemLabel,
  collectionCounts,
  selectedCollection,
  onSelectProject,
  onSelectCollection,
}: ProjectSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(() =>
    typeof window === 'undefined'
      ? true
      : !window.matchMedia('(max-width: 720px)').matches,
  )
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const selectedLabel =
    selectedProject?.name ??
    (selectedProjectId === 'backlog' ? '미분류' : '모든 목록')
  const selectedCount =
    selectedProjectId === 'all'
      ? itemCounts.all
      : selectedProjectId === 'backlog'
        ? itemCounts.backlog
        : selectedProject
          ? itemCounts[selectedProject.id]
          : 0

  return (
    <aside className={`shared-project-sidebar${isExpanded ? ' expanded' : ' collapsed'}`} aria-label="목록 필터">
        <div className="shared-project-heading">
          <div>
            <p className="eyebrow">나의 계획 정리</p>
            <h2>
              <span>{selectedLabel}</span>
              <small>{selectedCount ?? 0}개</small>
            </h2>
          </div>
          <div className="shared-project-heading-actions">
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls="project-sidebar-content"
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? '접기' : '열기'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div id="project-sidebar-content" className="shared-project-content">
            <p className="shared-project-description">
              일정과 할 일을 같은 목록에 모아보세요.
            </p>

            <nav className="shared-project-list" aria-label={`목록별 ${itemLabel}`}>
              <button
                className={selectedProjectId === 'all' ? 'active' : ''}
                type="button"
                onClick={() => onSelectProject('all')}
              >
                <span className="project-filter-icon all" aria-hidden="true">◆</span>
                <span>모든 목록</span>
                <small>{itemCounts.all ?? 0}</small>
              </button>
              <button
                className={selectedProjectId === 'backlog' ? 'active' : ''}
                type="button"
                onClick={() => onSelectProject('backlog')}
              >
                <span className="project-filter-icon backlog" aria-hidden="true">○</span>
                <span>미분류</span>
                <small>{itemCounts.backlog ?? 0}</small>
              </button>

              {projects.map((project) => (
                <button
                  className={selectedProjectId === project.id ? 'active' : ''}
                  type="button"
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                >
                  <span className="project-filter-icon" style={{ backgroundColor: getProjectColor(project) }} aria-hidden="true" />
                  <span>{project.name}</span>
                  <small>{itemCounts[project.id] ?? 0}</small>
                </button>
              ))}
            </nav>

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
          </div>
        )}
    </aside>
  )
}
