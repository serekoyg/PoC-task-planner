import { useMemo, useState, type ReactNode } from 'react'
import ProjectManagementModal from '../components/ProjectManagementModal'
import type { PlannerProject, ProjectInput } from '../data/projects'

type SettingsSection =
  | 'account'
  | 'general'
  | 'theme'
  | 'sidebar'
  | 'lists'
  | 'quick-add'
  | 'productivity'
  | 'reminders'
  | 'notifications'
  | 'backup'
  | 'integrations'
  | 'calendar'

type SettingValue = boolean | string

const sections: Array<{
  id: SettingsSection
  icon: string
  title: string
  description: string
  keywords: string
}> = [
  {
    id: 'account',
    icon: '◎',
    title: '계정',
    description: '프로필과 계정 정보를 관리해요.',
    keywords: '이름 이메일 프로필 로그아웃',
  },
  {
    id: 'general',
    icon: '⚙',
    title: '일반',
    description: '언어, 날짜와 시작 화면을 정해요.',
    keywords: '언어 날짜 시간 시작 화면 할 일',
  },
  {
    id: 'theme',
    icon: '◒',
    title: '테마',
    description: '화면 모드와 강조 색상을 골라요.',
    keywords: '화면 다크 라이트 색상',
  },
  {
    id: 'sidebar',
    icon: '▣',
    title: '사이드바',
    description: '주요 메뉴에 표시할 항목을 정해요.',
    keywords: '메뉴 캘린더 할 일 모임 목록',
  },
  {
    id: 'lists',
    icon: '≡',
    title: '목록 관리',
    description: '목록의 순서와 색상, 포함된 계획을 관리해요.',
    keywords: '목록 생성 정렬 순서 색상 편집 삭제',
  },
  {
    id: 'quick-add',
    icon: '⊕',
    title: '빠른 추가',
    description: '새 항목에 사용할 기본값을 정해요.',
    keywords: '목록 우선순위 시간 할 일 일정',
  },
  {
    id: 'productivity',
    icon: '↗',
    title: '생산성',
    description: '하루 목표와 집중 기준을 설정해요.',
    keywords: '목표 집중 완료 포모도로',
  },
  {
    id: 'reminders',
    icon: '◷',
    title: '미리 알림',
    description: '일정과 마감 전에 알릴 시간을 정해요.',
    keywords: '사전 알림 일정 마감 시간',
  },
  {
    id: 'notifications',
    icon: '♧',
    title: '알림',
    description: '받을 알림과 방해 금지 시간을 관리해요.',
    keywords: '푸시 이메일 소리 방해 금지',
  },
  {
    id: 'backup',
    icon: '⇧',
    title: '백업 및 동기화',
    description: '데이터 보관과 동기화 상태를 확인해요.',
    keywords: '저장 내보내기 가져오기 클라우드 동기화',
  },
  {
    id: 'integrations',
    icon: '⌘',
    title: '연동',
    description: '다른 캘린더와 도구를 연결해요.',
    keywords: '구글 애플 캘린더 슬랙 연결',
  },
  {
    id: 'calendar',
    icon: '▦',
    title: '캘린더',
    description: '주간 시작일과 기본 보기를 정해요.',
    keywords: '일간 주간 월간 주말 업무 시간',
  },
]

const initialValues: Record<string, SettingValue> = {
  language: '한국어',
  dateFormat: '2026년 8월 10일',
  startPage: '오늘 할 일',
  defaultTodoView: '날짜별',
  theme: '시스템 설정',
  accent: '파랑',
  sidebarCalendar: true,
  sidebarTodos: true,
  sidebarStudies: true,
  sidebarProjects: true,
  defaultProject: '미분류',
  defaultPriority: '보통',
  defaultDuration: '30분',
  dailyTodoGoal: '3개',
  dailyFocusGoal: '60분',
  focusSession: '25분',
  eventReminder: '10분 전',
  todoReminder: '1시간 전',
  overdueReminder: true,
  desktopNotification: true,
  soundNotification: false,
  weeklySummary: true,
  quietHours: true,
  autoSync: true,
  weekStartsOn: '월요일',
  defaultCalendarView: '월간',
  showWeekends: true,
  showCompleted: true,
}

