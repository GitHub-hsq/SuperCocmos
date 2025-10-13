import { rateLimit } from 'express-rate-limit'
import { isNotEmptyString } from '../utils/is'

const MAX_REQUEST_PER_HOUR = process.env.MAX_REQUEST_PER_HOUR

const maxCount = (isNotEmptyString(MAX_REQUEST_PER_HOUR) && !Number.isNaN(Number(MAX_REQUEST_PER_HOUR)))
  ? Number.parseInt(MAX_REQUEST_PER_HOUR)
  : 1000 // 默认 1000 次/小时，设置为 0 会在 v7 版本阻止所有请求

// 如果 maxCount 为 0 或负数，则禁用限流
const limiter = maxCount > 0
  ? rateLimit({
      windowMs: 60 * 60 * 1000, // Maximum number of accesses within an hour
      max: maxCount,
      statusCode: 200, // 200 means success，but the message is 'Too many request from this IP in 1 hour'
      message: async (req, res) => {
        res.send({ status: 'Fail', message: 'Too many request from this IP in 1 hour', data: null })
      },
    })
  : (req: any, res: any, next: any) => next() // 不限流

export { limiter }
