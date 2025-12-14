/**
 * TTS API 调用（使用 Gemini 原生格式）
 * 用于将文本转换为语音
 */

import axios from 'axios'

// TTS 配置 - 使用 Gemini 原生格式
// const TTS_BASE_URL = 'https://api.juheai.top'
const TTS_BASE_URL = 'https://ai.hybgzs.com/gemini'
const TTS_API_KEY = 'sk-hwf1B1yvCa20ckd_wEjqIGWXG-rNM39lqyTD7iI3uzKbA26HtRM18SdEkTQ'
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'

/** Say softly---男生悄悄语 */
export interface GeminiTTSOptions {
  text: string
  voiceName?: string // 可选的语音名称（Gemini 支持: Puck, Charon, Kore, Fenrir, Aoede 等）
}

export interface GeminiTTSResponse {
  audioData: string // Base64 编码的音频数据
  contentType: string // 音频格式，如 audio/mpeg
}

/**
 * 调用 Gemini 原生 TTS API 将文本转换为语音
 * @param options TTS 选项
 * @returns 音频数据的 Base64 字符串
 */
export async function callGeminiTTS(options: GeminiTTSOptions): Promise<GeminiTTSResponse> {
  const { text, voiceName = 'Charon' } = options

  try {
    console.warn('🎤 [Gemini TTS] 开始请求:', { text, voiceName })

    // 🔥 使用 Gemini 原生 API 格式
    const apiUrl = `${TTS_BASE_URL}/v1beta/models/${TTS_MODEL}:generateContent`
    console.warn('🔗 [Gemini TTS] 请求 URL:', apiUrl)

    // 🔥 Gemini TTS 请求体格式（与成功案例完全一致）
    const requestBody = {
      contents: [{
        parts: [{ text }],
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    }

    console.warn('📤 [Gemini TTS] 请求体:', JSON.stringify(requestBody, null, 2))

    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TTS_API_KEY}`, // 🔥 使用标准 Bearer Token
        },
      },
    )

    console.warn('✅ [Gemini TTS] 请求成功')
    console.warn('📦 [Gemini TTS] 响应数据结构:', JSON.stringify(response.data, null, 2))

    // 🔥 检查 finishReason
    const finishReason = response.data?.candidates?.[0]?.finishReason
    console.warn('📊 [Gemini TTS] finishReason:', finishReason)

    // 🔥 Gemini API 返回的音频数据在 response.data.candidates[0].content.parts[0].inlineData
    const audioData = response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    const mimeType = response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/mpeg'

    if (!audioData) {
      console.error('❌ [Gemini TTS] API 返回的完整数据:', response.data)
      throw new Error(`API 未返回音频数据。finishReason: ${finishReason}`)
    }

    console.warn('📦 [Gemini TTS] 原始音频格式:', mimeType)

    // 🔥 如果是 PCM 格式，需要转换为 WAV
    let finalAudioData = audioData
    let finalContentType = mimeType

    if (mimeType.includes('audio/L16') || mimeType.includes('pcm')) {
      console.warn('🔄 [Gemini TTS] 检测到 PCM 格式，正在转换为 WAV...')

      // 从 mimeType 中提取采样率（如 audio/L16;codec=pcm;rate=24000）
      const rateMatch = mimeType.match(/rate=(\d+)/)
      const sampleRate = rateMatch ? Number.parseInt(rateMatch[1], 10) : 24000

      finalAudioData = pcmToWav(audioData, sampleRate)
      finalContentType = 'audio/wav'

      console.warn('✅ [Gemini TTS] PCM 转换完成，采样率:', sampleRate)
    }

    console.warn('📦 [Gemini TTS] 最终音频格式:', finalContentType)

    return {
      audioData: finalAudioData,
      contentType: finalContentType,
    }
  }
  catch (error: any) {
    console.error('❌ [Gemini TTS] 请求失败:', error)
    console.error('❌ [Gemini TTS] 错误详情:', error.response?.data || error.message)
    throw new Error(`TTS 转换失败: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * 将 PCM 数据转换为 WAV 格式
 * @param pcmBase64 Base64 编码的 PCM 数据
 * @param sampleRate 采样率（默认 24000）
 * @param numChannels 声道数（默认 1 单声道）
 * @param bitsPerSample 位深度（默认 16）
 * @returns Base64 编码的 WAV 数据
 */
function pcmToWav(
  pcmBase64: string,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16,
): string {
  // 解码 Base64
  const pcmBinary = atob(pcmBase64)
  const pcmBytes = new Uint8Array(pcmBinary.length)
  for (let i = 0; i < pcmBinary.length; i++) {
    pcmBytes[i] = pcmBinary.charCodeAt(i)
  }

  const dataSize = pcmBytes.length
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)

  // 创建 WAV 文件头
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  // RIFF 标识
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + dataSize, true) // 文件大小 - 8
  view.setUint32(8, 0x57415645, false) // "WAVE"

  // fmt 子块
  view.setUint32(12, 0x666D7420, false) // "fmt "
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // 音频格式 (1 = PCM)
  view.setUint16(22, numChannels, true) // 声道数
  view.setUint32(24, sampleRate, true) // 采样率
  view.setUint32(28, byteRate, true) // 字节率
  view.setUint16(32, blockAlign, true) // 块对齐
  view.setUint16(34, bitsPerSample, true) // 位深度

  // data 子块
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, dataSize, true) // 数据大小

  // 合并 header 和 PCM 数据
  const wavBytes = new Uint8Array(44 + dataSize)
  wavBytes.set(new Uint8Array(header), 0)
  wavBytes.set(pcmBytes, 44)

  // 转换回 Base64
  let binary = ''
  for (let i = 0; i < wavBytes.length; i++) {
    binary += String.fromCharCode(wavBytes[i])
  }
  return btoa(binary)
}

/**
 * 播放 Base64 编码的音频（返回音频 URL 供持久化使用）
 * @param audioData Base64 编码的音频数据
 * @param contentType 音频 MIME 类型
 * @returns 音频 Blob URL
 */
export function createAudioUrl(audioData: string, contentType: string): string {
  try {
    // 将 Base64 转换为 Blob
    const binaryString = atob(audioData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: contentType })

    // 创建 URL（不自动释放，由调用者管理）
    const audioUrl = URL.createObjectURL(blob)
    console.warn('🔗 [Gemini TTS] 创建音频 URL:', audioUrl)

    return audioUrl
  }
  catch (error) {
    console.error('❌ [Gemini TTS] 音频 URL 创建失败:', error)
    throw error
  }
}

/**
 * 播放 Base64 编码的音频（一次性播放）
 * @param audioData Base64 编码的音频数据
 * @param contentType 音频 MIME 类型
 */
export function playAudio(audioData: string, contentType: string): void {
  try {
    // 将 Base64 转换为 Blob
    const binaryString = atob(audioData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: contentType })

    // 创建 URL 并播放
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      console.warn('✅ [Gemini TTS] 音频播放完成')
    }

    audio.onerror = (error) => {
      console.error('❌ [Gemini TTS] 音频播放失败:', error)
      URL.revokeObjectURL(audioUrl)
    }

    audio.play().catch((error) => {
      console.error('❌ [Gemini TTS] 播放启动失败:', error)
      URL.revokeObjectURL(audioUrl)
    })

    console.warn('🔊 [Gemini TTS] 开始播放音频')
  }
  catch (error) {
    console.error('❌ [Gemini TTS] 音频处理失败:', error)
    throw error
  }
}
