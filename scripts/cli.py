#!/usr/bin/env python3
import os
import sys
import json
import time
import hashlib
import argparse
import mimetypes
from urllib.parse import urlparse
import requests

# 基础 API 路径管理
API_BASE = os.getenv('AI_PAINT_BASE_URL', 'https://caca.yzycolour.top/api').rstrip('/')
if API_BASE.endswith('/v1'):
    API_BASE = API_BASE[:-3]

def get_api_url(api_path):
    clean_path = api_path.lstrip('/')
    if clean_path.startswith('upload/') or clean_path.startswith('v1/'):
        return f"{API_BASE}/{clean_path}"
    return f"{API_BASE}/v1/{clean_path}"

def compute_sha256(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def get_api_key(args):
    return (args.api_key or os.getenv('AI_PAINT_API_KEY') or '').strip()

def parse_boolean(value):
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    return normalized in ('1', 'true', 'yes', 'on')

def request_api(method, api_path, api_key, body=None):
    url = get_api_url(api_path)
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'User-Agent': 'AIPaint-Python-CLI/1.0'
    }
    
    try:
        response = requests.request(method, url, headers=headers, json=body, timeout=300)
        
        if response.status_code >= 400:
            try:
                err_data = response.json()
                msg = err_data.get('error', {}).get('message') or err_data.get('message') or response.text
            except:
                msg = response.text
            raise Exception(f"HTTP {response.status_code}: {msg}")
            
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"请求失败: {str(e)}")

def upload_image(file_path, api_key):
    if not os.path.exists(file_path):
        raise Exception(f"文件不存在: {file_path}")

    file_size = os.path.getsize(file_path)
    sha256 = compute_sha256(file_path)
    content_type, _ = mimetypes.guess_type(file_path)
    content_type = content_type or 'application/octet-stream'

    # 1. Init
    init_data = request_api('POST', 'upload/init', api_key, {
        'scene': 'gemini_edit_input',
        'contentType': content_type,
        'size': file_size,
        'sha256': sha256,
        'originalName': os.path.basename(file_path)
    })

    if not init_data.get('skipUpload'):
        # 2. Put
        put_url = init_data['putUrl']
        headers = init_data.get('requiredHeaders', {})
        with open(file_path, 'rb') as f:
            put_res = requests.put(put_url, data=f, headers=headers, timeout=300)
            if not (200 <= put_res.status_code < 300):
                raise Exception(f"PUT failed ({put_res.status_code}): {put_res.text}")
            etag = put_res.headers.get('ETag', '').strip('"')
    else:
        etag = ''

    # 3. Complete
    complete_data = request_api('POST', 'upload/complete', api_key, {
        'uploadId': init_data['uploadId'],
        'etag': etag,
        'sha256': sha256
    })

    return complete_data['proxyUrl']

def resolve_image_inputs(raw_images, api_key):
    if not raw_images:
        return []
    
    inputs = [s.strip() for s in raw_images.split(',') if s.strip()]
    image_urls = []
    
    for item in inputs:
        if item.startswith(('http://', 'https://', 'data:')):
            image_urls.append(item)
            continue
            
        print(f"[CLI] 检测到本地文件，正在处理上传: {item}", file=sys.stderr)
        try:
            url = upload_image(item, api_key)
            image_urls.append(url)
        except Exception as e:
            raise Exception(f"上传本地文件失败 ({item}): {str(e)}")
            
    return image_urls

def get_result_status(result):
    status = str(result.get('status', '')).strip().upper()
    if status:
        return status
    output = result.get('output')
    if isinstance(output, list) and len(output) > 0:
        return 'COMPLETED'
    return ''

def wait_for_completion(query_func, task_id, api_key, args):
    poll_interval = max(1, int(args.poll_interval or 5000)) / 1000.0
    max_wait = max(poll_interval, int(args.max_wait or 300000)) / 1000.0
    deadline = time.time() + max_wait
    
    last_result = None
    while time.time() <= deadline:
        last_result = query_func(task_id, api_key)
        status = get_result_status(last_result)
        
        if status == 'COMPLETED':
            return last_result
            
        if status in ('FAILED', 'ERROR', 'CANCELLED'):
            raise Exception(f"任务执行失败: {status}")
            
        time.sleep(poll_interval)
        
    last_status = get_result_status(last_result) or 'PROCESSING'
    raise Exception(f"等待结果超时，当前状态: {last_status}")

