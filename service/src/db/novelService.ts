/**
 * 小说数据库服务
 * 提供小说、卷、章节等的CRUD操作
 */

import type {
  Chapter,
  ChatMessage,
  Novel,
  Volume,
  WorkflowExecution,
} from '../novel/types'
import { supabase } from './supabaseClient'

export class NovelService {
  // ==================== 小说 CRUD ====================

  async createNovel(userId: string, data: {
    title: string
    genre?: string
    theme?: string
    idea?: string
  }): Promise<Novel> {
    const { data: novel, error } = await supabase
      .from('novels')
      .insert({ user_id: userId, ...data })
      .select()
      .single()

    if (error)
      throw error
    return novel
  }

  async getUserNovels(userId: string): Promise<Novel[]> {
    const { data, error } = await supabase
      .from('novels')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error)
      throw error
    return data || []
  }

  async getNovel(novelId: string): Promise<Novel> {
    const { data, error } = await supabase
      .from('novels')
      .select('*')
      .eq('id', novelId)
      .single()

    if (error)
      throw error
    return data
  }

  async updateNovel(novelId: string, updates: Partial<Novel>): Promise<Novel> {
    const { data, error } = await supabase
      .from('novels')
      .update(updates)
      .eq('id', novelId)
      .select()
      .single()

    if (error)
      throw error
    return data
  }

  async deleteNovel(novelId: string): Promise<void> {
    const { error } = await supabase
      .from('novels')
      .delete()
      .eq('id', novelId)

    if (error)
      throw error
  }

  // ==================== 卷 CRUD ====================

  async createVolume(novelId: string, volumeNumber: number): Promise<Volume> {
    const { data, error } = await supabase
      .from('novel_volumes')
      .insert({
        novel_id: novelId,
        volume_number: volumeNumber,
        status: 'outlining',
      })
      .select()
      .single()

    if (error)
      throw error
    return data
  }

  async getVolume(volumeId: string): Promise<Volume> {
    const { data, error } = await supabase
      .from('novel_volumes')
      .select('*')
      .eq('id', volumeId)
      .single()

    if (error)
      throw error
    return data
  }

  async updateVolume(volumeId: string, updates: Partial<Volume>): Promise<Volume> {
    // 检查是否已封存
    const volume = await this.getVolume(volumeId)
    if (volume.locked)
      throw new Error('该卷已封存，无法修改')

    const { data, error } = await supabase
      .from('novel_volumes')
      .update(updates)
      .eq('id', volumeId)
      .select()
      .single()

    if (error)
      throw error
    return data
  }

  async archiveVolume(volumeId: string): Promise<Volume> {
    return this.updateVolume(volumeId, {
      locked: true,
      status: 'archived',
    })
  }

  async getNovelVolumes(novelId: string): Promise<Volume[]> {
    const { data, error } = await supabase
      .from('novel_volumes')
      .select('*')
      .eq('novel_id', novelId)
      .order('volume_number', { ascending: true })

    if (error)
      throw error
    return data || []
  }

  // ==================== 章节 CRUD ====================

  async createChapter(volumeId: string, chapterData: {
    chapter_number: number
    title?: string
    content?: string
    burst_point?: string
  }): Promise<Chapter> {
    const { data, error } = await supabase
      .from('novel_chapters')
      .insert({
        volume_id: volumeId,
        ...chapterData,
      })
      .select()
      .single()

    if (error)
      throw error
    return data
  }

  async getChapter(chapterId: string): Promise<Chapter> {
    const { data, error } = await supabase
      .from('novel_chapters')
      .select('*')
      .eq('id', chapterId)
      .single()

    if (error)
      throw error
    return data
  }

  async getVolumeChapters(volumeId: string): Promise<Chapter[]> {
    const { data, error } = await supabase
      .from('novel_chapters')
      .select('*')
      .eq('volume_id', volumeId)
      .order('chapter_number', { ascending: true })

    if (error)
      throw error
    return data || []
  }

  async updateChapter(chapterId: string, updates: Partial<Chapter>): Promise<Chapter> {
    const { data, error } = await supabase
      .from('novel_chapters')
      .update(updates)
      .eq('id', chapterId)
      .select()
      .single()

    if (error)
      throw error
    return data
  }

  async deleteChapter(chapterId: string): Promise<void> {
    const { error } = await supabase
      .from('novel_chapters')
      .delete()
      .eq('id', chapterId)

    if (error)
      throw error
  }

  // ==================== 工作流执行记录 ====================

  async createWorkflowExecution(data: {
    volume_id: string
    workflow_type: number
    input?: any
  }): Promise<WorkflowExecution> {
    const { data: execution, error } = await supabase
      .from('novel_workflow_executions')
      .insert({
        volume_id: data.volume_id,
        workflow_type: data.workflow_type,
        input: data.input,
        status: 'running',
      })
      .select()
      .single()

    if (error)
      throw error
    return execution
  }

  async updateWorkflowExecution(executionId: string, updates: {
    status?: string
    output?: any
    error?: string
  }): Promise<void> {
    const updateData: any = { ...updates }

    if (updates.status === 'completed' || updates.status === 'failed')
      updateData.completed_at = new Date().toISOString()

    const { error } = await supabase
      .from('novel_workflow_executions')
      .update(updateData)
      .eq('id', executionId)

    if (error)
      throw error
  }

  async getWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
    const { data, error } = await supabase
      .from('novel_workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (error)
      throw error
    return data
  }

  // ==================== 聊天历史 ====================

  async getChatSession(volumeId: string, workflowType: number, aiRole: string) {
    const { data, error } = await supabase
      .from('novel_chat_sessions')
      .select('*')
      .eq('volume_id', volumeId)
      .eq('workflow_type', workflowType)
      .eq('ai_role', aiRole)
      .single()

    if (error && error.code !== 'PGRST116')
      throw error
    return data
  }

  async saveChatMessage(
    volumeId: string,
    workflowType: number,
    aiRole: string,
    message: ChatMessage,
  ) {
    const session = await this.getChatSession(volumeId, workflowType, aiRole)

    if (session) {
      const messages = [...session.messages, message]
      const { error } = await supabase
        .from('novel_chat_sessions')
        .update({ messages })
        .eq('id', session.id)

      if (error)
        throw error
    }
    else {
      const { error } = await supabase
        .from('novel_chat_sessions')
        .insert({
          volume_id: volumeId,
          workflow_type: workflowType,
          ai_role: aiRole,
          messages: [message],
        })

      if (error)
        throw error
    }
  }

  async getChatHistory(volumeId: string, workflowType: number, aiRole: string): Promise<ChatMessage[]> {
    const session = await this.getChatSession(volumeId, workflowType, aiRole)
    return session?.messages || []
  }
}

export const novelService = new NovelService()
