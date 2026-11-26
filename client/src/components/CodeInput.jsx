import { useEffect, useRef } from 'react'

export const codeLength = 6

export default function CodeInput({ digits, onChange, onComplete, invalid, disabled }) {
  const boxes = useRef([])

  useEffect(() => {
    if (disabled) return
    const firstEmpty = boxes.current.find(box => !box.value)
    if (firstEmpty && document.activeElement?.closest('.code-input') === null) firstEmpty.focus()
  }, [disabled])

  function fill(start, text) {
    const typed = text.replace(/\D/g, '').slice(0, codeLength - start).split('')
    if (!typed.length) return
    const next = [...digits]
    typed.forEach((digit, offset) => {
      next[start + offset] = digit
    })
    onChange(next)
    boxes.current[Math.min(start + typed.length, codeLength - 1)]?.focus()
    if (next.every(Boolean)) onComplete(next.join(''))
  }

  function clear(index) {
    const next = [...digits]
    next[index] = ''
    onChange(next)
  }

  function handleKey(event, index) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      clear(index - 1)
      boxes.current[index - 1].focus()
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      boxes.current[index - 1].focus()
    } else if (event.key === 'ArrowRight' && index < codeLength - 1) {
      event.preventDefault()
      boxes.current[index + 1].focus()
    }
  }

  return (
    <div className={invalid ? 'code-input is-invalid' : 'code-input'} role="group" aria-label="Verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={element => {
            boxes.current[index] = element
          }}
          className="code-input-box"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={index === 0 ? codeLength : 1}
          aria-label={`Digit ${index + 1} of ${codeLength}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          autoFocus={index === 0}
          value={digit}
          onFocus={event => event.target.select()}
          onKeyDown={event => handleKey(event, index)}
          onPaste={event => {
            event.preventDefault()
            fill(index, event.clipboardData.getData('text'))
          }}
          onChange={event => {
            if (event.target.value) fill(index, event.target.value)
            else clear(index)
          }}
        />
      ))}
    </div>
  )
}
