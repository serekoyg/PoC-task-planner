import { useState } from 'react'
import type { AuthMethod } from '../lib/auth'

type SocialLoginButtonsProps = {
  onSocialLogin: (method: AuthMethod) => void
}

const providers: Array<{
  method: Exclude<AuthMethod, 'email'>
  label: string
  mark: string
}> = [
  { method: 'google', label: 'Google로 계속하기', mark: 'G' },
  { method: 'kakao', label: '카카오로 계속하기', mark: 'K' },
  { method: 'apple', label: 'Apple로 계속하기', mark: '\uf8ff' },
]

export default function SocialLoginButtons({
  onSocialLogin,
}: SocialLoginButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<
    Exclude<AuthMethod, 'email'> | null
  >(null)

  const continueWith = (method: Exclude<AuthMethod, 'email'>) => {
    setPendingProvider(method)
    window.setTimeout(() => onSocialLogin(method), 350)
  }

  return (
    <div className="social-login-list" aria-label="소셜 계정으로 계속하기">
      {providers.map((provider) => (
        <button
          className={`social-login-button ${provider.method}`}
          type="button"
          key={provider.method}
          disabled={pendingProvider !== null}
          onClick={() => continueWith(provider.method)}
        >
          <span className="social-login-mark" aria-hidden="true">
            {provider.mark}
          </span>
          <span>
            {pendingProvider === provider.method
              ? '계정을 연결하고 있어요…'
              : provider.label}
          </span>
        </button>
      ))}
    </div>
  )
}