def main():
    parser = argparse.ArgumentParser(description="AI Paint OpenClaw Python Tool")
    parser.add_argument("command", choices=['generate', 'gen', 'video', 'video-gen', 'query', 'status', 'video-query', 'video-status'], help="命令类型")
    parser.add_argument("--api-key", help="API Key")
    parser.add_argument("--prompt", help="提示词")
    parser.add_argument("--model", help="模型名称")
    parser.add_argument("--aspect-ratio", help="宽高比")
    parser.add_argument("--images", help="参考图路径或 URL，逗号分隔")
    parser.add_argument("--id", help="任务 ID")
    parser.add_argument("--size", help="图片尺寸 (仅 gemini3pro)")
    parser.add_argument("--number", type=int, help="生成数量 (仅 gemini3pro)")
    parser.add_argument("--resolution", help="视频分辨率 (仅 rhart-video-g)")
    parser.add_argument("--duration", help="视频时长")
    parser.add_argument("--negative-prompt", help="负向提示词")
    parser.add_argument("--cfg-scale", type=float, help="CFG Scale")
    parser.add_argument("--sound", help="是否带声音 (true/false)")
    parser.add_argument("--multi-prompt", help="多级提示词 (JSON 数组)")
    parser.add_argument("--wait", action="store_true", help="是否等待完成")
    parser.add_argument("--poll-interval", type=int, default=5000, help="轮询间隔 (ms)")
    parser.add_argument("--max-wait", type=int, default=300000, help="最大等待时间 (ms)")

    args = parser.parse_args()
    api_key = get_api_key(args)
    
    if not api_key:
        print(json.dumps({"success": False, "error": "缺少 API Key"}), file=sys.stderr)
        sys.exit(1)

    try:
        result = None
        cmd = args.command
        
        if cmd in ('generate', 'gen'):
            if not args.prompt: raise Exception("--prompt 必填")
            body = {
                'prompt': args.prompt,
                'model': args.model or 'gemini3pro',
                'aspect_ratio': args.aspect_ratio or '16:9'
            }
            if args.images: body['image_urls'] = resolve_image_inputs(args.images, api_key)
            if args.size: body['image_size'] = args.size
            if args.number: body['number_of_images'] = args.number
            
            result = request_api('POST', 'gemini-edit', api_key, body)
            if args.wait and result.get('id'):
                result = wait_for_completion(lambda tid, key: request_api('GET', f'gemini-edit/{tid}', key), result['id'], api_key, args)

        elif cmd in ('video', 'video-gen'):
            if not args.prompt: raise Exception("--prompt 必填")
            model = args.model or 'rhart-video-g'
            body = {'prompt': args.prompt, 'model': model}
            if args.images: body['image_urls'] = resolve_image_inputs(args.images, api_key)
            
            if model == 'rhart-video-g':
                body['aspect_ratio'] = args.aspect_ratio or '1:1'
                body['resolution'] = args.resolution or '720P'
                body['duration'] = args.duration or '6s'
            elif model == 'kling-v3.0-std':
                body['aspect_ratio'] = args.aspect_ratio or '16:9'
                body['duration'] = args.duration or '5'
                if args.negative_prompt: body['negative_prompt'] = args.negative_prompt
                if args.cfg_scale is not None: body['cfg_scale'] = args.cfg_scale
                if args.sound: body['sound'] = parse_boolean(args.sound)
                if args.multi_prompt: body['multi_prompt'] = json.loads(args.multi_prompt)
            
            result = request_api('POST', 'video', api_key, body)
            if args.wait and result.get('id'):
                result = wait_for_completion(lambda tid, key: request_api('GET', f'video/{tid}', key), result['id'], api_key, args)

        elif cmd in ('query', 'status'):
            if not args.id: raise Exception("--id 必填")
            def q(tid, key): return request_api('GET', f'gemini-edit/{tid}', key)
            result = wait_for_completion(q, args.id, api_key, args) if args.wait else q(args.id, api_key)

        elif cmd in ('video-query', 'video-status'):
            if not args.id: raise Exception("--id 必填")
            def qv(tid, key): return request_api('GET', f'video/{tid}', key)
            result = wait_for_completion(qv, args.id, api_key, args) if args.wait else qv(args.id, api_key)

        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
