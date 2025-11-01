/**
 * Vercel Serverless Function 入口
 * 包装 Express 应用以支持 Vercel Serverless Functions
 */

// 设置环境变量标识为 Vercel 环境
process.env.VERCEL = '1'

// 导入并重新导出 Express 应用的 handler
import handler from '../service/src/index'

export default handler

