#!/usr/bin/env python3
"""
HTTP Request Debug Script
用于测试和调试HTTP请求，支持自定义URL、headers、body等参数
"""
import requests
import json
from typing import Dict, Any, Optional

# ============ 配置参数 ============
# 修改这些参数来测试不同的请求

URL = "http://121.89.93.109:49981/v2/check"

METHOD = "POST"  # GET, POST, PUT, DELETE, PATCH

HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    # "Authorization": "Bearer token_here",
    # "Custom-Header": "custom-value",
}

QUERY_PARAMS = {
    # "param1": "value1",
    # "param2": "value2",
}

BODY = {
    "language": "en-US",
    "text": "The quick brown fox jumps over the lazy dog",
    "enabledOnly": True,
}

TIMEOUT = 30  # 请求超时时间（秒）

# ============ 调试选项 ============
PRINT_REQUEST = True  # 打印请求详情
PRINT_RESPONSE = True  # 打印响应详情
FORMAT_JSON = True  # 格式化JSON输出


def print_section(title: str):
    """打印分隔符"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_request_details(method: str, url: str, headers: Dict, params: Dict, body: Any):
    """打印请求详情"""
    print_section("📤 请求详情")
    
    print(f"Method:  {method}")
    print(f"URL:     {url}")
    
    if params:
        print(f"\nQuery Parameters:")
        for key, value in params.items():
            print(f"  {key}: {value}")
    
    if headers:
        print(f"\nHeaders:")
        for key, value in headers.items():
            print(f"  {key}: {value}")
    
    if body:
        print(f"\nBody:")
        if isinstance(body, dict):
            print(json.dumps(body, indent=2, ensure_ascii=False))
        else:
            print(body)


def print_response_details(response: requests.Response):
    """打印响应详情"""
    print_section("📥 响应详情")
    
    print(f"Status Code: {response.status_code}")
    
    print(f"\nResponse Headers:")
    for key, value in response.headers.items():
        print(f"  {key}: {value}")
    
    print(f"\nResponse Body:")
    try:
        # 尝试解析为JSON
        response_json = response.json()
        if FORMAT_JSON:
            print(json.dumps(response_json, indent=2, ensure_ascii=False))
        else:
            print(response_json)
    except:
        # 如果不是JSON，直接打印文本
        print(response.text[:500])  # 限制长度
    
    print(f"\nResponse Time: {response.elapsed.total_seconds():.3f}s")


def make_request(method: str, url: str, headers: Optional[Dict] = None, 
                params: Optional[Dict] = None, json_body: Optional[Dict] = None,
                data_body: Optional[Dict] = None, timeout: int = 30) -> requests.Response:
    """
    发送HTTP请求
    
    Args:
        method: HTTP方法 (GET, POST, PUT, DELETE, PATCH)
        url: 请求URL
        headers: 请求头
        params: 查询参数
        json_body: JSON格式的请求体
        data_body: 字符串格式的请求体
        timeout: 超时时间
    
    Returns:
        Response对象
    """
    headers = headers or {}
    params = params or {}
    
    print(f"\n⏳ 正在发送 {method} 请求...")
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=timeout)
        
        elif method.upper() == "POST":
            response = requests.post(
                url,
                headers=headers,
                params=params,
                json=json_body if json_body else None,
                data=data_body if data_body else None,
                timeout=timeout
            )
        
        elif method.upper() == "PUT":
            response = requests.put(
                url,
                headers=headers,
                params=params,
                json=json_body if json_body else None,
                data=data_body if data_body else None,
                timeout=timeout
            )
        
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, params=params, timeout=timeout)
        
        elif method.upper() == "PATCH":
            response = requests.patch(
                url,
                headers=headers,
                params=params,
                json=json_body if json_body else None,
                data=data_body if data_body else None,
                timeout=timeout
            )
        
        else:
            raise ValueError(f"不支持的HTTP方法: {method}")
        
        return response
    
    except requests.exceptions.Timeout:
        print(f"❌ 请求超时 (超过 {timeout}s)")
        raise
    except requests.exceptions.ConnectionError:
        print(f"❌ 连接失败，无法访问 {url}")
        raise
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        raise


def main():
    """主函数"""
    print_section("🚀 HTTP Request Debug Tool")
    
    try:
        # 打印请求详情
        if PRINT_REQUEST:
            print_request_details(METHOD, URL, HEADERS, QUERY_PARAMS, BODY)
        
        # 根据Content-Type判断使用json还是data
        content_type = HEADERS.get("Content-Type", "").lower()
        is_form_urlencoded = "application/x-www-form-urlencoded" in content_type
        
        # 发送请求
        response = make_request(
            method=METHOD,
            url=URL,
            headers=HEADERS,
            params=QUERY_PARAMS,
            json_body=BODY if not is_form_urlencoded and isinstance(BODY, dict) else None,
            data_body=BODY if is_form_urlencoded else None,
            timeout=TIMEOUT
        )
        
        # 打印响应详情
        if PRINT_RESPONSE:
            print_response_details(response)
        
        print_section("✅ 请求完成")
        
        return response
    
    except Exception as e:
        print_section("❌ 请求失败")
        print(f"错误: {e}")
        return None


if __name__ == "__main__":
    main()
