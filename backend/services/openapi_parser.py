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
        API 列表，每个API包含: name, method, url, description, parameters, swagger_doc, service_name, service_description
    """
    apis = []
    
    # 提取服务名称和描述
    service_info = spec.get('info', {})
    service_name = service_info.get('title', '')
    service_description = service_info.get('description', '')
    
    if 'paths' not in spec:
        return apis
    
    paths = spec.get('paths', {})
    
    for path, path_item in paths.items():
        # 路径级别的参数（会被所有operation继承）
        path_level_params = path_item.get('parameters', [])
        
        # 处理每个HTTP方法
        for method in ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']:
            if method not in path_item:
                continue
            
            operation = path_item[method]
            
            # 提取操作ID作为API名称，或使用summary
            api_name = operation.get('operationId') or operation.get('summary') or f'{method.upper()} {path}'
            
            # 合并路径级别参数和操作级别参数
            operation_params = operation.get('parameters', [])
            all_params = path_level_params + operation_params
            
            # 解析parameters
            headers, query_params, path_params = _parse_parameters(all_params)
            
            # 解析所有可能的 requestBody content-types
            request_bodies = _parse_all_request_bodies(operation)
            
            # 提取 x-dependencies
            x_dependencies = operation.get('x-dependencies', [])
            
            api_info = {
                'name': api_name,
                'method': method.upper(),
                'url': path,
                'description': operation.get('description', ''),
                'parameters': {
                    'headers': headers,
                    'query': query_params,
                    'path': path_params,
                },
                'request_bodies': request_bodies,
                'x-dependencies': x_dependencies,
                # 新增：保存完整的 operation 定义
                'swagger_doc': operation,
                'service_name': service_name,
                'service_description': service_description,
            }
            
            apis.append(api_info)
    
    return apis


def _parse_parameters(params: List[Dict[str, Any]]) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    解析OpenAPI参数列表，分离为headers, query, path三类
    
    Args:
        params: OpenAPI parameters列表
    
    Returns:
        (headers, query_params, path_params) 三个列表
    """
    headers = []
    query_params = []
    path_params = []
    
    for param in params:
        param_in = param.get('in', '')
        param_name = param.get('name', '')
        param_description = param.get('description', '')
        param_required = param.get('required', False)
        
        # 从schema中提取类型信息
        schema = param.get('schema', {})
        param_type = schema.get('type', 'string')
        
        param_info = {
            'name': param_name,
            'type': param_type,
            'description': param_description,
            'required': param_required,
        }
        
        if param_in == 'header':
            headers.append(param_info)
        elif param_in == 'query':
            query_params.append(param_info)
        elif param_in == 'path':
            path_params.append(param_info)
    
    return headers, query_params, path_params


def _parse_all_request_bodies(operation: Dict[str, Any]) -> List[Dict]:
    """
    解析requestBody中的所有content-types（json, xml, form等）
    
    Args:
        operation: OpenAPI operation对象
    
    Returns:
        request_bodies列表，每个元素包含 media_type 和 body_params
    """
    request_bodies = []
    
    request_body = operation.get('requestBody', {})
    if not request_body:
        return request_bodies
    
    content = request_body.get('content', {})
    if not content:
        return request_bodies
    
    # 支持的 content-types
    supported_types = [
        'application/json',
        'application/xml',
        'application/x-www-form-urlencoded',
    ]
    
    is_first = True  # 第一个为默认
    
    for media_type in supported_types:
        media_content = content.get(media_type)
        if not media_content:
            continue
        
        body_params = []
        
        # 对于 form-urlencoded，解析 properties
        if media_type == 'application/x-www-form-urlencoded':
            schema = media_content.get('schema', {})
            properties = schema.get('properties', {})
            required_fields = schema.get('required', [])
            
            # 如果properties为空，可能schema本身就是properties definition
            if not properties and 'type' in schema and schema['type'] == 'object':
                # 尝试从items或其他字段获取
                pass
            
            for field_name, field_schema in properties.items():
                field_type = field_schema.get('type', 'string')
                field_description = field_schema.get('description', '')
                field_required = field_name in required_fields
                
                body_params.append({
                    'name': field_name,
                    'type': field_type,
                    'description': field_description,
                    'required': field_required,
                })
        
        # 对于 json 和 xml，可以存储 schema 信息或示例
        elif media_type in ['application/json', 'application/xml']:
            schema = media_content.get('schema', {})
            # 简单起见，可以存储 schema 的基本类型信息
            if schema:
                schema_type = schema.get('type', 'object')
                schema_description = schema.get('description', '')
                body_params.append({
                    'name': media_type,
                    'type': schema_type,
                    'description': schema_description,
                    'required': request_body.get('required', False),
                })
        
        request_bodies.append({
            'media_type': media_type,
            'body_params': body_params,
            'is_default': 1 if is_first else 0,
        })
        is_first = False
    
    return request_bodies


def _parse_request_body(operation: Dict[str, Any]) -> List[Dict]:
    """
    解析requestBody中的body参数
    
    Args:
        operation: OpenAPI operation对象
    
    Returns:
        body参数列表
    """
    form_params = []
    
    request_body = operation.get('requestBody', {})
    if not request_body:
        return form_params
    
    content = request_body.get('content', {})
    
    # 查找 application/x-www-form-urlencoded 内容
    form_content = content.get('application/x-www-form-urlencoded', {})
    if not form_content:
        return form_params
    
    schema = form_content.get('schema', {})
    properties = schema.get('properties', {})
    required_fields = schema.get('required', [])
    
    for field_name, field_schema in properties.items():
        field_type = field_schema.get('type', 'string')
        field_description = field_schema.get('description', '')
        field_required = field_name in required_fields
        
        form_params.append({
            'name': field_name,
            'type': field_type,
            'description': field_description,
            'required': field_required,
        })
    
    return form_params


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
