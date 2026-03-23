---
name: ai-paint
description: "Generate and edit images using AI Paint's Gemini models. CAPABILITIES: text-to-image, image-to-image editing, multi-image composition. Supports gemini3pro, nanobana-2, replicate models."
---

# ai-paint

This skill enables an AI Agent to generate and edit images using AI Paint's cloud-based Gemini models.

## 🛠️ Capabilities

| ID | Description |
|----|-------------|
| `text_to_image` | Generate images from text prompts. Trigger when user asks to create/draw/generate an image. |
| `image_to_image` | Edit existing images based on text instructions. Trigger when user asks to modify/edit/transform an image. |
| `multi_image_compose` | Combine multiple images into one. Trigger when user asks to merge/combine/compose images. |

## 🌟 The 3-Step Execution Methodology

### Step 1: Intent Detection

Analyze the user's request to determine the operation type:

- **Text-to-Image**: User provides only a text description (e.g., "画一只猫", "a sunset over mountains")
- **Image-to-Image**: User provides an image + editing instruction (e.g., "把背景换成海滩" + image)
- **Multi-Image**: User provides multiple images + composition instruction

### Step 2: Parameter Preparation

Based on the operation type, prepare the parameters:

**Text-to-Image:**
```bash
node skills/openclaw-ai-paint/scripts/cli.js generate \
  --api-key "<your_api_key>" \
  --prompt "<user's description>" \
  --model gemini3pro \
  --aspect-ratio 16:9
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

### Step 3: Execution & Response

#### Recommended Execution
Prefer waiting for the final result in one command:
```bash
node skills/openclaw-ai-paint/scripts/cli.js generate --api-key "<your_api_key>" --prompt "一只可爱的猫咪" --wait
```

#### Manual Query
If the API returns `status: "PROCESSING"` / `status: "PENDING"`, query by `id`:
```bash
node skills/openclaw-ai-paint/scripts/cli.js query --api-key "<your_api_key>" --id <history_id>
```

### 🚨 Final Response Rules

- **Image Output**: If `output[0].image_url.url` exists, return that URL directly as a clickable link or embedded image
- **Format**: `![Generated Image](image_url)` or `[点击查看生成的图片](image_url)`
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
