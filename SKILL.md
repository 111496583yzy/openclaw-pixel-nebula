---
name: ai-paint
description: "Generate images with AI Paint's Gemini models and generate videos with RunningHub-backed video models. CAPABILITIES: text-to-image, image-to-image editing, multi-image composition, text-to-video, image-to-video."
---

# ai-paint

This skill enables an AI Agent to generate/edit images with AI Paint and generate videos through AI Paint's Open API.

## 🛠️ Capabilities

| ID | Description |
|----|-------------|
| `text_to_image` | Generate images from text prompts. Trigger when user asks to create/draw/generate an image. |
| `image_to_image` | Edit existing images based on text instructions. Trigger when user asks to modify/edit/transform an image. |
| `multi_image_compose` | Combine multiple images into one. Trigger when user asks to merge/combine/compose images. |
| `text_to_video` | Generate a video from text only. Trigger when user asks to create/generate a short video clip. |
| `image_to_video` | Generate a video from one or two reference images. Trigger when user asks to animate a reference image. |

## 🌟 The 3-Step Execution Methodology

### Step 1: Intent Detection

Analyze the user's request to determine the operation type:

- **Text-to-Image**: User provides only a text description (e.g., "画一只猫", "a sunset over mountains")
- **Image-to-Image**: User provides an image + editing instruction (e.g., "把背景换成海滩" + image)
- **Multi-Image**: User provides multiple images + composition instruction
- **Text-to-Video**: User asks for a short clip without reference images
- **Image-to-Video**: User provides one or two images and asks to animate them

### Step 2: Parameter Preparation

Based on the operation type, prepare the parameters.

Prefer the bundled CLI for both image and video tasks.

**Text-to-Image:**
```bash
# Node.js
node scripts/cli.js generate --api-key "<key>" --prompt "<prompt>"
# Python
python3 scripts/cli.py generate --api-key "<key>" --prompt "<prompt>"
```

**Image-to-Image:**
```bash
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "<your_api_key>" \
  --prompt "<editing instruction>" \
  --images "<image_url_or_local_path>" \
  --aspect-ratio match_input_image
```

**Multi-Image:**
```bash
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "<your_api_key>" \
  --prompt "<composition instruction>" \
  --images "<url1>,<url2>" \
  --aspect-ratio 16:9
```

**Text-to-Video:**
```bash
node skills/openclaw-ai-paint/scripts/cli.js video \
  --api-key "<your_api_key>" \
  --prompt "<video prompt>" \
  --model rhart-video-g \
  --aspect-ratio 1:1 \
  --resolution 720P \
  --duration 6s \
  --wait
```

**Image-to-Video:**
```bash
node skills/openclaw-ai-paint/scripts/cli.js video \
  --api-key "<your_api_key>" \
  --prompt "<animation instruction>" \
  --model kling-v3.0-std \
  --images "<image_url_or_local_path>" \
  --aspect-ratio 16:9 \
  --duration 5 \
  --wait
```

### Step 3: Execution & Response

#### Recommended Execution
Prefer waiting for the final result in one command:
```bash
# Node.js
node scripts/cli.js generate --api-key "<key>" --prompt "<prompt>" --wait
# Python
python3 scripts/cli.py generate --api-key "<key>" --prompt "<prompt>" --wait
```

#### Manual Query
If the API returns `status: "PROCESSING"`, query by `id`:
```bash
# Node.js
node scripts/cli.js query --api-key "<key>" --id <id>
# Python
python3 scripts/cli.py query --api-key "<key>" --id <id>
```

For video tasks, query by video history id:
```bash
# Node.js
node scripts/cli.js video-query --api-key "<key>" --id <id>
# Python
python3 scripts/cli.py video-query --api-key "<key>" --id <id>
```

### 🚨 Final Response Rules

- **Image Output**: If `output[0].image_url.url` exists, return that URL directly as a clickable link or embedded image
- **Video Output**: If `output[0].video_url.url` exists, return that URL directly as a clickable link
- **Format**: `![Generated Image](image_url)` or `[点击查看生成的图片](image_url)`
- **Video Format**: `[点击查看生成的视频](video_url)`
- **In-Progress**: If `status` is `PROCESSING` or `PENDING`, continue polling instead of claiming success
- **Multiple Images**: List all generated image URLs if `--number` was used

---

## 📋 Parameter Reference

### Required Parameters

| Parameter | Description |
|-----------|-------------|
| `--prompt` | Text description or editing instruction (required) |

### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--api-key` | API key passed directly on the command line | - |
| `--model` | AI model: `gemini3pro`, `nanobana-2`, `replicate` | `gemini3pro` |
| `--aspect-ratio` | Output ratio (see below) | `16:9` |
| `--images` | Reference image URLs or local file paths, comma-separated | - |
| `--size` | Image size: `1K`, `2K`, `4K` (gemini3pro only) | `2K` |
| `--number` | Number of images to generate: 1-4 (gemini3pro only) | `1` |
| `--wait` | Poll until final result is ready | `false` |
| `--poll-interval` | Poll interval in milliseconds | `5000` |
| `--max-wait` | Max wait time in milliseconds | `300000` |

### Video API Parameters

