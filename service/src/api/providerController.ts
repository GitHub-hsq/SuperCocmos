import type { Request, Response } from 'express'
import { PROVIDER_KEYS } from '../cache/cacheKeys'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import {
  createModel,
  createProvider,
  deleteModel,
  deleteProvider,
  getAllProvidersWithModels,
  getModelById,
  getProviderById,
  toggleModelEnabled,
  updateModel,
  updateProvider,
} from '../db/providerService'

// ============================================
// Provider Controllers
// ============================================

/**
 * 获取所有供应商及其模型（带缓存）
 */
export async function getProviders(req: Request, res: Response) {
  try {
    const cacheKey = PROVIDER_KEYS.list()

    // 尝试从缓存获取
    let providers = await getCached(cacheKey)

    if (!providers) {
      // 缓存未命中，从数据库查询
      providers = await getAllProvidersWithModels()

      // 保存到缓存
      await setCached(cacheKey, providers, CACHE_TTL.PROVIDER_LIST)
    }

    res.json({
      status: 'Success',
      message: '获取供应商列表成功',
      data: providers,
    })
  }
  catch (error: any) {
    console.error('获取供应商列表失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '获取供应商列表失败',
      data: null,
    })
  }
}

/**
 * 创建供应商
 */
export async function addProvider(req: Request, res: Response) {
  try {
    const { name, baseUrl, apiKey } = req.body

    // 参数验证
    if (!name || !baseUrl || !apiKey) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少必要参数：name, baseUrl, apiKey',
        data: null,
      })
    }

    // 创建供应商
    const provider = await createProvider({
      name,
      base_url: baseUrl,
      api_key: apiKey,
    })

    // 清除供应商列表缓存
    await deleteCached(PROVIDER_KEYS.list())

    res.json({
      status: 'Success',
      message: '供应商创建成功',
      data: provider,
    })
  }
  catch (error: any) {
    console.error('创建供应商失败:', error)

    // 处理唯一性约束错误
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'Fail',
        message: '供应商名称已存在',
        data: null,
      })
    }

    res.status(500).json({
      status: 'Fail',
      message: error.message || '创建供应商失败',
      data: null,
    })
  }
}

/**
 * 更新供应商
 */
export async function editProvider(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, baseUrl, apiKey } = req.body

    if (!id) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少供应商ID',
        data: null,
      })
    }

    // 检查供应商是否存在
    const existingProvider = await getProviderById(id)
    if (!existingProvider) {
      return res.status(404).json({
        status: 'Fail',
        message: '供应商不存在',
        data: null,
      })
    }

    // 更新供应商
    const updates: any = {}
    if (name !== undefined)
      updates.name = name
    if (baseUrl !== undefined)
      updates.base_url = baseUrl
    if (apiKey !== undefined)
      updates.api_key = apiKey

    const provider = await updateProvider(id, updates)

    // 清除供应商缓存
    await deleteCached(PROVIDER_KEYS.list())
    await deleteCached(PROVIDER_KEYS.detail(id))

    res.json({
      status: 'Success',
      message: '供应商更新成功',
      data: provider,
    })
  }
  catch (error: any) {
    console.error('更新供应商失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '更新供应商失败',
      data: null,
    })
  }
}

/**
 * 删除供应商
 */
export async function removeProvider(req: Request, res: Response) {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少供应商ID',
        data: null,
      })
    }

    // 检查供应商是否存在
    const existingProvider = await getProviderById(id)
    if (!existingProvider) {
      return res.status(404).json({
        status: 'Fail',
        message: '供应商不存在',
        data: null,
      })
    }

    // 删除供应商（软删除，会级联删除模型）
    await deleteProvider(id)

    // 清除供应商缓存
    await deleteCached(PROVIDER_KEYS.list())
    await deleteCached(PROVIDER_KEYS.detail(id))

    res.json({
      status: 'Success',
      message: '供应商删除成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('删除供应商失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '删除供应商失败',
      data: null,
    })
  }
}

// ============================================
// Model Controllers
// ============================================

/**
 * 创建模型
 */
