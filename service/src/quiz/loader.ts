/* eslint-disable no-console */
import type { WorkflowState } from './types'
import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'

export async function loadFile(state: WorkflowState): Promise<WorkflowState> {
  const filePath = state.file_path
  const ext = extname(filePath).toLowerCase()

  console.log('📄 [加载] 开始加载文件:', { filePath, ext })

  if (!existsSync(filePath)) {
    console.error('❌ [加载] 文件不存在:', filePath)
    throw new Error('File not found')
  }

  // PDF 文件
  if (ext === '.pdf') {
    try {
      const pdfParse = await import('pdf-parse')
      const dataBuffer = readFileSync(filePath)
      const data = await pdfParse.default(dataBuffer)
      state.text = data.text
      return state
    }
    catch (error: any) {
      throw new Error(`Failed to load PDF: ${error?.message || String(error)}`)
    }
  }

  // Word 文档
  if (ext === '.docx') {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ path: filePath })
      state.text = result.value
      return state
    }
    catch (error: any) {
      throw new Error(`Failed to load DOCX: ${error?.message || String(error)}`)
    }
  }

  // 纯文本文件（Markdown, TXT）
  if (ext === '.md' || ext === '.txt') {
    try {
      state.text = readFileSync(filePath, 'utf-8')
      console.log('✅ [加载] 文本文件加载成功，内容长度:', state.text.length)
      return state
    }
    catch (error: any) {
      console.error('❌ [加载] 加载文本文件失败:', error)
      throw new Error(`Failed to load text file: ${error?.message || String(error)}`)
    }
  }

  console.error('❌ [加载] 不支持的文件格式:', ext)
  throw new Error(`Unsupported file format: ${ext}`)
}
