/* eslint-disable perfectionist/sort-imports */
// 🔥 必须在所有导入之前加载环境变量
import 'dotenv/config'

import type { ChatMessage } from './chatgpt' // 聊天消息类型

import type { SavePayload } from './quiz/types' // 保存题目的数据结构类型

// 引入 Node.js 内置模块：文件系统（fs）和路径（path）
import { existsSync, mkdirSync, unlinkSync } from 'node:fs'

import { join } from 'node:path'

import cookieParser from 'cookie-parser'

// 引入 Express 框架和 Multer（用于文件上传）
import express from 'express'
import type { Request } from 'express'

import multer from 'multer'

import { nanoid } from 'nanoid'
import auth0Routes from './api/routes' // Auth0 + Supabase 路由
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt' // 聊天相关逻辑

import { testSupabaseConnection } from './db/supabaseClient' // Supabase 连接
import { requireAuth, unifiedAuth } from './middleware/authUnified' // 统一认证中间件（仅支持 Auth0）
import { limiter } from './middleware/limiter' // 请求频率限制中间件
import { requireModelAccess } from './middleware/modelAccessAuth' // 模型访问权限验证中间件

import { saveQuestions } from './quiz/storage' // 保存题目到数据库/文件
import { runWorkflow } from './quiz/workflow' // 生成测验题目的工作流
import { initUserTable, testConnection } from './utils/db' // 数据库连接
import { isNotEmptyString } from './utils/is' // 工具函数：判断非空字符串
import { createUser, deleteUser, findUserByEmail, findUserById, findUserByUsername, getAllUsers, updateUser, validateUserPassword } from './utils/userService'

// 扩展 Request 类型以包含 userId
interface AuthRequest extends Request {
  userId?: string
}

const envPath = join(process.cwd(), '.env')
console.warn('🔍 [Dotenv Debug] 当前工作目录:', process.cwd())
console.warn('🔍 [Dotenv Debug] .env 文件路径:', envPath)
console.warn('🔍 [Dotenv Debug] .env 文件是否存在:', existsSync(envPath))
console.warn('🔍 [Dotenv Debug] AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN)
console.warn('🔍 [Dotenv Debug] SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 30)) // 用户服务

const app = express()
const router = express.Router()

// 声明全局配置变量（在文件后面初始化）
let workflowConfig: import('./quiz/types').WorkflowNodeConfig[] = []

app.use(express.static('public'))
app.use(express.json())
app.use(cookieParser()) // 🔥 添加 Cookie 解析中间件

// 🔥 禁用响应压缩和缓冲（对于流式响应很重要）
app.set('x-powered-by', false)
app.set('etag', false)

// 全局 CORS 配置：支持 Auth0 认证和 SSE
app.all('*', (req, res, next) => {
  // 允许的来源（开发环境）
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3002',
    'http://localhost:1002', // 🔥 前端实际端口
    'http://127.0.0.1:1002', // 🔥 前端实际端口（127.0.0.1）
  ]
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }

  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }

  next()
})

