#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    hook_event_name: string;
}

interface EditedFile {
    path: string;
    timestamp: string;
    repo?: string;
}

function getFileCategory(filePath: string): 'backend' | 'frontend' | 'database' | 'other' {
    // Frontend detection (Vue project)
    if (filePath.includes('/src/components/') ||
        filePath.includes('/src/views/') ||
        filePath.includes('/src/composables/') ||
        filePath.includes('/src/store/')) return 'frontend';

    // Backend detection (Express service)
    if (filePath.includes('/service/src/api/') ||
        filePath.includes('/service/src/services/') ||
        filePath.includes('/service/src/utils/') ||
        filePath.includes('/service/src/middleware/')) return 'backend';

    // Database detection
    if (filePath.includes('/database/') ||
        filePath.includes('/prisma/') ||
        filePath.includes('/migrations/') ||
        filePath.includes('schema')) return 'database';

    return 'other';
}

function shouldCheckErrorHandling(filePath: string): boolean {
    // Skip test files, config files, and type definitions
    if (filePath.match(/\.(test|spec)\.(ts|tsx|js|vue)$/)) return false;
    if (filePath.match(/\.(config|d)\.(ts|tsx)$/)) return false;
    if (filePath.includes('types/')) return false;
    if (filePath.includes('.styles.ts')) return false;

    // Check for code files (including Vue)
    return filePath.match(/\.(ts|tsx|js|jsx|vue)$/) !== null;
}

function analyzeFileContent(filePath: string): {
    hasTryCatch: boolean;
    hasAsync: boolean;
    hasSupabase: boolean;
    hasController: boolean;
    hasApiCall: boolean;
    hasLangchain: boolean;
} {
    if (!existsSync(filePath)) {
        return {
            hasTryCatch: false,
            hasAsync: false,
            hasSupabase: false,
            hasController: false,
            hasApiCall: false,
            hasLangchain: false
        };
    }

    const content = readFileSync(filePath, 'utf-8');

    return {
        hasTryCatch: /try\s*\{/.test(content),
        hasAsync: /async\s+/.test(content),
        hasSupabase: /supabase\.|createClient|from\(|select\(|insert\(|update\(|delete\(/i.test(content),
        hasController: /export (default )?(class|function).*Controller|router\.|app\.(get|post|put|delete|patch)/.test(content),
        hasApiCall: /fetch\(|axios\.|http\.|request\(/i.test(content),
        hasLangchain: /langchain|langgraph|ChatOpenAI|\.invoke\(|\.stream\(/i.test(content),
    };
}

async function main() {
    try {
        // Read input from stdin
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        const { session_id } = data;
        const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

        // Check for edited files tracking
        const cacheDir = join(projectDir, '.claude', 'tsc-cache', session_id);
        const trackingFile = join(cacheDir, 'edited-files.log');

        if (!existsSync(trackingFile)) {
            // No files edited this session, no reminder needed
            process.exit(0);
        }

        // Read tracking data (format: timestamp:file_path:repo)
        const trackingContent = readFileSync(trackingFile, 'utf-8');
        const editedFiles = trackingContent
            .trim()
            .split('\n')
            .filter(line => line.length > 0)
            .map(line => {
                const [timestamp, path, repo] = line.split(':');
                return { timestamp, path, repo };
            });

        if (editedFiles.length === 0) {
            process.exit(0);
        }

        // Categorize files
        const categories = {
            backend: [] as string[],
            frontend: [] as string[],
            database: [] as string[],
            other: [] as string[],
        };

        const analysisResults: Array<{
            path: string;
            category: string;
            analysis: ReturnType<typeof analyzeFileContent>;
        }> = [];

        for (const file of editedFiles) {
            if (!shouldCheckErrorHandling(file.path)) continue;

            const category = getFileCategory(file.path);
            categories[category].push(file.path);

            const analysis = analyzeFileContent(file.path);
            analysisResults.push({ path: file.path, category, analysis });
        }

        // Check if any code that needs error handling was written
        const needsAttention = analysisResults.some(
            ({ analysis }) =>
                analysis.hasTryCatch ||
                analysis.hasAsync ||
                analysis.hasSupabase ||
                analysis.hasController ||
                analysis.hasApiCall ||
                analysis.hasLangchain
        );

        if (!needsAttention) {
            // No risky code patterns detected, skip reminder
            process.exit(0);
        }

        // Display reminder
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 错误处理自检清单');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Backend reminders
        if (categories.backend.length > 0) {
            const backendFiles = analysisResults.filter(f => f.category === 'backend');
            const hasTryCatch = backendFiles.some(f => f.analysis.hasTryCatch);
            const hasSupabase = backendFiles.some(f => f.analysis.hasSupabase);
            const hasController = backendFiles.some(f => f.analysis.hasController);
            const hasLangchain = backendFiles.some(f => f.analysis.hasLangchain);

            console.log('⚠️  后端代码变更');
            console.log(`   ${categories.backend.length} 个文件被修改\n`);

            if (hasTryCatch) {
                console.log('   ❓ catch 块中是否添加了适当的错误日志?');
            }
            if (hasSupabase) {
                console.log('   ❓ Supabase 操作是否包含错误处理?');
            }
            if (hasLangchain) {
                console.log('   ❓ Langchain 工作流是否处理了异常情况?');
            }
            if (hasController) {
                console.log('   ❓ 控制器是否返回了合适的 HTTP 状态码?');
            }

            console.log('\n   💡 后端最佳实践:');
            console.log('      - 所有异步操作应包含 try-catch');
            console.log('      - 数据库错误应记录详细信息');
            console.log('      - API 端点应返回标准化的错误响应');
            console.log('      - Langchain 调用应处理超时和失败\n');
        }

        // Frontend reminders
        if (categories.frontend.length > 0) {
            const frontendFiles = analysisResults.filter(f => f.category === 'frontend');
            const hasApiCall = frontendFiles.some(f => f.analysis.hasApiCall);
            const hasTryCatch = frontendFiles.some(f => f.analysis.hasTryCatch);

            console.log('💡 前端代码变更');
            console.log(`   ${categories.frontend.length} 个文件被修改\n`);

            if (hasApiCall) {
                console.log('   ❓ API 调用失败时是否显示用户友好的错误消息?');
            }
            if (hasTryCatch) {
                console.log('   ❓ 错误是否通过 UI 反馈给用户?');
            }

            console.log('\n   💡 前端最佳实践:');
            console.log('      - 使用 Naive UI 的消息组件显示错误');
            console.log('      - 为关键组件添加错误边界');
            console.log('      - 显示用户可理解的错误信息\n');
        }

        // Database reminders
        if (categories.database.length > 0) {
            console.log('🗄️  数据库相关变更');
            console.log(`   ${categories.database.length} 个文件被修改\n`);
            console.log('   ❓ 是否验证了字段名与 schema 一致?');
            console.log('   ❓ 是否测试了数据迁移?\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 提示: 使用 SKIP_ERROR_REMINDER=1 禁用此提醒');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (err) {
        // Silently fail - this is just a reminder, not critical
        process.exit(0);
    }
}

main().catch(() => process.exit(0));
