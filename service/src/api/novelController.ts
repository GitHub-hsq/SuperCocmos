/**
 * 小说API控制器
 */

import type { Request, Response } from 'express'
import { novelService } from '../db/novelService'
import { runWorkflow1 } from '../novel/workflows'

// ==================== 小说管理 ====================

export async function createNovel(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const { title, genre, theme, idea } = req.body

    const novel = await novelService.createNovel(userId, {
      title,
      genre,
      theme,
      idea,
    })

    // 自动创建第一卷
    const volume = await novelService.createVolume(novel.id, 1)

    res.json({
      success: true,
      data: {
        novel,
        first_volume: volume,
      },
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function getUserNovels(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const novels = await novelService.getUserNovels(userId)

    res.json({
      success: true,
      data: novels,
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function getNovel(req: Request, res: Response) {
  try {
    const { id } = req.params
    const novel = await novelService.getNovel(id)
    const volumes = await novelService.getNovelVolumes(id)

    res.json({
      success: true,
      data: {
        ...novel,
        volumes,
      },
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function updateNovel(req: Request, res: Response) {
  try {
    const { id } = req.params
    const updates = req.body

    const novel = await novelService.updateNovel(id, updates)

    res.json({
      success: true,
      data: novel,
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function deleteNovel(req: Request, res: Response) {
  try {
    const { id } = req.params
    await novelService.deleteNovel(id)

    res.json({
      success: true,
      message: '小说已删除',
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ==================== 卷管理 ====================

export async function getVolume(req: Request, res: Response) {
  try {
    const { volumeId } = req.params
    const volume = await novelService.getVolume(volumeId)

    res.json({
      success: true,
      data: volume,
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function updateVolume(req: Request, res: Response) {
  try {
    const { volumeId } = req.params
    const updates = req.body

    const volume = await novelService.updateVolume(volumeId, updates)

    res.json({
      success: true,
      data: volume,
    })
  }
  catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

// ==================== 工作流执行 ====================

export async function startWorkflow1(req: Request, res: Response) {
  try {
    const { volumeId } = req.params
    const userId = req.user!.id
    const { idea, chat_history } = req.body

    // 创建执行记录
    const execution = await novelService.createWorkflowExecution({
      volume_id: volumeId,
      workflow_type: 1,
      input: { idea, chat_history },
    })

    // 异步执行工作流
    runWorkflow1(volumeId, userId, execution.id, { idea, chat_history })
      .catch((error) => {
        console.error('工作流1执行失败:', error)
        novelService.updateWorkflowExecution(execution.id, {
          status: 'failed',
          error: error.message,
        })
      })

    res.json({
      success: true,
      data: {
        execution_id: execution.id,
        status: 'running',
      },
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function getWorkflowStatus(req: Request, res: Response) {
  try {
    const { executionId } = req.params
    const execution = await novelService.getWorkflowExecution(executionId)

    res.json({
      success: true,
      data: execution,
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ==================== 聊天交互 ====================

export async function chatWithAI(req: Request, res: Response) {
  try {
    const { volumeId, aiRole } = req.params
    const { message, workflow_type } = req.body

    // 获取聊天历史
    const history = await novelService.getChatHistory(volumeId, workflow_type, aiRole)

    // TODO: 实现AI聊天（可以先返回模拟数据）
    const reply = '这是AI的回复（待实现）'

    // 保存消息
    const timestamp = new Date().toISOString()
    await novelService.saveChatMessage(volumeId, workflow_type, aiRole, {
      role: 'user',
      content: message,
      timestamp,
    })
    await novelService.saveChatMessage(volumeId, workflow_type, aiRole, {
      role: 'ai',
      content: reply,
      timestamp,
    })

    res.json({
      success: true,
      data: {
        reply,
      },
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function getChatHistory(req: Request, res: Response) {
  try {
    const { volumeId, aiRole } = req.params
    const { workflow_type } = req.query

    const history = await novelService.getChatHistory(
      volumeId,
      Number.parseInt(workflow_type as string),
      aiRole,
    )

    res.json({
      success: true,
      data: history,
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ==================== 章节管理 ====================

export async function getChapters(req: Request, res: Response) {
  try {
    const { volumeId } = req.params
    const chapters = await novelService.getVolumeChapters(volumeId)

    res.json({
      success: true,
      data: chapters,
    })
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