// 🚀 流式返回 LLM 的回复内容 - 优化版：支持消息历史
router.post('/chat-process', unifiedAuth, requireAuth, limiter, requireModelAccess(), async (req, res) => {
  // 🔥 设置正确的响应头以支持真正的流式传输
  res.setHeader('Content-Type', 'text/event-stream') // 使用 SSE 格式
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

  // 🔥 设置 TCP 无延迟，禁用 Nagle 算法
  if (req.socket) {
    req.socket.setNoDelay(true)
    req.socket.setTimeout(0)
  }

  res.flushHeaders() // 🔥 立即发送响应头

  const _perfStart = Date.now() // 🔥 在外层声明，以便在 catch 中使用

  // 🔥 声明变量在外层作用域，以便在 catch 块中使用
  let conversationId: string | undefined
  let prompt: string | undefined

  try {
    const requestBody = req.body as any
    const {
      prompt: userPrompt,
      systemMessage,
      temperature,
      top_p,
      model, // model 现在是 model_id
      maxTokens,
      conversationId: clientConversationId, // 前端传来的后端 UUID（可能为空）
      frontendUuid, // 🔥 前端传来的 nanoid（用于路由）
      parentMessageId: _parentMessageId,
      providerId, // 供应商 ID
      contextMessages, // 🔥 前端传来的本地缓存消息（可选）
    } = requestBody

    // 🔥 赋值给外层变量
    prompt = userPrompt

    // console.warn('⏱️ [后端-性能] 请求到达时间:', new Date().toISOString())
    console.warn('📝 [后端] 接收请求:', {
      model,
      providerId,
      conversationId: clientConversationId,
      frontendUuid: frontendUuid || '（未提供）',
    })

    if (!model || !providerId) {
      res.write(JSON.stringify({ role: 'assistant', text: '', error: { message: '未指定模型或供应商' } }))
      return res.end()
    }

    // 🚀 步骤1：快速从 Redis 获取模型配置（<10ms）
    const _step1Start = Date.now()
    const { getModelFromCache } = await import('./cache/modelCache')
    let modelConfig = await getModelFromCache(model, providerId)

    // 降级：如果 Redis 没有，从数据库查询
    if (!modelConfig) {
      // const dbQueryStart = Date.now()
      const { getModelsWithProviderByModelId } = await import('./db/providerService')
      const models = await getModelsWithProviderByModelId(model)
      modelConfig = models.find((m: any) => m.provider_id === providerId) || models[0]
      // console.warn(`⏱️ [后端-性能] 数据库查询耗时: ${Date.now() - dbQueryStart}ms`)
    }
    // const step1Time = Date.now() - step1Start
    // console.warn(`⏱️ [后端-性能] 获取模型配置耗时: ${step1Time}ms`)

    if (!modelConfig || !modelConfig.provider) {
      res.write(JSON.stringify({ role: 'assistant', text: '', error: { message: '模型配置错误' } }))
      return res.end()
    }

    // 🚀 步骤2：快速获取用户 ID
    const authReq = req as AuthRequest
    const auth0UserId = authReq.userId
    if (!auth0UserId) {
      res.write(JSON.stringify({ role: 'assistant', text: '', error: { message: '认证失败' } }))
      return res.end()
    }

    // 🔥 获取 Supabase 用户信息
    const { findUserByAuth0Id } = await import('./db/supabaseUserService')
    const user = await findUserByAuth0Id(auth0UserId)
    if (!user) {
      res.write(JSON.stringify({ role: 'assistant', text: '', error: { message: '用户不存在' } }))
      return res.end()
    }

    // 🔥 准备会话相关的工具
    const { getConversationContextWithCache } = await import('./cache/messageCache')

    // 🔥 UUID 格式验证（PostgreSQL UUID 格式）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidUuid = clientConversationId && uuidRegex.test(clientConversationId)

    let conversation = null
    let isNewConversation = false // 🔥 标记是否是新会话（用于决定是否加载历史）

    // 🔥 步骤1：优先使用 frontendUuid 查找会话（防止后端出错时重复创建）
    if (frontendUuid) {
      try {
        const { getConversationByFrontendUuid } = await import('./db/conversationService')
        conversation = await getConversationByFrontendUuid(frontendUuid, user.user_id)
        if (conversation) {
          console.warn('✅ [Conversation] 通过 frontendUuid 找到现有对话:', {
            frontendUuid,
            backendUuid: conversation.id,
          })
          isNewConversation = false
        }
      }
      catch (error: any) {
        console.error('❌ [Conversation] 通过 frontendUuid 查询对话失败:', error.message)
        // 继续尝试其他方式
      }
    }

    // 🔥 步骤2：如果没找到，尝试使用后端 UUID 查找
    if (!conversation && isValidUuid) {
      try {
        const { getConversationById } = await import('./db/conversationService')
        conversation = await getConversationById(clientConversationId!)
        if (conversation) {
          console.warn('✅ [Conversation] 通过后端 UUID 找到现有对话:', clientConversationId)
          isNewConversation = false
        }
      }
      catch (error: any) {
        console.error('❌ [Conversation] 查询对话失败:', error.message)
        // 查询失败，继续创建新对话
      }
    }

    // 🔥 步骤3：如果都没找到，创建新会话
    if (!conversation) {
      isNewConversation = true
      const { createConversation } = await import('./db/conversationService')

      conversation = await createConversation({
        user_id: user.user_id,
        model_id: modelConfig.id,
        provider_id: modelConfig.provider_id,
        frontend_uuid: frontendUuid, // 🔥 保存前端 nanoid
        title: prompt.substring(0, 50), // 使用前50个字符作为标题
        temperature: temperature ?? 0.7,
        top_p: top_p ?? 1.0,
        max_tokens: maxTokens ?? 2048,
        system_prompt: systemMessage,
      })
      console.warn('🆕 [Conversation] 创建新会话:', {
        backendUUID: conversation?.id,
        frontendUUID: frontendUuid || '（未提供）',
      })
    }

    if (!conversation) {
      res.write(JSON.stringify({ role: 'assistant', text: '', error: { message: '创建对话失败' } }))
      return res.end()
    }

    // 🔥 赋值给外层变量（而非声明新的局部变量）
    conversationId = conversation.id
    console.warn('📝 [对话] 使用对话ID:', conversationId)

    // 🔥 加载历史消息（仅在已有会话时加载）
    let historyMessages: Array<{ role: string, content: string }> = []

    if (isNewConversation) {
      // 🔥 新会话：不加载历史，只使用系统提示词
      if (systemMessage) {
        historyMessages = [{ role: 'system', content: systemMessage }]
      }
      console.warn('🆕 [上下文] 新会话，不加载历史消息')
    }
    else {
      // 🔥 已有会话：加载历史消息
      // 优先使用前端传来的本地缓存
      if (contextMessages && Array.isArray(contextMessages) && contextMessages.length > 0) {
        historyMessages = contextMessages
        if (process.env.NODE_ENV === 'development') {
          console.warn(`📚 [上下文] 使用前端缓存: ${contextMessages.length} 条`)
        }
      }
      else {
        // 从 Redis/数据库加载
        historyMessages = await getConversationContextWithCache(
          conversationId,
          10, // 最多加载 10 条历史消息
          systemMessage,
        )
        // ✅ 日志已移到 getConversationContextWithCache 函数内部
      }
    }

    // 使用请求参数或默认值
    const finalTemperature = temperature !== undefined ? temperature : 0.7
    const finalTopP = top_p !== undefined ? top_p : 1
    const finalMaxTokens = maxTokens !== undefined ? maxTokens : 4096

    // 🚀 步骤3：立即开始 LLM 调用（不等待权限验证）
    // let authCheckFailed = false
    let firstChunk = true

    // ✅ 权限验证已在中间件中完成，直接调用 LLM

    // 立即开始 LLM 调用
    const _llmCallStart = Date.now()
    let firstResponseTime: number | null = null
    let lastChunkTime = _llmCallStart
    let _chunksSent = 0
    let assistantResponse = '' // 🔥 累积助手的完整回复
    let responseId = '' // 🔥 响应消息 ID
    let responseTokens = 0 // 🔥 响应使用的 tokens

    await chatReplyProcess({
      message: prompt,
      lastContext: {}, // 🔥 不再使用旧的 lastContext，改用 historyMessages
      historyMessages, // 🔥 传递历史消息
      process: (chat: ChatMessage) => {
        // 如果权限验证失败，停止发送数据 - 暂时注释掉
        /*
        if (authCheckFailed) {
          console.error(`🚫 [安全] 权限验证失败，终止响应`)
          res.write(JSON.stringify({ role: 'assistant', text: '', error: { message: '权限验证失败' } }))
          res.end()
          return
        }
        */

        const currentTime = Date.now()

        // 🔥 性能监控：记录第一次响应时间
        if (firstResponseTime === null) {
          firstResponseTime = currentTime
          // const ttfr = firstResponseTime - llmCallStart
          // console.warn(`⏱️ [后端-性能] LLM首次响应时间: ${ttfr}ms`)
        }

        const _timeSinceLastChunk = currentTime - lastChunkTime
        // if (_timeSinceLastChunk > 100) {
        //   console.warn(`⏱️ [后端-性能] 第${_chunksSent + 1}个chunk，距离上次: ${_timeSinceLastChunk}ms`)
        // }

        _chunksSent++
        lastChunkTime = currentTime

        // 🔥 累积助手回复
        if (chat.text) {
          assistantResponse = chat.text
        }
        if (chat.id) {
          responseId = chat.id
        }
        if (chat.detail?.usage?.total_tokens) {
          responseTokens = chat.detail.usage.total_tokens
        }

        // 🔥 立即发送数据，不缓冲（添加 conversationId）
        const responseData = {
          ...chat,
          conversationId, // 🔥 返回对话ID给前端
        }
        const dataToSend = firstChunk ? JSON.stringify(responseData) : `\n${JSON.stringify(responseData)}`

        // const writeStartTime = Date.now()
        res.write(dataToSend)
        // const writeTime = Date.now() - writeStartTime

        // if (writeTime > 10) {
        //   console.warn(`⏱️ [后端-性能] res.write耗时: ${writeTime}ms`)
        // }

        firstChunk = false
      },
      systemMessage,
      temperature: finalTemperature,
      top_p: finalTopP,
      model: modelConfig.model_id,
      maxTokens: finalMaxTokens,
      baseURL: modelConfig.provider.base_url,
      apiKey: modelConfig.provider.api_key,
    })

    // 🔥 异步保存消息到数据库和缓存（优化的两阶段写入）
    // Step 1: 先写 Redis（pending）→ Step 2: 异步写数据库 → Step 3: 更新 Redis 状态
    const saveMessagesAsync = async () => {
      try {
        const { saveMessagePair } = await import('./services/messageSaveService')

        // 🔥 使用优化的两阶段写入方案
        await saveMessagePair(
          conversationId,
          prompt,
          assistantResponse,
          responseTokens,
          {
            model: modelConfig.model_id,
            provider: modelConfig.provider.name,
            response_id: responseId,
          },
        )

        console.warn('✅ [保存] 消息已写入 Redis（pending），异步保存到数据库')
      }
      catch (error) {
        console.error('❌ [保存] 保存消息失败:', error)
        // 不影响用户体验，只记录错误
      }
    }

    // 启动异步保存（不等待完成）
    saveMessagesAsync()

    // const llmTime = Date.now() - llmCallStart
    // const totalTime = Date.now() - perfStart
    // console.warn(`⏱️ [后端-性能] LLM调用总耗时: ${llmTime}ms`)
    // console.warn(`⏱️ [后端-性能] 请求总耗时: ${totalTime}ms`)
    // console.warn(`⏱️ [后端-性能] 发送chunks数: ${chunksSent}`)
    // console.warn(`⏱️ [后端-性能] 结束时间: ${new Date().toISOString()}`)
    // console.warn('⏱️ [后端-性能] ====================')
  }
  catch (error: any) {
    console.error('❌ [Chat] 聊天处理失败:', error)
    // console.warn(`⏱️ [后端-性能] 错误发生在: ${Date.now() - perfStart}ms`)

    // 🔥 在错误时也保存消息到数据库，确保数据库和前端同步
    const saveErrorMessagesAsync = async () => {
      try {
        // 只有在已经创建了会话的情况下才保存消息
        if (typeof conversationId !== 'undefined' && typeof prompt !== 'undefined') {
          // 🔥 使用优化的两阶段写入方案
          const { saveMessagePair } = await import('./services/messageSaveService')
          const errorMessage = error?.message || String(error)

          await saveMessagePair(
            conversationId,
            prompt,
            `API 调用失败: ${errorMessage}`,
            0,
            {
              error: true,
              errorMessage,
            },
          )

          console.warn('✅ [保存] 错误消息已写入 Redis（pending），异步保存到数据库')
        }
      }
      catch (saveError) {
        console.error('❌ [保存] 保存错误消息失败:', saveError)
        // 不影响错误响应的返回
      }
    }

    // 启动异步保存（不等待完成）
    saveErrorMessagesAsync()

    // 构造错误响应
    const errorResponse = {
      role: 'assistant',
      text: '',
      error: {
        message: error?.message || String(error),
      },
    }

    res.write(JSON.stringify(errorResponse))
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
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // 获取文件扩展名
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'))
    // 使用 UUID + 时间戳 + 扩展名，避免中文乱码问题
    const uniqueName = `${Date.now()}_${nanoid()}${ext}`
    cb(null, uniqueName)
  },
})

