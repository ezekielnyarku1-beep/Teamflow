import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import AuthLayout from './AuthLayout.jsx'
import FormError from '../../components/FormError.jsx'
import GoogleButton from '../../components/GoogleButton.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import SubmitButton from '../../components/SubmitButton.jsx'
import TextField from '../../components/TextField.jsx'
import { signIn } from '../../lib/auth.js'
import { isEmail } from '../../lib/authValidation.js'
import { useFormAction } from '../../lib/useFormAction.js'
import { useGoogleError } from '../../lib/useGoogleError.js'

export default function LoginPage({ onGoogle }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const form = useFormAction()
  const googleError = useGoogleError()
  const [searchParams] = useSearchParams()

  function submit(event) {
    event.preventDefault()
    googleError.clear()
    form.run(async () => {
      if (!isEmail(email)) throw new Error('Enter a valid email address.')
      if (!password) throw new Error('Enter your password.')
      await signIn(email.trim(), password)
    })
  }

  function continueWithGoogle() {
    googleError.clear()
    form.run(() => onGoogle(searchParams.get('redirectTo')))
  }

  return (
    <AuthLayout
      title="Log in to your workspace"
      subtitle="Welcome back. Pick up where your team left off."
      footer={
        <>
          New to Overview Teams? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <TextField id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@company.com" />
        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Your password"
          extra={<Link to="/forgot-password">Forgot password?</Link>}
        />
        <SubmitButton busy={form.busy}>Log in</SubmitButton>
        <GoogleButton label="Sign in with Google" busy={form.busy} onClick={continueWithGoogle} />
        <FormError message={form.error || googleError.message} />
      </form>
    </AuthLayout>
  )
}
