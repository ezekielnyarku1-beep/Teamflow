import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (process.platform === 'win32' && process.env.LOCAL_AI_BASE_URL === 'http://127.0.0.1:11435') {
  const script = fileURLToPath(new URL('./start-local-ai.ps1', import.meta.url))
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
    windowsHide: true, stdio: 'inherit', env: { ...process.env, LLAMA_API_KEY: process.env.LOCAL_AI_TOKEN || '' },
  })
}
