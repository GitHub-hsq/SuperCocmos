import type { SavePayload } from './types'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const QUESTIONS_DIR = path.resolve(process.cwd(), 'questions')

export function ensureDir() {
  if (!fs.existsSync(QUESTIONS_DIR))
    fs.mkdirSync(QUESTIONS_DIR, { recursive: true })
}

export function saveQuestions(payload: SavePayload) {
  ensureDir()
  const id = randomBytes(16).toString('base64url').substring(0, 21)
  const file = path.join(QUESTIONS_DIR, `${id}.json`)
  const content = JSON.stringify({ id, createdAt: new Date().toISOString(), ...payload }, null, 2)
  fs.writeFileSync(file, content, 'utf-8')
  return { id, file }
}
