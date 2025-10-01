// 引入 Node.js 内置模块：文件系统（fs）和路径（path）
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// 引入 Express 框架和 Multer（用于文件上传）
import express from 'express'
import multer from 'multer'

// 引入自定义类型和模块
import type { RequestProps } from './types' // 请求参数类型
import type { ChatMessage } from './chatgpt' // 聊天消息类型
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt' // 聊天相关逻辑
import { auth } from './middleware/auth' // 身份认证中间件
import { limiter } from './middleware/limiter' // 请求频率限制中间件
import { isNotEmptyString } from './utils/is' // 工具函数：判断非空字符串
import { runWorkflow } from './quiz/workflow' // 生成测验题目的工作流
import { saveQuestions } from './quiz/storage' // 保存题目到数据库/文件
import type { SavePayload } from './quiz/types' // 保存题目的数据结构类型

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())
// 全局 CORS 配置：允许所有来源跨域访问（开发环境常用，生产环境应限制）
app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})
// 流式返回 LLM 的回复内容
router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
    let firstChunk = true
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
      temperature,
      top_p,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})
//////////////////////////////////////////////////////////////////
// File upload config 设置上传目录：优先使用环境变量 UPLOAD_DIR，否则用项目根目录下的 uploads 文件夹
const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
if (!existsSync(uploadDir))
  mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const original = file.originalname || 'upload.txt'
    cb(null, `${timestamp}-${original}`)
  },
})
const upload = multer({ storage })

// Upload endpoint: returns saved filePath
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file)
    return res.status(400).send({ status: 'Fail', message: '没有上传文件', data: null })
  const filePath = req.file.path
  return res.send({ status: 'Success', message: '文件上传成功！', data: { filePath } })// return 文件路径
})

// Quiz workflow: run
router.post('/quiz/run', [auth, limiter], async (req, res) => {
  try {
    const { filePath, numQuestions } = req.body as { filePath: string; numQuestions?: number }
    if (!filePath)
      return res.status(400).send({ status: 'Fail', message: 'filePath is required', data: null })
    const result = await runWorkflow(filePath, numQuestions)
    res.send({ status: 'Success', message: '', data: result })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Quiz save: after user confirmation
router.post('/quiz/save', [auth, limiter], async (req, res) => {
  try {
    const payload = req.body as SavePayload
    if (!payload || !Array.isArray(payload.questions))
      return res.status(400).send({ status: 'Fail', message: 'questions is required', data: null })
    const saved = saveQuestions(payload)
    res.send({ status: 'Success', message: '', data: saved })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})
////////////////////////////////////////////////////////////////
router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
