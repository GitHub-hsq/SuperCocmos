import type { Chapter, Novel, Volume } from '@/types/novel'
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
    // ========== Mock 数据（原型阶段使用） ==========

    async fetchUserNovels() {
      this.isLoading = true
      try {
        // TODO: 替换为真实 API 调用
        await new Promise(resolve => setTimeout(resolve, 500))

        this.novels = [
          {
            id: '1',
            title: '失落的龙晶',
            genre: '玄幻',
            theme: '成长与牺牲',
            introduction: '法师艾拉踏上寻找失落龙晶的旅程...',
            status: 'writing',
            volumeCount: 2,
            chapterCount: 15,
            totalWordCount: 45000,
            createdAt: '2025-11-01',
            updatedAt: '2025-11-04',
          },
          {
            id: '2',
            title: '星际旅行者',
            genre: '科幻',
            theme: '探索未知',
            introduction: '2500年，人类开启星际探索时代...',
            status: 'planning',
            volumeCount: 1,
            chapterCount: 5,
            totalWordCount: 15000,
            createdAt: '2025-11-02',
            updatedAt: '2025-11-03',
          },
        ]
      }
      finally {
        this.isLoading = false
      }
    },

    async loadNovelDetail(novelId: string) {
      this.isLoading = true
      try {
        // TODO: 替换为真实 API 调用
        await new Promise(resolve => setTimeout(resolve, 300))

        // 设置当前小说
        this.currentNovel = this.novels.find(n => n.id === novelId) || null

        // Mock 卷数据
        this.volumes = [
          {
            id: `v1-${novelId}`,
            novelId,
            volumeNumber: 1,
            title: '卷一：起源',
            introduction: '艾拉在法师塔中发现了古老的秘密...',
            outline: '## 第1章\n...',
            status: 'completed',
            locked: false,
            chapterCount: 10,
            createdAt: '2025-11-01',
          },
          {
            id: `v2-${novelId}`,
            novelId,
            volumeNumber: 2,
            title: '卷二：征途',
            status: 'writing',
            locked: false,
            chapterCount: 5,
            createdAt: '2025-11-03',
          },
        ]

        // Mock 章节数据
        this.chapters = [
          {
            id: `c1`,
            volumeId: `v1-${novelId}`,
            chapterNumber: 1,
            title: '第1章：发现日记',
            content: '# 第1章：发现日记\n\n月光洒在古老的法师塔上...',
            wordCount: 3200,
            status: 'completed',
            createdAt: '2025-11-01',
          },
          {
            id: `c2`,
            volumeId: `v1-${novelId}`,
            chapterNumber: 2,
            title: '第2章：逃离',
            content: '# 第2章：逃离\n\n艾拉握紧日记，快速逃出法师塔...',
            wordCount: 3100,
            status: 'completed',
            createdAt: '2025-11-01',
          },
        ]

        // 切换到详情视图
        this.showNovelList = false
        this.selectedViewType = 'novel'
      }
      finally {
        this.isLoading = false
      }
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
  },
})
