import fs from 'fs'
import path from 'path'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import type { WorkflowState } from './types'

export async function loadFile(state: WorkflowState): Promise<WorkflowState> {
  const filePath = state.file_path
  const ext = path.extname(filePath).toLowerCase()

  if (!fs.existsSync(filePath))
    throw new Error('File not found')

  if (ext === '.pdf') {
    const loader = new PDFLoader(filePath)
    const docs = await loader.load()
    state.text = docs.map(d => d.pageContent).join('\n\n')
    return state
  }

  if (ext === '.docx') {
    const { DocxLoader } = await import('@langchain/community/document_loaders/fs/docx')
    const loader = new DocxLoader(filePath)
    const docs = await loader.load()
    state.text = docs.map(d => d.pageContent).join('\n\n')
    return state
  }

  if (ext === '.md' || ext === '.txt') {
    const { TextLoader } = await import('@langchain/community/document_loaders/fs/text')
    const loader = new TextLoader(filePath)
    const docs = await loader.load()
    state.text = docs[0].pageContent
    return state
  }

  throw new Error('Unsupported file format')
}
