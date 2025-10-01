import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { SavePayload } from './types'

const QUESTIONS_DIR = path.resolve(process.cwd(), 'questions')

export function ensureDir() {
  if (!fs.existsSync(QUESTIONS_DIR))
    fs.mkdirSync(QUESTIONS_DIR, { recursive: true })
}

export function saveQuestions(payload: SavePayload) {
  ensureDir()
  const id = uuidv4()
  const file = path.join(QUESTIONS_DIR, `${id}.json`)
  const content = JSON.stringify({ id, createdAt: new Date().toISOString(), ...payload }, null, 2)
  fs.writeFileSync(file, content, 'utf-8')
  return { id, file }
}
