# AI Paint Open API Documentation

## Base URL
```
https://caca.yzycolour.top/api/v1
```

## Authentication
所有请求需要携带 API Key，支持两种方式：

```bash
# 方式 1: Authorization Header
Authorization: Bearer sk-your_api_key_here

# 方式 2: X-API-Key Header
X-API-Key: sk-your_api_key_here
```

### 获取 API Key
1. 登录 AI Paint 应用
2. 点击左下角头像 → 打开「个人资料设置」
3. 滚动到底部找到「API Key」区域
4. 点击「创建 Key」，输入名称（可选）
5. 复制并保存生成的 Key（仅显示一次）

也可以通过 API 管理：

```bash
# 创建 Key
POST /api/api-keys
{
  "name": "My App",
  "rate_limit": 60  # 每分钟请求上限（最大 300）
}

# 返回
{
  "success": true,
  "data": {
    "key": "sk-a1b2c3d4e5f6...",  # 仅返回一次，请妥善保存
    "key_prefix": "sk-a1b2c3",
    "name": "My App",
    "rate_limit": 60
  }
}
```

---

## Endpoints

### 1. Generate / Edit Image
生成或编辑图片。

```
POST /api/v1/gemini-edit
```

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | 提示词（最大 8000 字符） |
| `model` | string | - | 模型: `gemini3pro`, `nanobana-2`, `replicate` |
| `image_urls` | string[] | - | 参考图 URL 列表（最多 10 张） |
| `aspect_ratio` | string | - | 宽高比: `match_input_image`, `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `number_of_images` | int | - | 生成数量 1-4（仅 `gemini3pro`） |
| `image_size` | string | - | 图片尺寸: `1K`, `2K`, `4K`（仅 `gemini3pro`） |

**Response**

```json
{
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
```

异步任务会先返回：

```json
{
  "id": 12345,
  "object": "edit",
  "created_at": 1710000000,
  "model": "gemini3pro",
  "status": "PROCESSING",
  "task_id": "1999999999999999999",
  "output": [],
  "usage": {
    "credits_used": 4
  }
}
```

此时请继续调用 `GET /api/v1/gemini-edit/:id` 轮询结果。

**Error Response**

```json
{
  "error": {
    "message": "prompt is required.",
    "type": "invalid_request_error"
  }
}
```

---

### 2. Get Generation Result
查询生成结果。

```
GET /api/v1/gemini-edit/:id
```

**Response** 与上述相同；当 `status` 为 `PROCESSING` 时表示结果尚未写回。

---

### 3. Generate Video
生成视频。当前对外 API 支持 `RunningHub` 两个视频模型：

- `rhart-video-g`
- `kling-v3.0-std`

```
POST /api/v1/video
```

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | 提示词，长度 5-800 字符 |
| `model` | string | ✅ | `rhart-video-g` 或 `kling-v3.0-std` |
| `image_urls` | string[] | - | 参考图 URL 列表，最多 2 张；支持 `http/https/data:image` |
| `aspect_ratio` | string | - | `rhart-video-g`: `2:3`, `3:2`, `1:1`；`kling-v3.0-std`: `1:1`, `16:9`, `9:16` |
| `resolution` | string | - | 仅 `rhart-video-g`：`720P`, `1080P` |
| `duration` | string/number | - | `rhart-video-g`: `6s`, `10s`, `15s`；`kling-v3.0-std`: `3-15` 秒 |
| `negative_prompt` | string | - | 仅 `kling-v3.0-std` |
| `cfg_scale` | number | - | 仅 `kling-v3.0-std`，范围 `0-1` |
| `sound` | boolean | - | 仅 `kling-v3.0-std` |
| `multi_prompt` | array | - | 仅 `kling-v3.0-std` |

**Response**

视频任务当前统一为异步，创建后先返回：

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

此时请继续调用 `GET /api/v1/video/:id` 轮询结果。

---

### 4. Get Video Result
查询视频结果。

```
GET /api/v1/video/:id
```

**Completed Response**

```json
{
  "id": 67890,
  "object": "video",
  "created_at": 1710000000,
  "model": "rhart-video-g",
  "status": "COMPLETED",
  "output": [
    {
      "type": "video_url",
      "video_url": {
        "url": "https://..."
      },
      "thumbnail_url": "https://..."
    }
  ],
  "task_id": "2000000000000000001",
  "usage": {
    "credits_used": 3
  }
}
```

**Still Processing**

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

**Failed**

```json
{
  "id": 67890,
  "object": "video",
  "created_at": 1710000000,
  "model": "rhart-video-g",
  "status": "FAILED",
  "output": [],
  "task_id": "2000000000000000001",
  "usage": {
    "credits_used": 3
  },
  "error": {
    "message": "视频生成失败",
    "type": "api_error"
  }
}
```

---

## Rate Limiting

响应 Header 包含限流信息：

```
X-RateLimit-Limit: 60        # 每分钟上限
X-RateLimit-Remaining: 45    # 剩余次数
```

超限返回 `429`：

```json
{
  "error": {
    "message": "Rate limit exceeded. Limit: 60 requests/minute.",
    "type": "rate_limit_error",
    "retry_after": 32
  }
}
```

---

## Credit Costs

| Model | Cost (credits) |
|-------|----------------|
| `replicate` (default) | 3 |
| `nanobana-2` | 1 |
| `gemini3pro` (2K) | 4 |
| `gemini3pro` (4K) | 8 |

---

## Code Examples

### Python: Image

```python
import requests

API_KEY = "sk-your_api_key_here"
BASE_URL = "https://caca.yzycolour.top/api/v1"

# Generate image
response = requests.post(
    f"{BASE_URL}/gemini-edit",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "prompt": "a cute cat sitting on a sofa",
        "model": "gemini3pro",
        "aspect_ratio": "16:9",
        "image_size": "2K"
    }
)