type SettingRowProps = {
  title: string
  description: string
  children: ReactNode
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="settings-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

type ToggleProps = {
  checked: boolean
  label: string
  onChange: () => void
}

function Toggle({ checked, label, onChange }: ToggleProps) {
  return (
    <button
      className={`settings-toggle${checked ? ' active' : ''}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
    >
      <span />
    </button>
  )
}

type ChoiceProps = {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

function Choice({ label, options, value, onChange }: ChoiceProps) {
  return (
    <div className="settings-choice" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={value === option ? 'active' : ''}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

type SettingsPageProps = {
  projects: PlannerProject[]
  itemCounts: Record<string, number>
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
  onReorderProjects: (orderedProjectIds: string[]) => void
}

export default function SettingsPage({
  projects,
  itemCounts,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onReorderProjects,
}: SettingsPageProps) {
  const [selectedSection, setSelectedSection] =
    useState<SettingsSection>('account')
  const [query, setQuery] = useState('')
  const [values, setValues] = useState(initialValues)
  const [notice, setNotice] = useState('모든 변경 사항은 데모에 자동 저장돼요.')
  const [connectedServices, setConnectedServices] = useState<string[]>([])

  const selected = sections.find((section) => section.id === selectedSection)!
  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return sections
    return sections.filter((section) =>
      `${section.title} ${section.description} ${section.keywords}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query])

  const setValue = (key: string, value: SettingValue) => {
    setValues((current) => ({ ...current, [key]: value }))
    setNotice('변경 사항을 데모에 저장했어요.')
  }

  const toggle = (key: string) =>
    setValue(key, values[key] !== true)

  const connectService = (service: string) => {
    setConnectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    )
    setNotice(
      connectedServices.includes(service)
        ? `${service} 연결을 해제했어요.`
        : `${service} 연결을 목업으로 완료했어요.`,
    )
  }

  const renderSettings = () => {
    switch (selectedSection) {
      case 'account':
        return (
          <>
            <section className="settings-card account-settings-card">
              <div className="settings-account-profile">
                <span aria-hidden="true">민</span>
                <div>
                  <strong>민서</strong>
                  <p>minseo@haru.demo</p>
                </div>
                <button type="button" onClick={() => setNotice('프로필 사진 선택 창을 여는 목업이에요.')}>
                  사진 변경
                </button>
              </div>
              <SettingRow title="표시 이름" description="하루와 모임에서 표시되는 이름이에요.">
                <input aria-label="표시 이름" defaultValue="민서" />
              </SettingRow>
              <SettingRow title="이메일" description="로그인과 동기화에 사용할 주소예요.">
                <input aria-label="이메일" defaultValue="minseo@haru.demo" />
              </SettingRow>
            </section>
            <section className="settings-card settings-danger-card">
              <SettingRow title="로그아웃" description="이 기기의 데모 계정에서 로그아웃해요.">
                <button type="button" onClick={() => setNotice('데모에서는 실제로 로그아웃하지 않아요.')}>
                  로그아웃
                </button>
              </SettingRow>
            </section>
          </>
        )
      case 'general':
        return (
          <section className="settings-card">
            <SettingRow title="언어" description="앱에서 사용할 언어를 선택해요.">
              <select aria-label="언어" value={String(values.language)} onChange={(event) => setValue('language', event.target.value)}>
                <option>한국어</option><option>English</option><option>日本語</option>
              </select>
            </SettingRow>
            <SettingRow title="날짜 형식" description="일정과 할 일에 표시되는 날짜 형식이에요.">
              <select aria-label="날짜 형식" value={String(values.dateFormat)} onChange={(event) => setValue('dateFormat', event.target.value)}>
                <option>2026년 8월 10일</option><option>2026. 08. 10.</option><option>2026-08-10</option>
              </select>
            </SettingRow>
            <SettingRow title="시작 화면" description="하루를 열었을 때 처음 보여줄 화면이에요.">
              <select aria-label="시작 화면" value={String(values.startPage)} onChange={(event) => setValue('startPage', event.target.value)}>
                <option>오늘 할 일</option><option>캘린더</option><option>모임</option>
              </select>
            </SettingRow>
            <SettingRow title="할 일 기본 보기" description="할 일 화면에서 처음 사용할 보기예요.">
              <Choice label="할 일 기본 보기" options={['날짜별', '칸반', '목록별']} value={String(values.defaultTodoView)} onChange={(value) => setValue('defaultTodoView', value)} />
            </SettingRow>
          </section>
        )
      case 'theme':
        return (
          <section className="settings-card">
            <div className="settings-preview-options" aria-label="화면 모드">
              {['밝게', '어둡게', '시스템 설정'].map((option) => (
                <button key={option} type="button" className={values.theme === option ? 'active' : ''} aria-pressed={values.theme === option} onClick={() => setValue('theme', option)}>
                  <span className={`theme-preview ${option === '어둡게' ? 'dark' : option === '시스템 설정' ? 'system' : ''}`} aria-hidden="true"><i /><i /><i /></span>
                  {option}
                </button>
              ))}
            </div>
            <SettingRow title="강조 색상" description="선택 상태와 주요 버튼에 사용할 색이에요.">
              <div className="accent-options" aria-label="강조 색상">
                {['파랑', '보라', '초록', '주황'].map((color) => (
                  <button key={color} type="button" className={`${color}${values.accent === color ? ' active' : ''}`} aria-label={color} aria-pressed={values.accent === color} onClick={() => setValue('accent', color)} />
                ))}
              </div>
            </SettingRow>
          </section>
        )
      case 'sidebar':
        return (
          <section className="settings-card">
            {[
              ['sidebarCalendar', '캘린더', '일간·주간·월간 일정을 확인해요.'],
              ['sidebarTodos', '할 일', '날짜별·칸반·목록별 보기를 확인해요.'],
              ['sidebarStudies', '모임', '함께 집중하는 모임을 확인해요.'],
              ['sidebarProjects', '목록', '개인 일정과 할 일을 같은 기준으로 정리해요.'],
            ].map(([key, title, description]) => (
              <SettingRow key={key} title={title} description={description}>
                <Toggle checked={Boolean(values[key])} label={`${title} 표시`} onChange={() => toggle(key)} />
              </SettingRow>
            ))}
          </section>
        )
      case 'lists':
        return (
          <ProjectManagementModal
            embedded
            projects={projects}
            itemCounts={itemCounts}
            onCreateProject={onCreateProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            onReorderProjects={onReorderProjects}
          />
        )
      case 'quick-add':
        return (
          <section className="settings-card">
            <SettingRow title="기본 목록" description="새 일정과 할 일을 먼저 담아둘 목록이에요.">
              <select aria-label="기본 목록" value={String(values.defaultProject)} onChange={(event) => setValue('defaultProject', event.target.value)}>
                <option>미분류</option>
                {projects.map((project) => <option key={project.id}>{project.name}</option>)}
              </select>
            </SettingRow>
            <SettingRow title="기본 우선순위" description="새 할 일에 자동으로 적용할 우선순위예요.">
              <Choice label="기본 우선순위" options={['낮음', '보통', '높음']} value={String(values.defaultPriority)} onChange={(value) => setValue('defaultPriority', value)} />
            </SettingRow>
            <SettingRow title="예상 소요 시간" description="새 할 일의 기본 집중 시간을 정해요.">
              <select aria-label="예상 소요 시간" value={String(values.defaultDuration)} onChange={(event) => setValue('defaultDuration', event.target.value)}>
                <option>15분</option><option>30분</option><option>45분</option><option>60분</option>
              </select>
            </SettingRow>
          </section>
        )
      case 'productivity':
        return (
          <section className="settings-card">
            <SettingRow title="하루 할 일 목표" description="하루에 완료하고 싶은 할 일 개수예요.">
              <Choice label="하루 할 일 목표" options={['1개', '3개', '5개']} value={String(values.dailyTodoGoal)} onChange={(value) => setValue('dailyTodoGoal', value)} />
            </SettingRow>
            <SettingRow title="하루 집중 목표" description="프로필 기록에서 기준으로 사용할 시간이에요.">
              <select aria-label="하루 집중 목표" value={String(values.dailyFocusGoal)} onChange={(event) => setValue('dailyFocusGoal', event.target.value)}>
                <option>30분</option><option>60분</option><option>90분</option><option>120분</option>
              </select>
            </SettingRow>
            <SettingRow title="집중 세션" description="집중 타이머의 기본 길이를 정해요.">
              <Choice label="집중 세션" options={['25분', '45분', '60분']} value={String(values.focusSession)} onChange={(value) => setValue('focusSession', value)} />
            </SettingRow>
          </section>
        )
      case 'reminders':
        return (
          <section className="settings-card">
            <SettingRow title="일정 미리 알림" description="일정 시작 전에 기본으로 알릴 시간이에요.">
              <select aria-label="일정 미리 알림" value={String(values.eventReminder)} onChange={(event) => setValue('eventReminder', event.target.value)}>
                <option>알림 없음</option><option>5분 전</option><option>10분 전</option><option>30분 전</option>
              </select>
            </SettingRow>
            <SettingRow title="할 일 미리 알림" description="할 일 마감 전에 기본으로 알릴 시간이에요.">
              <select aria-label="할 일 미리 알림" value={String(values.todoReminder)} onChange={(event) => setValue('todoReminder', event.target.value)}>
                <option>알림 없음</option><option>30분 전</option><option>1시간 전</option><option>하루 전</option>
              </select>
            </SettingRow>
            <SettingRow title="기한이 지난 할 일" description="미완료 상태라면 다음 날 다시 알려줘요.">
              <Toggle checked={Boolean(values.overdueReminder)} label="기한이 지난 할 일 다시 알림" onChange={() => toggle('overdueReminder')} />
            </SettingRow>
          </section>
        )
      case 'notifications':
        return (
          <section className="settings-card">
            {[
              ['desktopNotification', '데스크톱 알림', '일정과 마감 알림을 화면에 표시해요.'],
              ['soundNotification', '알림 소리', '중요한 알림이 올 때 소리를 재생해요.'],
              ['weeklySummary', '주간 요약', '매주 월요일에 지난 기록과 목표를 알려줘요.'],
              ['quietHours', '방해 금지 시간', '오후 10시부터 오전 8시까지 알림을 쉬어요.'],
            ].map(([key, title, description]) => (
              <SettingRow key={key} title={title} description={description}>
                <Toggle checked={Boolean(values[key])} label={title} onChange={() => toggle(key)} />
              </SettingRow>
            ))}
          </section>
        )
      case 'backup':
        return (
          <>
            <section className="settings-card sync-status-card">
              <div className="sync-status-heading">
                <span aria-hidden="true">✓</span>
                <div><strong>동기화 완료</strong><p>오늘 오후 9:27 · 이 기기</p></div>
              </div>
              <button type="button" onClick={() => setNotice('방금 모든 데이터를 동기화했어요.')}>지금 동기화</button>
            </section>
            <section className="settings-card">
              <SettingRow title="자동 동기화" description="변경 사항을 기기 사이에 자동으로 맞춰요.">
                <Toggle checked={Boolean(values.autoSync)} label="자동 동기화" onChange={() => toggle('autoSync')} />
              </SettingRow>
              <SettingRow title="데이터 내보내기" description="일정, 할 일과 목록을 파일로 보관해요.">
                <button type="button" onClick={() => setNotice('데이터 내보내기 버튼을 눌렀어요.')}>내보내기</button>
              </SettingRow>
              <SettingRow title="백업 가져오기" description="이전에 저장한 하루 데이터를 불러와요.">
                <button type="button" onClick={() => setNotice('백업 파일 선택 창을 여는 목업이에요.')}>가져오기</button>
              </SettingRow>
            </section>
          </>
        )
      case 'integrations':
        return (
          <section className="settings-card integration-list">
            {[
              ['Google Calendar', 'G', '외부 일정을 하루 캘린더에서 함께 확인해요.'],
              ['Apple 캘린더', '●', 'Apple 기기의 일정과 하루를 연결해요.'],
              ['Slack', '⌗', '할 일 마감과 집중 기록을 채널에 공유해요.'],
            ].map(([service, icon, description]) => {
              const isConnected = connectedServices.includes(service)
              return (
                <div className="integration-row" key={service}>
                  <span aria-hidden="true">{icon}</span>
                  <div><strong>{service}</strong><p>{description}</p></div>
                  <button type="button" className={isConnected ? 'connected' : ''} onClick={() => connectService(service)}>{isConnected ? '연결됨' : '연결'}</button>
                </div>
              )
            })}
          </section>
        )
      case 'calendar':
        return (
          <section className="settings-card">
            <SettingRow title="한 주의 시작" description="주간 보기와 월간 달력의 첫 번째 요일이에요.">
              <Choice label="한 주의 시작" options={['월요일', '일요일']} value={String(values.weekStartsOn)} onChange={(value) => setValue('weekStartsOn', value)} />
            </SettingRow>
            <SettingRow title="캘린더 기본 보기" description="캘린더를 열었을 때 먼저 보여줄 범위예요.">
              <Choice label="캘린더 기본 보기" options={['일간', '주간', '월간']} value={String(values.defaultCalendarView)} onChange={(value) => setValue('defaultCalendarView', value)} />
            </SettingRow>
            <SettingRow title="주말 표시" description="주간·월간 보기에 토요일과 일요일을 표시해요.">
              <Toggle checked={Boolean(values.showWeekends)} label="주말 표시" onChange={() => toggle('showWeekends')} />
            </SettingRow>
            <SettingRow title="완료한 할 일 표시" description="날짜별 일정에서 완료한 할 일도 함께 확인해요.">
              <Toggle checked={Boolean(values.showCompleted)} label="완료한 할 일 표시" onChange={() => toggle('showCompleted')} />
            </SettingRow>
          </section>
        )
    }
  }

  return (
    <main className="settings-page">
      <div className="settings-layout">
        <aside className="settings-sidebar" aria-label="설정 카테고리">
          <label className="settings-search">
            <span className="sr-only">설정 검색</span>
            <i aria-hidden="true">⌕</i>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="설정 검색" />
          </label>
          <nav>
            {filteredSections.map((section) => (
              <button key={section.id} type="button" className={selectedSection === section.id ? 'active' : ''} aria-current={selectedSection === section.id ? 'page' : undefined} onClick={() => setSelectedSection(section.id)}>
                <span aria-hidden="true">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </nav>
          {filteredSections.length === 0 && (
            <p className="settings-search-empty">일치하는 설정이 없어요.</p>
          )}
        </aside>

        <section className="settings-content" aria-labelledby="settings-title">
          <header className="settings-content-header">
            <div>
              <p className="eyebrow">설정</p>
              <h1 id="settings-title">{selected.title}</h1>
              <p>{selected.description}</p>
            </div>
            <span className="settings-saved-state" aria-live="polite">✓ {notice}</span>
          </header>
          {renderSettings()}
        </section>
      </div>
    </main>
  )
}