// 配置 multer，限制文件大小
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
})

// Upload endpoint: returns saved filePath and starts classification
router.post('/upload', unifiedAuth, requireAuth, upload.single('file'), async (req, res) => {
  console.warn('📤 [上传] 接收到文件上传请求')

  if (!req.file) {
    console.error('❌ [上传] 没有文件')
    return res.status(400).send({ status: 'Fail', message: '上传文件失败', data: null })
  }

  const filePath = req.file.path
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8') // 正确处理中文文件名

  console.warn('📁 [上传] 文件信息:', {
    原始文件名: originalName,
    服务器文件名: req.file.filename,
    文件路径: filePath,
    文件大小: req.file.size,
  })

  try {
    // ✅ 文件分类功能暂时禁用，未来将从用户配置的模型中选择
    console.warn('📁 [上传] 文件上传成功（分类功能待实现）')

    return res.send({
      status: 'Success',
      message: '文件上传成功！',
      data: {
        filePath,
        originalName,
        fileName: req.file.filename,
        classification: 'note', // 默认分类
      },
    })
  }
  catch (error: any) {
    console.error('❌ [上传] 处理文件时出错:', error)
    console.error('错误详情:', {
      message: error?.message,
      stack: error?.stack,
      type: typeof error,
      error,
    })

    return res.send({
      status: 'Success',
      message: '文件上传成功！',
      data: {
        filePath,
        originalName,
        fileName: req.file.filename,
        error: error?.message || String(error),
      },
    })
  }
})

