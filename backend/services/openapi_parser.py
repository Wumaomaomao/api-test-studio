"""
OpenAPI 文档解析模块
处理 OpenAPI 3.0+ JSON/YAML 文档的解析
"""

import json
import yaml
from typing import Dict, List, Any, Tuple


def parse_openapi(content: str, file_format: str = 'json') -> Dict[str, Any]:
    """
    解析 OpenAPI 文档内容
    
    Args:
        content: 文件内容字符串
        file_format: 'json' 或 'yaml'
    
    Returns:
        解析后的OpenAPI字典
    """
    try:
        if file_format == 'json':
            spec = json.loads(content)
        else:  # yaml
            spec = yaml.safe_load(content)
        return spec
    except Exception as e:
        raise ValueError(f"解析文件失败: {str(e)}")


def extract_apis_from_openapi(spec: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    从 OpenAPI 规范中提取 API 列表
    
    Args:
        spec: OpenAPI 规范字典
    
    Returns:
        API 列表，每个API包含: name, method, url, description
    """
    apis = []
    
    if 'paths' not in spec:
        return apis
    
    paths = spec.get('paths', {})
    
    for path, path_item in paths.items():
        # 处理每个HTTP方法
        for method in ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']:
            if method not in path_item:
                continue
            
            operation = path_item[method]
            
            # 提取操作ID作为API名称，或使用summary
            api_name = operation.get('operationId') or operation.get('summary') or f'{method.upper()} {path}'
            
            api_info = {
                'name': api_name,
                'method': method.upper(),
                'url': path,
                'description': operation.get('description', ''),
            }
            
            apis.append(api_info)
    
    return apis


def extract_project_info(spec: Dict[str, Any]) -> Dict[str, str]:
    """
    从 OpenAPI 规范中提取项目基本信息
    
    Args:
        spec: OpenAPI 规范字典
    
    Returns:
        项目信息字典，包含: name, description, base_url
    """
    info = spec.get('info', {})
    servers = spec.get('servers', [])
    
    # 获取项目名称和描述
    project_name = info.get('title', 'Imported Project')
    project_description = info.get('description', '')
    
    # 获取基础URL（第一个server的url）
    base_url = ''
    if servers and len(servers) > 0:
        base_url = servers[0].get('url', '')
    
    return {
        'name': project_name,
        'description': project_description,
        'base_url': base_url,
    }
