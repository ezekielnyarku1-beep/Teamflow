import { useEffect } from 'react'

const appName = 'Overview Teams'

// Keeps the browser tab title in step with the page heading (the h1), so tabs, history and screen readers say which
// page this is instead of the app name on every page. Headings that load later, like an issue title, are picked up.
export default function DocumentTitle() {
  useEffect(() => {
    let frame = 0
    function update() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const heading = document.querySelector('h1')?.textContent.trim()
        const title = heading && heading !== appName ? `${heading} · ${appName}` : appName
        if (document.title !== title) document.title = title
      })
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.getElementById('root'), { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])
  return null
}
