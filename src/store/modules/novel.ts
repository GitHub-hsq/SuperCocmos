import * as novelApi from '@/api/novel'
import type { Chapter, ChatMessage, Novel, Volume, WorkflowExecution } from '@/types/novel'
import { defineStore } from 'pinia'

interface NovelState {
  novels: Novel[]
  currentNovel: Novel | null
  currentVolume: Volume | null
  volumes: Volume[]
  chapters: Chapter[]
  isLoading: boolean

  // 视图状态
  showNovelList: boolean // true: 显示列表, false: 显示详情
  showCreateForm: boolean // true: 显示创建表单
  selectedViewType: 'novel' | 'volume' | 'chapter' // 右侧显示的内容类型
  selectedVolumeId: string | null
  selectedChapterId: string | null

  // 工作流1状态
  workflow1Execution: WorkflowExecution | null
  workflow1Progress: number // 0-100
}

export const useNovelStore = defineStore('novel', {
  state: (): NovelState => ({
    novels: [],
    currentNovel: null,
    currentVolume: null,
    volumes: [],
    chapters: [],
    isLoading: false,

    showNovelList: true,
    showCreateForm: false,
    selectedViewType: 'novel',
    selectedVolumeId: null,
    selectedChapterId: null,

    workflow1Execution: null,
    workflow1Progress: 0,
  }),

  getters: {
    // 当前小说的所有卷
    currentNovelVolumes: (state) => {
      if (!state.currentNovel)
        return []
      return state.volumes.filter(v => v.novelId === state.currentNovel!.id)
    },

    // 当前卷的所有章节
    currentVolumeChapters: (state) => {
      if (!state.selectedVolumeId)
        return []
      return state.chapters.filter(c => c.volumeId === state.selectedVolumeId)
    },
  },

  actions: {
    // ========== 小说管理 ==========

    async fetchUserNovels() {
      this.isLoading = true
      try {
        const response = await novelApi.getUserNovels()
        if (response.success && response.data)
          this.novels = response.data
      }
      finally {
        this.isLoading = false
      }
    },

    async createNovel(data: {
      title: string
      genre?: string
      theme?: string
      idea?: string
    }) {
      const response = await novelApi.createNovel(data)
      if (response.success && response.data) {
        this.novels.push(response.data.novel)
        return response.data
      }
      throw new Error(response.message || '创建失败')
    },

    async updateNovel(novelId: string, updates: Partial<Novel>) {
      const response = await novelApi.updateNovel(novelId, updates)
      if (response.success && response.data) {
        const index = this.novels.findIndex(n => n.id === novelId)
        if (index !== -1)
          this.novels[index] = response.data

        if (this.currentNovel?.id === novelId)
          this.currentNovel = response.data

        return response.data
      }
      throw new Error(response.message || '更新失败')
    },

    async deleteNovel(novelId: string) {
      const response = await novelApi.deleteNovel(novelId)
      if (response.success) {
        this.novels = this.novels.filter(n => n.id !== novelId)
        if (this.currentNovel?.id === novelId)
          this.currentNovel = null
      }
      else {
        throw new Error(response.message || '删除失败')
      }
    },

    async loadNovelDetail(novelId: string) {
      this.isLoading = true
      try {
        const response = await novelApi.getNovel(novelId)
        if (response.success && response.data) {
          this.currentNovel = response.data
          this.volumes = response.data.volumes || []

          // 切换到详情视图
          this.showNovelList = false
          this.selectedViewType = 'novel'
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async loadVolume(volumeId: string) {
      const response = await novelApi.getVolume(volumeId)
      if (response.success && response.data) {
        this.currentVolume = response.data
        return response.data
      }
      throw new Error(response.message || '加载失败')
    },

    async updateVolume(volumeId: string, updates: Partial<Volume>) {
      const response = await novelApi.updateVolume(volumeId, updates)
      if (response.success && response.data) {
        if (this.currentVolume?.id === volumeId)
          this.currentVolume = response.data

        // 更新volumes列表中的数据
        const index = this.volumes.findIndex(v => v.id === volumeId)
        if (index !== -1)
          this.volumes[index] = response.data

        return response.data
      }
      throw new Error(response.message || '更新失败')
    },

    // 选择小说（从列表点击）
    selectNovel(novel: Novel) {
      this.loadNovelDetail(novel.id)
    },

    // 返回列表
    backToList() {
      this.showNovelList = true
      this.showCreateForm = false
      this.currentNovel = null
      this.volumes = []
      this.chapters = []
      this.selectedVolumeId = null
      this.selectedChapterId = null
    },

    // 显示创建表单
    showCreateNovelForm() {
      this.showCreateForm = true
      this.showNovelList = false
    },

    // 隐藏创建表单，返回列表
    hideCreateNovelForm() {
      this.showCreateForm = false
      this.showNovelList = true
    },

    // 选择卷（从树点击）
    selectVolume(volumeId: string) {
      this.selectedVolumeId = volumeId
      this.selectedChapterId = null
      this.selectedViewType = 'volume'
      this.currentVolume = this.volumes.find(v => v.id === volumeId) || null
    },

    // 选择章节（从树点击）
    selectChapter(chapterId: string) {
      const chapter = this.chapters.find(c => c.id === chapterId)
      if (chapter) {
        this.selectedVolumeId = chapter.volumeId
        this.selectedChapterId = chapterId
        this.selectedViewType = 'chapter'
      }
    },

    // 选择小说根节点（从树点击）
    selectNovelRoot() {
      this.selectedVolumeId = null
      this.selectedChapterId = null
      this.selectedViewType = 'novel'
    },

    // ========== 工作流1：剧情大纲生成 ==========

    async startWorkflow1(volumeId: string, input?: {
      idea?: string
      chat_history?: ChatMessage[]
    }) {
      const response = await novelApi.startWorkflow1(volumeId, input)
      if (response.success && response.data) {
        this.workflow1Progress = 10 // 启动成功，设置初始进度
        // 开始轮询状态
        this.pollWorkflow1Status(response.data.execution_id)
        return response.data
      }
      throw new Error(response.message || '启动失败')
    },

    async pollWorkflow1Status(executionId: string) {
      this.workflow1Execution = null

      const pollInterval = setInterval(async () => {
        try {
          const response = await novelApi.getWorkflowStatus(executionId)
          if (response.success && response.data) {
            this.workflow1Execution = response.data

            // 根据状态更新进度
            if (response.data.status === 'running') {
              // 模拟进度增长
              if (this.workflow1Progress < 90)
                this.workflow1Progress += 10
            }
            else if (response.data.status === 'completed') {
              this.workflow1Progress = 100
              clearInterval(pollInterval)
              // 重新加载volume数据
              if (this.currentVolume)
                await this.loadVolume(this.currentVolume.id)
            }
            else if (response.data.status === 'failed' || response.data.status === 'stopped') {
              clearInterval(pollInterval)
            }
          }
        }
        catch (error) {
          console.error('轮询工作流状态失败:', error)
          clearInterval(pollInterval)
        }
      }, 3000) // 每3秒轮询一次
    },

    resetWorkflow1Progress() {
      this.workflow1Progress = 0
      this.workflow1Execution = null
    },

    // ========== 聊天交互 ==========

    async chatWithAI(
      volumeId: string,
      aiRole: string,
      message: string,
      workflowType: number,
    ) {
      const response = await novelApi.chatWithAI(volumeId, aiRole, {
        message,
        workflow_type: workflowType,
      })
      if (response.success && response.data)
        return response.data.reply

      throw new Error(response.message || '聊天失败')
    },

    async getChatHistory(
      volumeId: string,
      aiRole: string,
      workflowType: number,
    ) {
      const response = await novelApi.getChatHistory(volumeId, aiRole, workflowType)
      if (response.success && response.data)
        return response.data

      throw new Error(response.message || '获取历史失败')
    },
  },
})