data = response.json()
if data.get("status") == "COMPLETED" and data.get("output"):
    print(f"Generated: {data['output'][0]['image_url']['url']}")
else:
    print(f"Processing: id={data['id']} status={data.get('status')}")
```

### cURL: Image

```bash
curl -X POST https://caca.yzycolour.top/api/v1/gemini-edit \
  -H "Authorization: Bearer sk-your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute cat sitting on a sofa",
    "model": "gemini3pro",
    "aspect_ratio": "16:9"
  }'
```

### JavaScript: Image

```javascript
const response = await fetch('https://caca.yzycolour.top/api/v1/gemini-edit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'a cute cat sitting on a sofa',
    model: 'gemini3pro',
    aspect_ratio: '16:9'
  })
});

const data = await response.json();
if (data.status === 'COMPLETED' && data.output?.length) {
  console.log(data.output[0].image_url.url);
} else {
  console.log(`processing: id=${data.id} status=${data.status}`);
}
```

### cURL: Video Create

```bash
curl -X POST https://caca.yzycolour.top/api/v1/video \
  -H "Authorization: Bearer sk-your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cinematic panda drinking coffee in the rain",
    "model": "rhart-video-g",
    "aspect_ratio": "1:1",
    "resolution": "720P",
    "duration": "6s"
  }'
```

### cURL: Video Query

```bash
curl -X GET https://caca.yzycolour.top/api/v1/video/67890 \
  -H "Authorization: Bearer sk-your_api_key_here"
```

### JavaScript: Video

```javascript
const createRes = await fetch('https://caca.yzycolour.top/api/v1/video', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'A cinematic panda drinking coffee in the rain',
    model: 'rhart-video-g',
    aspect_ratio: '1:1',
    resolution: '720P',
    duration: '6s'
  })
});

const created = await createRes.json();
console.log(created.id, created.task_id, created.status);

const queryRes = await fetch(`https://caca.yzycolour.top/api/v1/video/${created.id}`, {
  headers: {
    'Authorization': 'Bearer sk-your_api_key_here'
  }
});

const result = await queryRes.json();
if (result.status === 'COMPLETED' && result.output?.length) {
  console.log(result.output[0].video_url.url);
} else {
  console.log(`processing: id=${result.id} status=${result.status}`);
}
```

---

## API Key Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/api-keys` | GET | 获取 Key 列表 |
| `/api/api-keys` | POST | 创建新 Key |
| `/api/api-keys/:id` | PATCH | 更新 Key（name/is_active/rate_limit） |
| `/api/api-keys/:id` | DELETE | 删除 Key |

管理接口使用 JWT 认证（登录态），不使用 API Key。

---

## OpenClaw Skill

我们提供了一个 OpenClaw skill 文件，方便 OpenClaw 直接调用 AI Paint 的图片生成功能。

**Skill 文件位置：** `skills/openclaw-ai-paint/SKILL.md`

**功能：**
- 文生图：纯文字描述生成图片
- 图生图：基于参考图编辑
- 多图编辑：多张图片组合编辑
- 文生视频：通过 `/api/v1/video` 调用 `rhart-video-g` / `kling-v3.0-std`

**使用方式：**
1. 在 OpenClaw 中加载 skill 文件
2. 确保 API Key 已配置
3. 图片任务可直接走 bundled CLI
4. 视频任务请直接调用 `/api/v1/video` 和 `/api/v1/video/:id`
