import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AuthLayout from './AuthLayout.jsx'
import CodeInput, { codeLength } from '../../components/CodeInput.jsx'
import FormError from '../../components/FormError.jsx'
import SubmitButton from '../../components/SubmitButton.jsx'
import { authClient, clearPendingVerification, sendEmailCode, signOut, verifyEmailCode } from '../../lib/auth.js'
import { useFormAction } from '../../lib/useFormAction.js'

const cooldownSeconds = 60
const emptyCode = () => Array(codeLength).fill('')
const cooldownKey = email => `overview-teams-code-sent-${email.toLowerCase()}`

function readSentAt(email, justSent) {
  try {
    const saved = Number(window.sessionStorage.getItem(cooldownKey(email)))
    if (saved) return saved
    if (!justSent) return 0
    window.sessionStorage.setItem(cooldownKey(email), String(Date.now()))
  } catch {
    return justSent ? Date.now() : 0
  }
  return Date.now()
}

function saveSentAt(email) {
  const now = Date.now()
  try {
    window.sessionStorage.setItem(cooldownKey(email), String(now))
  } catch {
    return now
  }
  return now
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const justSent = searchParams.get('sent') === '1'
  const navigate = useNavigate()
  const session = authClient.useSession()
  const [digits, setDigits] = useState(emptyCode)
  const [sentAt, setSentAt] = useState(() => readSentAt(email, justSent))
  const [now, setNow] = useState(() => Date.now())
  const [notice, setNotice] = useState('')
  const verify = useFormAction()
  const resend = useFormAction()
  const leave = useFormAction()
  const autoSent = useRef(false)
  const secondsLeft = Math.max(0, Math.ceil((sentAt + cooldownSeconds * 1000 - now) / 1000))

  useEffect(() => {
    if (!secondsLeft) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  function sendCode() {
    resend.run(async () => {
      await sendEmailCode(email)
      setSentAt(saveSentAt(email))
      setNow(Date.now())
      setNotice('We sent a new code.')
    })
  }

  useEffect(() => {
    if (autoSent.current || !email || sentAt) return
    autoSent.current = true
    sendCode()
  })

  function submit(code) {
    if (verify.busy) return
    verify.run(async () => {
      if (code.length !== codeLength) throw new Error('Enter all 6 digits of the code.')
      try {
        await verifyEmailCode(email, code)
      } catch (error) {
        setDigits(emptyCode())
        throw error
      }
      navigate('/overview', { replace: true })
    })
  }

  function goBack() {
    leave.run(async () => {
      if (session.data?.user) await signOut()
      clearPendingVerification()
      navigate('/signup', { replace: true })
    })
  }

  if (!email) {
    return (
      <AuthLayout title="Check your email" subtitle="This page needs the email address you signed up with." footer={<Link to="/signup">Back to sign up</Link>}>
        <p className="auth-resend">Start again from the sign-up page.</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      showCheck
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish creating your account.
        </>
      }
      footer={
        <button type="button" className="link-button" disabled={leave.busy} onClick={goBack}>
          Use a different email
        </button>
      }
    >
      <form
        onSubmit={event => {
          event.preventDefault()
          submit(digits.join(''))
        }}
        noValidate
      >
        <CodeInput
          digits={digits}
          onChange={next => {
            setDigits(next)
            setNotice('')
          }}
          onComplete={submit}
          invalid={Boolean(verify.error)}
          disabled={verify.busy}
        />
        <FormError message={verify.error || resend.error || leave.error} />
        <SubmitButton busy={verify.busy}>Verify</SubmitButton>
      </form>
      <p className="auth-resend auth-code-resend" aria-live="polite">
        {notice && <>{notice} </>}
        {secondsLeft > 0 ? (
          `You can send a new code in ${secondsLeft} s.`
        ) : (
          <>
            Did not get it?{' '}
            <button type="button" className="link-button" disabled={resend.busy} onClick={sendCode}>
              {resend.busy ? 'Sending…' : 'Resend code'}
            </button>
          </>
        )}
      </p>
    </AuthLayout>
  )
}