// Delete uploaded file
router.post('/upload/delete', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const { filePath } = req.body as { filePath: string }
    if (!filePath)
      return res.status(400).send({ status: 'Fail', message: 'filePath is required', data: null })

    // 检查文件是否在 uploads 目录下（安全检查）
    if (!filePath.includes(uploadDir))
      return res.status(400).send({ status: 'Fail', message: '无效的文件路径', data: null })

    // 检查文件是否存在
    if (!existsSync(filePath))
      return res.status(404).send({ status: 'Fail', message: '文件不存在', data: null })

    // 删除文件
    unlinkSync(filePath)
    return res.send({ status: 'Success', message: '文件删除成功！', data: null })
  }
  catch (error) {
    return res.status(500).send({ status: 'Fail', message: error.message || '删除文件失败', data: null })
  }
})

// Quiz workflow: run
router.post('/quiz/run', unifiedAuth, requireAuth, limiter, async (req, res) => {
  try {
    const { filePath, numQuestions, workflowConfig: customConfig } = req.body as {
      filePath: string
      numQuestions?: number
      workflowConfig?: import('./quiz/types').WorkflowNodeConfig[]
    }
    if (!filePath)
      return res.status(400).send({ status: 'Fail', message: 'filePath is required', data: null })

    // 使用自定义配置或全局配置
    const config = customConfig || workflowConfig
    const result = await runWorkflow(filePath, numQuestions, config.length > 0 ? config : undefined)
    res.send({ status: 'Success', message: '', data: result })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Quiz generate: generate questions from note with specific types
router.post('/quiz/generate', unifiedAuth, requireAuth, limiter, async (req, res) => {
  try {
    const { filePath, questionTypes } = req.body as {
      filePath: string
      questionTypes: {
        single_choice: number
        multiple_choice: number
        true_false: number
      }
    }
    if (!filePath)
      return res.status(400).send({ status: 'Fail', message: 'filePath is required', data: null })

    const { generateQuestionsFromNote } = await import('./quiz/workflow')
    const result = await generateQuestionsFromNote(filePath, questionTypes)

    res.send({ status: 'Success', message: '题目生成成功', data: result })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Quiz feedback: submit user feedback
router.post('/quiz/feedback', unifiedAuth, requireAuth, limiter, async (req, res) => {
  try {
    const { workflowId, feedback, revision_note } = req.body as {
      workflowId: string
      feedback: 'Accept' | 'Reject' | 'Revise'
      revision_note?: string
    }

    if (!workflowId || !feedback)
      return res.status(400).send({ status: 'Fail', message: 'workflowId and feedback are required', data: null })

    const { submitFeedback } = await import('./quiz/workflow')
    submitFeedback(workflowId, { feedback, revision_note })

    res.send({ status: 'Success', message: '反馈提交成功', data: null })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Quiz save: after user confirmation
router.post('/quiz/save', unifiedAuth, requireAuth, limiter, async (req, res) => {
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

// Test LLM connection: simple test to verify API key and model
router.post('/quiz/test-llm', async (req, res) => {
  try {
    console.warn('🧪 [API] 收到 LLM 测试请求')
    const { testLLMConnection } = await import('./quiz/workflow')
    const result = await testLLMConnection()

    if (result.success) {
      console.warn('✅ [API] LLM 测试成功')
      res.send({
        status: 'Success',
        message: result.message,
        data: {
          model: result.model,
          response: result.response,
        },
      })
    }
    else {
      console.error('❌ [API] LLM 测试失败')
      res.status(500).send({
        status: 'Fail',
        message: result.message,
        data: null,
      })
    }
  }
  catch (error: any) {
    console.error('❌ [API] LLM 测试异常:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// ============================================
// 注意：以下旧接口已废弃，使用数据库配置代替
// ============================================
// 旧的 /models/list 和 /usage 接口已移除
// 现在使用 GET /models 从数据库获取模型配置
// API 使用量查询功能需要管理员通过设置页面单独实现

// ============================================
// 注意：旧的内存存储模型数据已移除
// 现在所有模型配置都从 Supabase 数据库读取
// ============================================

// ============================================
// 对话和消息历史 API
// ============================================

// 获取用户的对话列表
router.get('/conversations', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const { findUserByAuth0Id } = await import('./db/supabaseUserService')
    const { getUserConversations } = await import('./db/conversationService')

    const authReq = req as AuthRequest
    const user = await findUserByAuth0Id(authReq.userId!)

    if (!user) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // 获取分页参数
    const limit = Number.parseInt(req.query.limit as string) || 50
    const offset = Number.parseInt(req.query.offset as string) || 0

    const conversations = await getUserConversations(user.user_id, { limit, offset })

    res.send({
      status: 'Success',
      message: '获取对话列表成功',
      data: conversations,
    })
  }
  catch (error: any) {
    console.error('❌ [Conversations] 获取对话列表失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// 获取所有模型（基于用户角色过滤，管理员可以看到完整配置）
router.get('/models', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const { getAllProvidersWithModels } = await import('./db/providerService')
    const { getUserAccessibleProvidersWithModels } = await import('./db/modelRoleAccessService')
    const { userHasRole } = await import('./db/userRoleService')
    const { findUserByAuth0Id } = await import('./db/supabaseUserService')
    const { getCached, setCached, CACHE_TTL } = await import('./cache/cacheService')
    const { PROVIDER_KEYS } = await import('./cache/cacheKeys')

    // 获取当前用户
    const authReq = req as AuthRequest
    const user = await findUserByAuth0Id(authReq.userId!)

    if (!user) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    const isAdmin = await userHasRole(user.user_id, 'admin')

    if (isAdmin) {
      // 管理员：返回所有模型的完整信息（包括 API Key 和 Base URL）
      console.warn('✅ [Models] 管理员请求，返回完整配置（所有模型）')

      // 🔥 尝试从 Redis 缓存获取
      const cacheKey = PROVIDER_KEYS.list()
      let providersWithModels = await getCached(cacheKey)

      if (providersWithModels) {
        console.warn('✅ [ModelsCache] 缓存命中（管理员）')
      }
      else {
        // 缓存未命中，查询数据库
        console.warn('ℹ️ [ModelsCache] 缓存未命中（管理员），从数据库加载')
        providersWithModels = await getAllProvidersWithModels()

        // 保存到缓存（30分钟）
        await setCached(cacheKey, providersWithModels, CACHE_TTL.PROVIDER_LIST)
        console.warn('💾 [ModelsCache] 已缓存管理员模型列表')
      }

      // 🔥 管理员返回完整信息（用于配置页面）
      res.send({
        status: 'Success',
        message: '获取模型列表成功（管理员）',
        data: providersWithModels,
      })
    }
    else {
      // 普通用户：只返回有权限访问的模型，隐藏敏感信息
      console.warn(`✅ [Models] 普通用户请求，基于角色过滤模型: ${user.user_id}`)

      // 🔥 尝试从 Redis 缓存获取用户可访问的模型
      const userCacheKey = `${PROVIDER_KEYS.list()}:user:${user.user_id}`
      let sanitizedData = await getCached(userCacheKey)

      if (sanitizedData) {
        console.warn(`✅ [ModelsCache] 缓存命中（用户: ${user.user_id.substring(0, 8)}...）`)
      }
      else {
        // 缓存未命中，查询数据库
        console.warn(`ℹ️ [ModelsCache] 缓存未命中（用户: ${user.user_id.substring(0, 8)}...），从数据库加载`)
        const accessibleProviders = await getUserAccessibleProvidersWithModels(user.user_id)

        // 🔥 精简数据：只返回前端需要的字段
        sanitizedData = accessibleProviders.map(provider => ({
          id: provider.id,
          name: provider.name,
          // 🔥 精简 models：只返回必要字段
          models: (provider.models || []).map(model => ({
            id: model.id,
            model_id: model.model_id,
            display_name: model.display_name,
            enabled: model.enabled,
            provider_id: model.provider_id,
          })),
        }))

        // 保存到缓存（30分钟）
        await setCached(userCacheKey, sanitizedData, CACHE_TTL.PROVIDER_LIST)
        console.warn(`💾 [ModelsCache] 已缓存用户模型列表: ${user.user_id.substring(0, 8)}...`)
      }

      res.send({
        status: 'Success',
        message: '获取模型列表成功（普通用户）',
        data: sanitizedData,
      })
    }
  }
  catch (error: any) {
    console.error('❌ [Models] 获取模型列表失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// ============================================
// 注意：旧的模型管理接口已移除
// ============================================
// 旧的 /models/add, /models/update, /models/delete, /models/test 已废弃
// 现在使用以下新接口（通过 /api/providers 和 /api/models 路由）:
// - POST /api/providers - 创建供应商
// - PUT /api/providers/:id - 更新供应商
// - DELETE /api/providers/:id - 删除供应商
// - POST /api/models - 创建模型
// - PUT /api/models/:id - 更新模型
// - DELETE /api/models/:id - 删除模型
// - PATCH /api/models/:id/toggle - 切换模型启用状态
// 详见 service/src/api/routes.ts

// Workflow config APIs
// 注意：这些配置在实际应用中应该保存到数据库或配置文件
// 这里简单起见，使用内存存储（重启后会丢失）

// 获取工作流配置
router.get('/workflow/config', async (req, res) => {
  try {
    res.send({
      status: 'Success',
      message: '获取配置成功',
      data: workflowConfig,
    })
  }
  catch (error: any) {
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// 更新工作流配置
router.post('/workflow/config', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const config = req.body as import('./quiz/types').WorkflowNodeConfig[]
    if (!Array.isArray(config)) {
      return res.status(400).send({
        status: 'Fail',
        message: '配置格式错误',
        data: null,
      })
    }

    workflowConfig = config
    res.send({
      status: 'Success',
      message: '配置更新成功',
      data: workflowConfig,
    })
  }
  catch (error: any) {
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

////////////////////////////////////////////////////////////////
router.post('/config', unifiedAuth, requireAuth, async (req, res) => {
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
  catch (error: any) {
    res.send({ status: 'Fail', message: error?.message || String(error), data: null })
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
  catch (error: any) {
    res.send({ status: 'Fail', message: error?.message || String(error), data: null })
  }
})

// ============================================
// 注意：旧的用户管理接口已移除
// ============================================
// 现在使用 Auth0 + Supabase 进行用户管理
// 详见 service/src/api/authController.ts 和 service/src/api/routes.ts
// - POST /api/webhooks/auth0 - Auth0 Webhook
// - GET /api/auth/me - 获取当前用户信息

// 旧的注册接口（已废弃，保留用于兼容）
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body as { email: string, password: string, name?: string }

    if (!email || !password) {
      return res.status(400).send({
        status: 'Fail',
        message: '邮箱和密码不能为空',
        data: null,
      })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).send({
        status: 'Fail',
        message: '邮箱格式不正确',
        data: null,
      })
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).send({
        status: 'Fail',
        message: '密码长度至少为6位',
        data: null,
      })
    }

    // 检查邮箱是否已存在
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return res.status(400).send({
        status: 'Fail',
        message: '该邮箱已被注册',
        data: null,
      })
    }

    // 创建新用户（密码会在 createUser 中自动加密）
    const newUser = await createUser(email, password, name)

    console.warn(`✅ [注册] 新用户注册成功: ${email}`)

    res.send({
      status: 'Success',
      message: '注册成功',
      data: {
        user: {
          id: newUser.user_id,
          email: newUser.email,
          username: newUser.username,
          createdAt: newUser.created_at,
        },
      },
    })
  }
  catch (error: any) {
    console.error('❌ [注册] 注册失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// 登录 API
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string, password: string }

    if (!email || !password) {
      return res.status(400).send({
        status: 'Fail',
        message: '邮箱和密码不能为空',
        data: null,
      })
    }

    // 验证用户密码
    const user = await validateUserPassword(email, password)
    if (!user) {
      return res.status(401).send({
        status: 'Fail',
        message: '邮箱或密码错误',
        data: null,
      })
    }

    // 注意：Auth0 已处理认证，这里不再生成 token
    // token 由 Auth0 提供，前端通过 Auth0 SDK 获取

    console.warn(`✅ [登录] 用户登录成功: ${email}`)

    res.send({
      status: 'Success',
      message: '登录成功',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at,
        },
      },
    })
  }
  catch (error: any) {
    console.error('❌ [登录] 登录失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// 获取用户信息 API
router.get('/user/:id', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = Number.parseInt(id, 10)

    if (Number.isNaN(userId)) {
      return res.status(400).send({
        status: 'Fail',
        message: '无效的用户ID',
        data: null,
      })
    }

    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    res.send({
      status: 'Success',
      message: '获取用户信息成功',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      },
    })
  }
  catch (error: any) {
    console.error('❌ [用户] 获取用户信息失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// 更新用户信息 API
router.put('/user/:id', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = Number.parseInt(id, 10)

    if (Number.isNaN(userId)) {
      return res.status(400).send({
        status: 'Fail',
        message: '无效的用户ID',
        data: null,
      })
    }

    const { username, email, password } = req.body as {
      username?: string
      email?: string
      password?: string
    }

    // 检查用户是否存在
    const existingUser = await findUserById(userId)
    if (!existingUser) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // 如果更新邮箱，检查邮箱是否已被其他用户使用
    if (email && email !== existingUser.email) {
      const emailUser = await findUserByEmail(email)
      if (emailUser && emailUser.user_id !== userId) {
        return res.status(400).send({
          status: 'Fail',
          message: '该邮箱已被其他用户使用',
          data: null,
        })
      }
    }

    // 如果更新用户名，检查用户名是否已被其他用户使用
    if (username && username !== existingUser.username) {
      const usernameUser = await findUserByUsername(username)
      if (usernameUser && usernameUser.user_id !== userId) {
        return res.status(400).send({
          status: 'Fail',
          message: '该用户名已被其他用户使用',
          data: null,
        })
      }
    }

    const updatedUser = await updateUser(userId, {
      username,
      email,
      password,
    })

    if (!updatedUser) {
      return res.status(500).send({
        status: 'Fail',
        message: '更新用户信息失败',
        data: null,
      })
    }

    console.warn(`✅ [用户] 用户信息更新成功: ${userId}`)

    res.send({
      status: 'Success',
      message: '用户信息更新成功',
      data: {
        user: {
          id: updatedUser.user_id,
          email: updatedUser.email,
          username: updatedUser.username,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
        },
      },
    })
  }
  catch (error: any) {
    console.error('❌ [用户] 更新用户信息失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// 删除用户 API
router.delete('/user/:id', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = Number.parseInt(id, 10)

    if (Number.isNaN(userId)) {
      return res.status(400).send({
        status: 'Fail',
        message: '无效的用户ID',
        data: null,
      })
    }

    // 检查用户是否存在
    const existingUser = await findUserById(userId)
    if (!existingUser) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    const deleted = await deleteUser(userId)
    if (!deleted) {
      return res.status(500).send({
        status: 'Fail',
        message: '删除用户失败',
        data: null,
      })
    }

    console.warn(`✅ [用户] 用户删除成功: ${id}`)

    res.send({
      status: 'Success',
      message: '用户删除成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [用户] 删除用户失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

// 获取用户列表 API
router.get('/users', unifiedAuth, requireAuth, async (req, res) => {
  try {
    const users = await getAllUsers()

    res.send({
      status: 'Success',
      message: '获取用户列表成功',
      data: {
        users: users.map(user => ({
          id: user.user_id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        })),
        total: users.length,
      },
    })
  }
  catch (error: any) {
    console.error('❌ [用户] 获取用户列表失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
})

app.use('', router)
app.use('/api', router)
// 集成 Auth0 + Supabase 路由
app.use('/api', auth0Routes)
app.set('trust proxy', 1)

// 支持 History 模式：将所有非 API 路由返回 index.html
// 确保在所有 API 路由之后添加
const distPath = join(process.cwd(), 'dist')
if (existsSync(distPath)) {
  console.warn('✅ [启动] 检测到 dist 目录，启用静态文件服务')
  app.use(express.static(distPath))

  // Catch-all 路由：所有非 API 路由都返回 index.html（支持 History 模式）
  app.get('*', (req, res) => {
    // 排除 API 路由
    if (req.path.startsWith('/api')) {
      return res.status(404).send({ status: 'Fail', message: 'API not found', data: null })
    }
    res.sendFile(join(distPath, 'index.html'))
  })
}
else {
  console.warn('⚠️  [启动] 未检测到 dist 目录，请先运行 pnpm build 构建前端')
}

// 初始化数据库
async function initDatabase() {
  try {
    // 测试旧的数据库连接（如果配置了）
    const hasOldDb = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    if (hasOldDb) {
      await testSupabaseConnection()
    }
    else {
      // 使用旧的数据库连接
      await testConnection()
      await initUserTable()
    }

    // 🔥 预加载模型、供应商和角色到 Redis 缓存
    try {
      const { preloadModelsToRedis } = await import('./cache/modelCache')
      const { preloadRolesToRedis } = await import('./cache/roleCache')

      // 并行预加载，提升启动速度
      await Promise.all([
        preloadModelsToRedis(),
        preloadRolesToRedis(),
      ])

      console.warn('✅ [Redis缓存] 全局数据预加载完成（供应商、模型、角色）')
    }
    catch (error) {
      console.error('⚠️ [启动] 预加载缓存失败，将使用数据库查询:', error)
    }

    console.warn('✅ [启动] 数据库初始化完成')
  }
  catch (error: any) {
    console.error('❌ [启动] 数据库初始化失败:', error.message)
    console.error('⚠️  [启动] 服务将继续运行，但数据库功能可能不可用')
  }
}

// 初始化数据库（懒加载，避免在 Vercel 冷启动时阻塞）
let isInitialized = false
async function initialize() {
  if (!isInitialized) {
    await initDatabase()
    isInitialized = true
  }
}

// Vercel Serverless Function handler
// 导出 Express 应用的 handler
export default async function handler(req: any, res: any) {
  await initialize()
  return app(req, res)
}

// 启动服务器（本地开发）
async function startServer() {
  // 初始化数据库
  await initDatabase()

  app.listen(3002, () => {
    globalThis.console.warn('Server is running on port 3002')
  })
}

// 仅在非 Vercel 环境启动服务器（本地开发）
if (!process.env.VERCEL) {
  startServer()
}