export async function addModel(req: Request, res: Response) {
  try {
    const { modelId, displayName, enabled, providerId } = req.body

    // 参数验证
    if (!modelId || !displayName || !providerId) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少必要参数：modelId, displayName, providerId',
        data: null,
      })
    }

    // 检查供应商是否存在
    const provider = await getProviderById(providerId)
    if (!provider) {
      return res.status(404).json({
        status: 'Fail',
        message: '供应商不存在',
        data: null,
      })
    }

    // 创建模型
    const model = await createModel({
      model_id: modelId,
      display_name: displayName,
      enabled: enabled ?? true,
      provider_id: providerId,
    })

    // 清除供应商和模型缓存
    await deleteCached(PROVIDER_KEYS.list())
    await deleteCached(PROVIDER_KEYS.models(providerId))

    res.json({
      status: 'Success',
      message: '模型创建成功',
      data: model,
    })
  }
  catch (error: any) {
    console.error('创建模型失败:', error)

    // 处理唯一性约束错误
    if (error.code === '23505') {
      if (error.message.includes('display_name')) {
        return res.status(400).json({
          status: 'Fail',
          message: '模型显示名称已存在，请使用其他名称',
          data: null,
        })
      }
      return res.status(400).json({
        status: 'Fail',
        message: '该供应商下已存在相同的模型ID',
        data: null,
      })
    }

    res.status(500).json({
      status: 'Fail',
      message: error.message || '创建模型失败',
      data: null,
    })
  }
}

/**
 * 更新模型
 */
export async function editModel(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { modelId, displayName, enabled } = req.body

    if (!id) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少模型ID',
        data: null,
      })
    }

    // 检查模型是否存在
    const existingModel = await getModelById(id)
    if (!existingModel) {
      return res.status(404).json({
        status: 'Fail',
        message: '模型不存在',
        data: null,
      })
    }

    // 更新模型
    const updates: any = {}
    if (modelId !== undefined)
      updates.model_id = modelId
    if (displayName !== undefined)
      updates.display_name = displayName
    if (enabled !== undefined)
      updates.enabled = enabled

    const model = await updateModel(id, updates)

    // 清除模型缓存
    await deleteCached(PROVIDER_KEYS.list())
    await deleteCached(PROVIDER_KEYS.model(id))

    res.json({
      status: 'Success',
      message: '模型更新成功',
      data: model,
    })
  }
  catch (error: any) {
    console.error('更新模型失败:', error)

    // 处理唯一性约束错误
    if (error.code === '23505') {
      if (error.message.includes('display_name')) {
        return res.status(400).json({
          status: 'Fail',
          message: '模型显示名称已存在，请使用其他名称',
          data: null,
        })
      }
      return res.status(400).json({
        status: 'Fail',
        message: '该供应商下已存在相同的模型ID',
        data: null,
      })
    }

    res.status(500).json({
      status: 'Fail',
      message: error.message || '更新模型失败',
      data: null,
    })
  }
}

/**
 * 删除模型
 */
export async function removeModel(req: Request, res: Response) {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少模型ID',
        data: null,
      })
    }

    // 检查模型是否存在
    const existingModel = await getModelById(id)
    if (!existingModel) {
      return res.status(404).json({
        status: 'Fail',
        message: '模型不存在',
        data: null,
      })
    }

    // 删除模型（软删除）
    await deleteModel(id)

    // 清除模型缓存
    await deleteCached(PROVIDER_KEYS.list())
    await deleteCached(PROVIDER_KEYS.model(id))

    res.json({
      status: 'Success',
      message: '模型删除成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('删除模型失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '删除模型失败',
      data: null,
    })
  }
}

/**
 * 切换模型启用状态
 */
export async function toggleModel(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { enabled } = req.body

    if (!id) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少模型ID',
        data: null,
      })
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少或无效的 enabled 参数',
        data: null,
      })
    }

    // 切换模型状态
    const model = await toggleModelEnabled(id, enabled)

    // 清除模型缓存
    await deleteCached(PROVIDER_KEYS.list())
    await deleteCached(PROVIDER_KEYS.model(id))

    res.json({
      status: 'Success',
      message: `模型已${enabled ? '启用' : '禁用'}`,
      data: model,
    })
  }
  catch (error: any) {
    console.error('切换模型状态失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '切换模型状态失败',
      data: null,
    })
  }
}
