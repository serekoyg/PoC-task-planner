import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import SocialLoginButtons from '../components/SocialLoginButtons'
import type { AuthMethod } from '../lib/auth'

type SignupPageProps = {
  onSignup: (method: AuthMethod) => void
}

export default function SignupPage({ onSignup }: SignupPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const submitSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (name.trim().length < 2) {
      setErrorMessage('이름을 두 글자 이상 입력해 주세요.')
      return
    }

    if (!email.includes('@')) {
      setErrorMessage('사용할 이메일 주소를 확인해 주세요.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('비밀번호를 8자 이상 입력해 주세요.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 서로 일치하지 않아요.')
      return
    }

    if (!agreedToTerms) {
      setErrorMessage('서비스 이용약관과 개인정보 처리방침에 동의해 주세요.')
      return
    }

    setErrorMessage('')
    onSignup('email')
  }

  return (
    <main className="login-page signup-page">
      <section className="login-panel signup-panel" aria-labelledby="signup-title">
        <Link className="login-brand" to="/login" aria-label="하루 로그인으로 이동">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <strong>하루</strong>
        </Link>

        <div className="login-heading signup-heading">
          <p className="eyebrow">CREATE YOUR DAY</p>
          <h1 id="signup-title">나만의 하루를 시작하세요</h1>
          <p>계정을 만들고 일정과 할 일을 어디서든 이어서 관리해 보세요.</p>
        </div>

        <SocialLoginButtons onSocialLogin={onSignup} />

        <div className="auth-divider">
          <span>또는 이메일로 가입</span>
        </div>

        <form className="login-form signup-form" onSubmit={submitSignup}>
          <div className="signup-field-row">
            <label>
              <span>이름</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="홍길동"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby={errorMessage ? 'signup-error' : undefined}
              />
            </label>

            <label>
              <span>이메일</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby={errorMessage ? 'signup-error' : undefined}
              />
            </label>
          </div>

          <div className="signup-field-row">
            <label>
              <span>비밀번호</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={errorMessage ? 'signup-error' : undefined}
              />
            </label>

            <label>
              <span>비밀번호 확인</span>
              <input
                type="password"
                name="passwordConfirm"
                autoComplete="new-password"
                placeholder="한 번 더 입력"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                aria-describedby={errorMessage ? 'signup-error' : undefined}
              />
            </label>
          </div>

          <label className="terms-check">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              aria-describedby={errorMessage ? 'signup-error' : undefined}
            />
            <span>
              <strong>서비스 이용약관</strong>과 <strong>개인정보 처리방침</strong>에
              동의합니다.
            </span>
          </label>

          {errorMessage && (
            <p className="login-error" id="signup-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button className="login-submit" type="submit">
            무료로 시작하기
          </button>
        </form>

        <p className="login-footnote auth-switch-link">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>
      </section>

      <aside className="login-preview signup-preview" aria-hidden="true">
        <div className="login-preview-copy">
          <p>계획부터 집중까지 한 곳에서</p>
          <strong>내일의 여유를 만드는 오늘.</strong>
        </div>
        <div className="signup-benefit-card">
          <p className="eyebrow">WITH HARU</p>
          <ul>
            <li>
              <span>01</span>
              <div>
                <strong>일정과 할 일을 한눈에</strong>
                <small>흩어진 계획을 하나의 흐름으로 정리해요.</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>집중한 시간까지 기록</strong>
                <small>계획을 실행한 순간도 놓치지 않아요.</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>함께 만드는 꾸준한 하루</strong>
                <small>모임 사람들과 목표와 진척을 나눠요.</small>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </main>
  )
}
