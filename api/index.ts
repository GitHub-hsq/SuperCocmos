/**
 * Vercel Serverless Function 入口
 * 包装 Express 应用以支持 Vercel Serverless Functions
 */

// 设置环境变量标识为 Vercel 环境
process.env.VERCEL = '1'

// 导入 Express 应用（Vercel 会自动编译 TypeScript）
export { default } from '../service/src/index'
