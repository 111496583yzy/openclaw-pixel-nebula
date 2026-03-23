# AI Paint OpenClaw Tool

OpenClaw 调用 AI Paint API 的工具集合。

- 图片：支持 bundled CLI
- 视频：现在也支持 bundled CLI

## 快速开始

```bash
# 1. 测试是否可用
node skills/openclaw-ai-paint/scripts/cli.js --help

# 2. 生成图片（推荐直接传 key）
node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-your_api_key_here" --prompt "一只可爱的猫咪" --wait

# 3. 也支持环境变量兜底
export AI_PAINT_API_KEY="sk-your_api_key_here"
node skills/openclaw-ai-paint/scripts/cli.js generate --prompt "一只可爱的猫咪" --wait

# 4. 视频生成
node skills/openclaw-ai-paint/scripts/cli.js video \
  --api-key "sk-your_api_key_here" \
  --prompt "A cinematic panda drinking coffee in the rain" \
  --model rhart-video-g \
  --aspect-ratio 1:1 \
  --resolution 720P \
  --duration 6s \
  --wait
```

## 获取 API Key

1. 登录 AI Paint (https://caca.yzycolour.top)
2. 点击左下角头像 → 个人资料设置
3. 滚动到底部 → API Key 区域
4. 点击「创建 Key」→ 复制保存

## 命令

### generate - 生成/编辑图片

```bash
# 文生图（最简用法）
node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-your_api_key_here" --prompt "赛博朋克城市夜景"

# 指定模型和比例
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "sk-your_api_key_here" \
  --prompt "风景照" \
  --model gemini3pro \
  --aspect-ratio 16:9 \
  --size 2K \
  --wait

# 图生图（编辑）
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "sk-your_api_key_here" \
  --prompt "将背景换成海滩" \
  --images "https://example.com/photo.jpg" \
  --wait

# 多图编辑
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "sk-your_api_key_here" \
  --prompt "把人物放到场景中" \
  --images "https://example.com/person.jpg,https://example.com/scene.jpg" \
  --wait

# 一次生成多张
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "sk-your_api_key_here" \
  --prompt "猫咪" \
  --number 4 \
  --wait
```

### query - 查询生成结果

```bash
node skills/openclaw-ai-paint/scripts/cli.js query --api-key "sk-your_api_key_here" --id 12345
```

### video - 生成视频

```bash
# 纯文本生成视频
node skills/openclaw-ai-paint/scripts/cli.js video \
  --api-key "sk-your_api_key_here" \
  --prompt "A cinematic panda drinking coffee in the rain" \
  --model rhart-video-g \
  --aspect-ratio 1:1 \
  --resolution 720P \
  --duration 6s \
  --wait

# 用参考图生成视频
node skills/openclaw-ai-paint/scripts/cli.js video \
  --api-key "sk-your_api_key_here" \
  --prompt "Make the character slowly turn and smile" \
  --model kling-v3.0-std \
  --images "https://example.com/photo.jpg" \
  --aspect-ratio 16:9 \
  --duration 5 \
  --wait
```

### video-query - 查询视频结果

```bash
node skills/openclaw-ai-paint/scripts/cli.js video-query --api-key "sk-your_api_key_here" --id 67890
```

## 参数列表

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--api-key` | API Key，优先于环境变量 | - |
| `--prompt` | 提示词（必填） | - |
| `--model` | 模型: gemini3pro, nanobana-2, replicate | gemini3pro |
| `--aspect-ratio` | 比例: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 | 16:9 |
| `--images` | 参考图 URL，逗号分隔 | - |
| `--size` | 尺寸: 1K, 2K, 4K | 2K |
| `--number` | 生成数量 1-4 | 1 |
| `--resolution` | 视频分辨率: 720P, 1080P（仅 rhart-video-g） | 720P |
| `--duration` | 视频时长: rhart-video-g 用 6s/10s/15s，kling 用 3-15 | 视模型而定 |
| `--negative-prompt` | 视频负向提示词（仅 kling-v3.0-std） | - |
| `--cfg-scale` | 视频 cfg_scale（仅 kling-v3.0-std） | - |
| `--sound` | 视频是否带声音 true/false（仅 kling-v3.0-std） | false |
| `--multi-prompt` | 视频 multi_prompt，传 JSON 数组字符串（仅 kling-v3.0-std） | - |
| `--wait` | 自动轮询直到完成 | false |
| `--poll-interval` | 轮询间隔毫秒 | 5000 |
| `--max-wait` | 最大等待毫秒 | 300000 |
| `--id` | 历史 ID（query 用） | - |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AI_PAINT_API_KEY` | API Key（可选兜底） | - |
| `AI_PAINT_BASE_URL` | API 根地址 | https://caca.yzycolour.top/api |

## 输出格式

```json
{
  "success": true,
  "data": {
    "id": 12345,
    "object": "edit",
    "created_at": 1710000000,
    "model": "gemini3pro",
    "status": "COMPLETED",
    "output": [
      {
        "type": "image_url",
        "image_url": {
          "url": "https://..."
        }
      }
    ],
    "usage": {
      "credits_used": 4
    }
  }
}
```

## 视频 Open API

CLI 现在已经支持视频；如果你不想走 CLI，也可以直接调用 `/api/v1/video`。

CLI 视频返回结构与 Open API 一致，例如：

```json
{
  "id": 67890,
  "object": "video",
  "created_at": 1710000000,
  "model": "rhart-video-g",
  "status": "PROCESSING",
  "output": [],
  "task_id": "2000000000000000001",
  "usage": {
    "credits_used": 3
  }
}
```

### 查询视频结果

```bash
curl -X GET https://caca.yzycolour.top/api/v1/video/67890 \
  -H "Authorization: Bearer sk-your_api_key_here"
```

支持模型：

- `rhart-video-g`
- `kling-v3.0-std`

说明：

- 视频任务当前统一为异步
- CLI 使用 `video --wait` 时会自动轮询；也可以手动 `video-query --id`
- 视频结果在 `output[0].video_url.url`

## OpenClaw 配置

在 OpenClaw 中配置此工具：

```yaml
tools:
  ai-paint:
    command: node /path/to/skills/openclaw-ai-paint/scripts/cli.js --api-key sk-your_api_key_here
```

为提高简单 agent 的运行成功率，当前推荐直接使用 `--api-key`。如果你的环境管理更规范，也可以继续使用 `AI_PAINT_API_KEY`。