| Parameter | Description |
|-----------|-------------|
| `--model` | `rhart-video-g` or `kling-v3.0-std` |
| `--images` | 参考图 URL 或本地路径，最多 2 张 |
| `--aspect-ratio` | 视频比例，取值受模型限制 |
| `--resolution` | 仅 `rhart-video-g` 支持 `720P` / `1080P` |
| `--duration` | `rhart-video-g`: `6s/10s/15s`; `kling-v3.0-std`: `3-15` 秒 |
| `--negative-prompt` | 仅 `kling-v3.0-std` |
| `--cfg-scale` | 仅 `kling-v3.0-std`，范围 `0-1` |
| `--sound` | 仅 `kling-v3.0-std` |
| `--multi-prompt` | 仅 `kling-v3.0-std`，传 JSON 数组字符串 |

### Available Aspect Ratios
- `match_input_image` - Match input image ratio
- `1:1` - Square (avatars, social media)
- `2:3` - Portrait
- `3:2` - Landscape
- `3:4` - Portrait
- `4:3` - Landscape
- `4:5` - Portrait (Instagram)
- `5:4` - Landscape
- `9:16` - Portrait (mobile wallpaper, short video)
- `16:9` - Landscape (cinematic, landscape)
- `21:9` - Ultra-wide

### Credit Costs

| Model | Cost |
|-------|------|
| nanobana-2 | 1 credit |
| replicate | 3 credits |
| gemini3pro (2K) | 4 credits |
| gemini3pro (4K) | 8 credits |

Video costs follow the current AI Paint backend configuration. Do not hardcode them in the agent unless the API response or product pricing page explicitly provides the current value.

---

## 🔐 API Key Usage

Primary mode is passing the API key directly with `--api-key` for better tool compatibility with simpler agents.

### How to provide the API Key:

1. **Command Line (Preferred for reliability):**
   ```bash
   node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "sk-your_api_key_here" --prompt "一只猫"
   ```

2. **Environment Variable (Fallback):**
   ```bash
   export AI_PAINT_API_KEY="sk-your_api_key_here"
   ```

### 🤖 AI Agent Onboarding (Handling Missing Keys)

If you attempt to run `skills/openclaw-ai-paint/scripts/cli.js` and receive the error **"缺少 AI_PAINT_API_KEY 环境变量"**, execute the following:

1. **STOP** and ask the user for an API key if none is configured.

2. Prefer passing it directly with `--api-key` for the tool call. If the environment is already configured, environment variable fallback is also fine:
   ```bash
   node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "<THE_KEY_PROVIDED>" --prompt "一只猫"
   ```

3. Inform the user the key is configured and resume their original request.

4. If the user prefers environment-based setup, `AI_PAINT_API_KEY` is still supported as fallback.

---

## 📝 Usage Examples

### Example 1: Generate an image from text
**User**: "画一只赛博朋克风格的猫"
**Agent**:
```bash
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "<your_api_key>" \
  --prompt "A cyberpunk cat with neon eyes, metallic fur, circuitry details, sitting in a rainy futuristic Tokyo alley, neon signs reflecting on puddles, cinematic lighting, 8k" \
  --model gemini3pro \
  --aspect-ratio 16:9 \
  --size 2K \
  --wait
```

### Example 2: Edit an existing image
**User**: "把这张照片的背景换成海滩" (with image attached)
**Agent**:
```bash
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "<your_api_key>" \
  --prompt "Change the background to a tropical beach with palm trees and blue ocean, keep the subject unchanged" \
  --images "https://example.com/photo.jpg" \
  --model gemini3pro \
  --aspect-ratio match_input_image \
  --wait
```

### Example 3: Generate multiple variations
**User**: "给我生成4种不同风格的头像"
**Agent**:
```bash
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "<your_api_key>" \
  --prompt "Professional avatar portrait, diverse styles: realistic, anime, watercolor, 3D render" \
  --model gemini3pro \
  --aspect-ratio 1:1 \
  --number 4 \
  --wait
```

### Example 4: Generate a short video
**User**: "生成一个咖啡馆氛围的 6 秒短视频"
**Agent**:
```bash
node skills/openclaw-ai-paint/scripts/cli.js video \
  --api-key "<your_api_key>" \
  --prompt "A cozy coffee shop scene, cinematic camera movement, warm lighting" \
  --model rhart-video-g \
  --aspect-ratio 1:1 \
  --resolution 720P \
  --duration 6s \
  --wait
```

Manual query if needed:
```bash
node skills/openclaw-ai-paint/scripts/cli.js video-query \
  --api-key "<your_api_key>" \
  --id <history_id>
```

---

## 🔧 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `缺少 API Key` | `--api-key` and environment variable both missing | Pass `--api-key` or set `AI_PAINT_API_KEY` |
| `等待结果超时` | 任务仍在处理中 | Increase `--max-wait` or query again later |
| `prompt is required` | Missing --prompt | Add prompt parameter |
| `Rate limit exceeded` | Too many requests | Wait and retry |
| `Invalid API key` | Wrong or expired key | Check key in profile settings |
| `积分不足` | Insufficient credits | Top up credits in AI Paint |
| `status=PROCESSING` (video) | 视频仍在生成中 | Continue polling `GET /api/v1/video/:id` |
