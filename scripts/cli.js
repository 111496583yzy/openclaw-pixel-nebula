#!/usr/bin/env node
/**
 * AI Paint - OpenClaw Tool Script
 * 
 * 用法:
 *   node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-xxx" --prompt "描述" --model gemini3pro
 *   node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-xxx" --prompt "描述" --images "https://..."
 *   node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-xxx" --prompt "描述" --wait
 *   node skills/openclaw-ai-paint/scripts/cli.js query --id 12345
 * 
 * 环境变量:
 *   AI_PAINT_API_KEY  - API Key (可选，作为 --api-key 的兜底)
 *   AI_PAINT_BASE_URL - API 地址 (默认 https://caca.yzycolour.top/api/v1)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 基础 API 路径，移除末尾斜杠和 v1 后缀，统一管理
const API_ROOT = (process.env.AI_PAINT_BASE_URL || 'https://caca.yzycolour.top/api').replace(/\/$/, '').replace(/\/v1$/, '');

function computeSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getResultStatus(result) {
    const status = String(result?.status || '').trim().toUpperCase();
    if (status) return status;
    if (Array.isArray(result?.output) && result.output.length > 0) {
        return 'COMPLETED';
    }
    return '';
}

function getApiKey(params = {}) {
    return String(params.api_key || process.env.AI_PAINT_API_KEY || '').trim();
}

// 辅助函数：构建完整的 API URL
function getApiUrl(apiPath) {
    const cleanPath = apiPath.startsWith('/') ? apiPath.slice(1) : apiPath;
    // 如果是 upload 开头的路径，直接拼在 API_ROOT 后
    if (cleanPath.startsWith('upload/')) {
        return `${API_ROOT}/${cleanPath}`;
    }
    // 其他路径默认加上 v1
    if (cleanPath.startsWith('v1/')) {
        return `${API_ROOT}/${cleanPath}`;
    }
    return `${API_ROOT}/v1/${cleanPath}`;
}

// 解析命令行参数
function parseArgs(args) {
    const params = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2).replace(/-/g, '_'); // 将横线转为下划线，方便 JS 调用
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                params[key] = value;
                i++;
            } else {
                params[key] = true;
            }
        }
    }
    return params;
}

// HTTP 请求
function request(method, apiPath, apiKey, body = null) {
    return new Promise((resolve, reject) => {
        const fullUrl = getApiUrl(apiPath);
        const url = new URL(fullUrl);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'AIPaint-OpenClaw/1.0'
            },
            timeout: 300000 // 5 分钟超时
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (!data.trim().startsWith('{') && !data.trim().startsWith('[')) {
                        if (res.statusCode >= 400) {
                            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 100)}`));
                        }
                        return resolve(data);
                    }
                    
                    const json = JSON.parse(data);
                    if (res.statusCode >= 400 || (json.success === false)) {
                        reject(new Error(json.error?.message || json.error || json.message || `HTTP ${res.statusCode}`));
                    } else {
                        resolve(json);
                    }
                } catch (e) {
                    reject(new Error(`解析响应失败 (HTTP ${res.statusCode}): ${data.slice(0, 200)}`));
                }
            });
        });

        req.on('error', (err) => reject(new Error(`请求失败: ${err.message}`)));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('请求超时'));
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// PUT 请求用于上传
function put(urlStr, buffer, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Length': buffer.length
            }
        };

        const req = lib.request(options, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ etag: res.headers['etag'] || res.headers['ETag'] || '' });
            } else {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => reject(new Error(`PUT failed (${res.statusCode}): ${data}`)));
            }
        });
        req.on('error', reject);
        req.write(buffer);
        req.end();
    });
}

// 实现上传逻辑
async function uploadImage(filePath, apiKey) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const size = buffer.length;
    const sha256 = computeSha256(buffer);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    // 1. Init
    const initData = await request('POST', 'upload/init', apiKey, {
        scene: 'gemini_edit_input',
        contentType,
        size,
        sha256,
        originalName: path.basename(filePath)
    });

    let etag = '';
    if (!initData.skipUpload) {
        // 2. Put
        const uploadResult = await put(initData.putUrl, buffer, initData.requiredHeaders || {});
        etag = uploadResult.etag;
    }

    // 3. Complete
    const completeData = await request('POST', 'upload/complete', apiKey, {
        uploadId: initData.uploadId,
        etag,
        sha256
    });

    return completeData.proxyUrl;
}

// 生成图片
async function generate(params) {
    const apiKey = getApiKey(params);
    if (!apiKey) {
        throw new Error('--api-key 参数必填，或设置 AI_PAINT_API_KEY 环境变量');
    }

    if (!params.prompt) {
        throw new Error('--prompt 参数必填');
    }

    const body = {
        prompt: params.prompt,
        model: params.model || 'gemini3pro',
        aspect_ratio: params.aspect_ratio || '16:9'
    };

    if (params.images) {
        const imageInputs = params.images.split(',').map(s => s.trim()).filter(Boolean);
        const imageUrls = [];
        
        for (const input of imageInputs) {
            if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:')) {
                imageUrls.push(input);
            } else {
                console.warn(`[CLI] 检测到本地文件，正在处理上传: ${input}`);
                try {
                    const uploadedUrl = await uploadImage(input, apiKey);
                    imageUrls.push(uploadedUrl);
                } catch (err) {
                    throw new Error(`上传本地文件失败 (${input}): ${err.message}`);
                }
            }
        }
        body.image_urls = imageUrls;
    }
    
    if (params.size) {
        body.image_size = params.size;
    }
    if (params.number) {
        body.number_of_images = parseInt(params.number, 10);
    }

    const result = await request('POST', 'gemini-edit', apiKey, body);
    return result;
}

// 查询结果
async function query(id, params = {}) {
    const apiKey = getApiKey(params);
    if (!apiKey) {
        throw new Error('--api-key 参数必填，或设置 AI_PAINT_API_KEY 环境变量');
    }

    if (!id) {
        throw new Error('--id 参数必填');
    }
    return await request('GET', `gemini-edit/${id}`, apiKey);
}

async function waitForCompletion(id, params = {}) {
    const pollIntervalMs = Math.max(1000, parseInt(params.poll_interval, 10) || 5000);
    const maxWaitMs = Math.max(pollIntervalMs, parseInt(params.max_wait, 10) || 300000);
    const deadline = Date.now() + maxWaitMs;
    let lastResult = null;

    while (Date.now() <= deadline) {
        lastResult = await query(id, params);
        const status = getResultStatus(lastResult);

        if (status === 'COMPLETED') {
            return lastResult;
        }

        if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
            throw new Error(`任务执行失败: ${status}`);
        }

        await sleep(pollIntervalMs);
    }

    const lastStatus = getResultStatus(lastResult) || 'PROCESSING';
    throw new Error(`等待结果超时，当前状态: ${lastStatus}`);
}

// 主函数
async function main() {
    const [command, ...rest] = process.argv.slice(2);
    const params = parseArgs(rest);

    if (!getApiKey(params)) {
        console.error(JSON.stringify({
            success: false,
            error: '缺少 API Key。请通过 --api-key 传入，或设置 AI_PAINT_API_KEY 环境变量。'
        }));
        process.exit(1);
    }

    try {
        let result;
        switch (command) {
            case 'generate':
            case 'gen':
                result = await generate(params);
                if (params.wait) {
                    const id = result?.id;
                    if (!id) {
                        throw new Error('生成响应缺少 id，无法轮询结果');
                    }
                    const status = getResultStatus(result);
                    result = status === 'COMPLETED'
                        ? result
                        : await waitForCompletion(id, params);
                }
                break;
            case 'query':
            case 'status':
                result = params.wait
                    ? await waitForCompletion(params.id, params)
                    : await query(params.id, params);
                break;
            case 'help':
            case '--help':
            case '-h':
                console.log(`
AI Paint OpenClaw Tool

用法:
  node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-xxx" --prompt "描述文字"
  node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-xxx" --prompt "描述" --images "url1,url2"
  node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-xxx" --prompt "描述" --images "./local_image.png"
  node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-xxx" --prompt "描述" --wait
  node skills/openclaw-ai-paint/scripts/cli.js query --api-key "sk-xxx" --id 12345

参数:
  --api-key       API Key (优先于环境变量)
  --prompt        提示词 (必填)
  --model         模型: gemini3pro, nanobana-2, replicate (默认 gemini3pro)
  --aspect-ratio  比例: 1:1, 16:9, 9:16 等 (默认 16:9)
  --images        参考图 URL 或本地文件路径，逗号分隔
  --size          尺寸: 1K, 2K, 4K (仅 gemini3pro)
  --number        生成数量 1-4 (仅 gemini3pro)
  --wait          自动轮询直到完成
  --poll-interval 轮询间隔毫秒 (默认 5000)
  --max-wait      最大等待毫秒 (默认 300000)

环境变量:
  AI_PAINT_API_KEY   API Key (可选兜底)
  AI_PAINT_BASE_URL  API Root 地址 (默认 https://caca.yzycolour.top/api)
`);
                process.exit(0);
            default:
                throw new Error(`未知命令: ${command || '(空)'}，使用 --help 查看帮助`);
        }

        console.log(JSON.stringify({ success: true, data: result }));
    } catch (error) {
        console.error(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
}

main();
