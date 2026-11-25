import { useEffect } from 'react'
import './contextMenu.css'

export default function Toast({ message, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
