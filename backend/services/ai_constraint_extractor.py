import json
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class ConstraintExtractor:
    """使用 AI 从 API 文档中提取参数约束"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 未在 .env 中设置")
        
        api_base = os.getenv("OPENAI_API_BASE")
        if api_base:
            self.client = OpenAI(api_key=api_key, base_url=api_base)
        else:
            self.client = OpenAI(api_key=api_key)
        
        self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo")
    
    def extract_single_constraints_from_swagger(
        self, 
        swagger_operation: Dict[str, Any], 
        user_prompt: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        从 Swagger/OpenAPI 操作定义中提取单参数约束
        
        Args:
            swagger_operation: Swagger 操作对象（包含 parameters, requestBody 等）
            user_prompt: 用户提供的额外约束需求描述
            
        Returns:
            单参数约束列表，每个约束包含：
            {
                "parameter_name": str,
                "location": str,  # query, path, header, body
                "constraint": str
            }
        """
        # 收集所有参数信息
        parameters_info = self._extract_parameters_info(swagger_operation)
        
        # 构建 prompt
        system_prompt = """你是一个API测试专家。请从给定的API参数定义中提取参数约束。

输出格式必须是JSON数组，每个元素包含：
- parameter_name: 参数名称
- location: 参数位置(query/path/header/body)
- constraint: 参数约束的自然语言描述

示例输出格式：
[
  {"parameter_name": "id", "location": "query", "constraint": "必填，正整数"},
  {"parameter_name": "name", "location": "body", "constraint": "字符串，长度1-100"}
]

只输出JSON数组，不要有其他文本。"""
        
        user_message = f"""请从以下参数定义中提取单参数约束：

{json.dumps(parameters_info, indent=2, ensure_ascii=False)}

输出JSON数组，不要有任何其他内容。"""
        
        if user_prompt:
            user_message += f"\n\n额外要求：{user_prompt}"
        
        # 调用 OpenAI API
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.0,  # 降低温度以获得更稳定的结果
                top_p=0.9,
                max_tokens=20480
            )
            # print(f"AI 原始响应: {response.choices[0].message}")
            
            # 解析响应
            response_text = response.choices[0].message.content.strip()
            # print(f"AI 原始响应: {response_text}")
            # 尝试提取 JSON
            try:
                constraints = json.loads(response_text)
                print(f"debug constraints: {json.dumps(constraints, indent=2, ensure_ascii=False)}")
            except json.JSONDecodeError:
                # 如果直接解析失败，尝试提取 JSON 块
                import re
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    constraints = json.loads(json_match.group())
                else:
                    raise ValueError("无法从 AI 响应中提取有效的 JSON")
            
            # 验证输出格式
            if not isinstance(constraints, list):
                constraints = [constraints] if isinstance(constraints, dict) else []
            
            # 验证每个约束的必要字段
            validated_constraints = {}
            for constraint in constraints:
                if isinstance(constraint, dict) and all(key in constraint for key in ["parameter_name", "location", "constraint"]):
                    # 验证 location 值
                    if constraint["location"] in ["query", "path", "header", "body"]:
                        param_name = str(constraint["parameter_name"]).strip()
                        validated_constraints[param_name] = {
                            "parameter_name": param_name,
                            "location": constraint["location"],
                            "constraint": str(constraint["constraint"]).strip()
                        }
            
            return validated_constraints


            
        except Exception as e:
            raise RuntimeError(f"AI 约束提取失败：{str(e)}")
    
    def _extract_parameters_info(self, swagger_operation: Dict[str, Any]) -> Dict[str, Any]:
        """从 Swagger 操作中提取参数信息"""
        params_info = {
            "query": [],
            "path": [],
            "header": [],
            "body": []
        }
        
        # 处理 parameters 字段（query, path, header）
        if "parameters" in swagger_operation:
            for param in swagger_operation["parameters"]:
                param_location = param.get("in", "query")  # 默认为 query
                param_info = {
                    "name": param.get("name", ""),
                    "required": param.get("required", False),
                    "type": param.get("schema", {}).get("type", "string") if "schema" in param else param.get("type", "string"),
                    "description": param.get("description", ""),
                }
                
                # 添加额外的约束相关信息
                if "schema" in param:
                    schema = param["schema"]
                    if "minimum" in schema:
                        param_info["minimum"] = schema["minimum"]
                    if "maximum" in schema:
                        param_info["maximum"] = schema["maximum"]
                    if "minLength" in schema:
                        param_info["minLength"] = schema["minLength"]
                    if "maxLength" in schema:
                        param_info["maxLength"] = schema["maxLength"]
                    if "enum" in schema:
                        param_info["enum"] = schema["enum"]
                    if "pattern" in schema:
                        param_info["pattern"] = schema["pattern"]
                
                params_info[param_location].append(param_info)
        
        # 处理 requestBody（body 参数）
        if "requestBody" in swagger_operation:
            request_body = swagger_operation["requestBody"]
            if request_body is not None:
                required = request_body.get("required", False)
                
                if "content" in request_body:
                    for media_type, content_info in request_body["content"].items():
                        if "schema" in content_info:
                            schema = content_info["schema"]
                            body_info = {
                                "name": "requestBody",
                                "required": required,
                                "type": schema.get("type", "object"),
                                "description": schema.get("description", ""),
                                "properties": schema.get("properties", {})
                            }
                            params_info["body"].append(body_info)
        
        return params_info


    def extract_parameter_dependencies(self, swagger_operation: Dict[str, Any], project_id=None, api_id=None, db=None) -> List[Dict[str, Any]]:
        """
        使用 AI 从 API 文档中提取参数间的依赖关系

        Args:
            swagger_operation: Swagger 操作对象（包含 parameters, requestBody 等）
            project_id: 项目 ID（用于数据库查询）
            api_id: API ID（用于数据库查询）
            db: 数据库会话（用于查询 ApiRequestBody）

        Returns:
            参数依赖关系列表，每个依赖关系遵循 Dependency 模型：
            {
                "name": "依赖类型",
                "parameters": [{"name": "参数名", "location": "query|path|header|body"}, ...],
                "constraint": "依赖关系的描述"
            }
        """
        # 构建参数名称到 location 的映射（从数据库获取）
        param_location_map = {}
        
        if api_id and db:
            try:
                from database import Api, ApiRequestBody
                
                # 根据 api_id 查询 API 对象
                api = db.query(Api).filter(Api.id == api_id).first()
                
                if api:
                    # 从数据库中获取 query 参数
                    if api.query_params:
                        for param in api.query_params:
                            param_location_map[param.get("name", "")] = "query"
                    
                    # 从数据库中获取 path 参数
                    if api.path_params:
                        for param in api.path_params:
                            param_location_map[param.get("name", "")] = "path"
                    
                    # 从数据库中获取 header 参数
                    if api.headers_params:
                        for param in api.headers_params:
                            param_location_map[param.get("name", "")] = "header"
                    
                    # 从数据库中获取 body 参数
                    request_bodies = db.query(ApiRequestBody).filter(ApiRequestBody.api_id == api_id).all()
                    if request_bodies:
                        rb = request_bodies[0] 
                        if rb.media_type == "application/x-www-form-urlencoded":
                            for param in rb.body_params:
                                param_location_map[param.get("name", "")] = "body"
                            
            except Exception:
                pass
        else:
            # 如果没有提供 api 和 db，回退到从 swagger_operation 中提取
            parameters_info = self._extract_parameters_info(swagger_operation)
            for location, params in parameters_info.items():
                for param in params:
                    param_location_map[param["name"]] = location
        
        # 构建 prompt
        system_prompt = """
# 角色
你是一个资深 REST API 测试工程师，擅长分析 API 参数之间的关系

# 任务
根据提供的 OpenAPI 操作定义，识别参数之间的**所有可能的依赖关系或约束**

# 依赖关系类型
- 一个参数需要与另一个参数配合使用
- 多个参数中至少需要一个
- 多个参数要么全部出现，要么都不出现
- 多个参数中最多只能选一个
- 多个参数中必须选一个且仅一个
- 参数之间的其他复杂关系，可以用自然语言描述

# 分析角度
1. 根据参数的描述信息推断关联关系（如果description提到"与某参数配合"）
2. 根据参数的含义推断逻辑关系（如enable/disable通常互斥）
3. 根据参数的必填情况分析（可选参数之间可能有条件关系）
4. 从API的业务逻辑推断参数依赖

# 输出格式
输出必须是有效的JSON数组。如果没有找到依赖关系，返回空数组[]。

每个依赖关系对象的格式：
{
    "type": "参数依赖类型",
    "parameter_names": ["参数1", "参数2"],
    "description": "依赖关系的描述和原因"
}
"""

        user_message = f"""请根据以下OpenAPI操作定义，分析参数间的依赖关系：

{json.dumps(swagger_operation, indent=2, ensure_ascii=False)}

请严格按JSON数组格式输出依赖关系，使用中文表述，不要输出其他内容。"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.0,
                top_p=0.9,
                max_tokens=20480
            )

            response_text = response.choices[0].message.content
            print(f"debug: dependency AI 原始响应: {response_text}")
            # 解析 JSON
            try:
                dependencies = json.loads(response_text)
            except json.JSONDecodeError:
                # 尝试提取 JSON 块
                import re
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                dependencies = json.loads(json_match.group()) if json_match else []

            # 转换为 Dependency 模型格式
            validated_deps = []
            # print(param_location_map)
            if isinstance(dependencies, list):
                for dep in dependencies:
                    if not isinstance(dep, dict):
                        continue
                    
                    param_names = dep.get("parameter_names", []) or dep.get("parameters", [])
                    if not param_names:
                        continue
                    
                    # 构建参数对象列表（包含名称和位置）
                    parameters = []
                    for param_name in param_names:
                        param_name = str(param_name).strip()
                        if param_name in param_location_map:
                            parameters.append({
                                "name": param_name,
                                "location": param_location_map[param_name]
                            })
                    
                    if parameters:  # 只有当有有效参数时才添加
                        validated_deps.append({
                            "name": str(dep.get("type", "Dependency")).strip(),
                            "parameters": parameters,
                            "constraint": str(dep.get("description", "")).strip()
                        })
            
            return validated_deps

        except Exception as e:
            # 提取失败返回空列表
            return []



    def infer_constraints_from_logic(self, swagger_operation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        基于 API 的逻辑功能推断隐含的参数约束。

        Args:
            swagger_operation: Swagger 操作对象（包含 operationId, parameters 等）

        Returns:
            推断出的参数约束列表，每个约束包含：
            {
                "parameter_name": str,
                "location": str,  # query, path, header, body
                "constraint": str
            }
        """
        inferred_constraints = []
        operation_id = swagger_operation.get("operationId", "").lower()
        parameters_info = self._extract_parameters_info(swagger_operation)

        # 示例：如果是删除操作，可能需要 id 参数为必填
        if "delete" in operation_id:
            for location, params in parameters_info.items():
                for param in params:
                    if param["name"].lower() == "id":
                        inferred_constraints.append({
                            "parameter_name": param["name"],
                            "location": location,
                            "constraint": "删除操作需要提供 id 参数"
                        })

        # 示例：如果是创建操作，可能需要所有必填字段
        if "create" in operation_id:
            for location, params in parameters_info.items():
                for param in params:
                    if param.get("required", False):
                        inferred_constraints.append({
                            "parameter_name": param["name"],
                            "location": location,
                            "constraint": "创建操作需要提供此必填参数"
                        })

        return inferred_constraints


# 全局实例
_extractor = None

def get_extractor() -> ConstraintExtractor:
    """获取全局的约束提取器实例"""
    global _extractor
    if _extractor is None:
        _extractor = ConstraintExtractor()
    return _extractor
