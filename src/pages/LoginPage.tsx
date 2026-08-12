import { type FormEvent, useState } from 'react'

const DEMO_EMAIL = 'demo@haru.app'
const DEMO_PASSWORD = 'haru1234'

type LoginPageProps = {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [errorMessage, setErrorMessage] = useState('')

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setErrorMessage('데모 계정 정보를 확인해 주세요.')
      return
    }

    setErrorMessage('')
    onLogin()
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand" aria-label="하루">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <strong>하루</strong>
        </div>

        <div className="login-heading">
          <p className="eyebrow">DEMO WORKSPACE</p>
          <h1 id="login-title">오늘의 계획을 시작해 볼까요?</h1>
          <p>로그인하면 일정, 할 일, 모임을 한곳에서 이어서 관리할 수 있어요.</p>
        </div>

        <div className="demo-account-note">
          <span aria-hidden="true">✓</span>
          <p>
            <strong>데모 계정이 준비되어 있어요</strong>
            <small>아래 정보로 바로 로그인할 수 있습니다.</small>
          </p>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <label>
            <span>아이디</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={errorMessage ? 'login-error' : undefined}
            />
          </label>

          <label>
            <span>비밀번호</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={errorMessage ? 'login-error' : undefined}
            />
          </label>

          {errorMessage && (
            <p className="login-error" id="login-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button className="login-submit" type="submit">
            데모 계정으로 로그인
          </button>
        </form>

        <p className="login-footnote">별도 가입 없이 데모 기능을 둘러볼 수 있어요.</p>
      </section>

      <aside className="login-preview" aria-hidden="true">
        <div className="login-preview-copy">
          <p>오늘을 가볍게 정리하고</p>
          <strong>중요한 일에 집중하세요.</strong>
        </div>
        <div className="login-preview-card">
          <div>
            <span>8월 12일 수요일</span>
            <small>오늘의 계획</small>
          </div>
          <ul>
            <li>
              <i>09:30</i>
              <p>
                <strong>주간 계획 회의</strong>
                <small>팀 운영</small>
              </p>
            </li>
            <li>
              <i>14:00</i>
              <p>
                <strong>프로토타입 리뷰</strong>
                <small>하루 리뉴얼</small>
              </p>
            </li>
            <li className="completed">
              <i>✓</i>
              <p>
                <strong>우선순위 정리하기</strong>
                <small>완료</small>
              </p>
            </li>
          </ul>
        </div>
      </aside>
    </main>
  )
}
