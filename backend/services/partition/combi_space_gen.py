import json
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class MultiParameterSpaceGenerator:
    """使用 AI 为 API 参数间依赖关系生成多参数输入空间划分"""
    
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
    
    def generate_partition(
        self,
        api_id: int,
        parameters: Dict[str, List[Dict[str, Any]]],  # {query: [...], path: [...], headers: [...], body: [...]}
        dependencies: List[Dict[str, Any]],  # 参数间依赖关系
        single_partitions: List[Dict[str, Any]],  # 单参数划分结果
    ) -> Dict[str, Any]:
        """
        为 API 的参数间依赖关系生成多参数输入空间划分
        
        Args:
            api_id: API ID
            parameters: 参数列表按位置分类
            dependencies: 参数间依赖关系列表
            single_partitions: 单参数划分结果
            
        Returns:
            {
                "api_id": int,
                "spaces": [
                    {
                        "space_id": 0,
                        "space_name": "minimum_space",
                        "description": "包含所有必需参数的最小测试空间",
                        "subspaces": [
                            {
                                "description": "所有必需参数都有效",
                                "valid": {"param_name": "sample_value", ...},
                                "invalid": {}
                            },
                            {
                                "description": "必需参数违反约束",
                                "valid": {},
                                "invalid": {"param_name": "invalid_value", ...}
                            }
                        ]
                    },
                    {
                        "space_id": 1,
                        "space_name": "dependency_space_1",
                        "description": "测试参数互斥约束：param_a 和 param_b 不能同时存在",
                        "related_dependency": "dependency_1",
                        "subspaces": [
                            {
                                "description": "param_a 存在，param_b 不存在",
                                "valid": {"param_a": "value_a", "param_b": null},
                                "invalid": {"param_a": "value_a", "param_b": "value_b"}
                            },
                            ...
                        ]
                    },
                    {
                        "space_id": 2,
                        "space_name": "orphan_parameter_space",
                        "description": "测试不受约束的参数：param_c",
                        "parameters": ["param_c"],
                        "subspaces": [
                            {
                                "description": "param_c 不存在",
                                "valid": {"param_c": null},
                                "invalid": {}
                            },
                            {
                                "description": "param_c 存在",
                                "valid": {"param_c": "sample_value"},
                                "invalid": {}
                            }
                        ]
                    }
                ]
            }
        """
        # 收集依赖涉及的参数
        all_params = self._collect_all_parameters(parameters)
        related_param_pairs = self._extract_related_param_pairs(dependencies)
        orphan_params = self._find_orphan_parameters(all_params.keys(), dependencies)
        
        # 构建系统 prompt
        system_prompt = """
# 角色
你是一个资深的 API 自动化测试工程师，你最擅长使用黑盒测试中的等价类划分来生成测试用例，从而覆盖更广的用户输入情况。

# 任务
你的任务是为 API 的参数间依赖关系生成多参数输入空间划分。通过分析参数间的约束关系，
生成测试覆盖所有依赖约束和参数组合场景的测试空间。

# 多参数输入空间划分原则

每个空间代表一个特定的测试场景，包含满足特定约束关系的参数组合。
每个空间下可以有多个子空间，分别表示有效和无效的测试场景，子空间包含两种：
- **有效子空间 (Valid Subspace)**：满足依赖条件的参数组合
- **无效子空间 (Invalid Subspace)**：违反依赖条件的参数组合

## 空间结构
1. **Minimum Space（特殊第一个空间）**：
   - 包含所有必需强制参数的最小测试空间，且未关联任何依赖关系
   - 只需要包含一个有效子空间，提供所有必须参数列表

2. **Dependency Spaces（依赖空间）**：
   - 为每个参数间依赖关系创建一个空间
   - 按照依赖约束生成多个子空间，覆盖所有满足/违反约束的组合
   - 例如：互斥关系、必需关系、条件关系等

3. **Orphan Parameter Spaces（孤立参数空间）**：
   - 为不受任何约束的可选参数分别创建空间
   - 只存在有效子空间，参数存在和不存在均为有效子空间

## 依赖约束类型处理
例如：
- **互斥（Mutually Exclusive）**：两个或多个参数不能同时存在
  - 子空间：只有A、只有B、都没有、都有（invalid）
- **必需关系（Required Dependency）**：如果A存在，B必须存在
  - 子空间：A和B都有（valid）、只有A（invalid）、只有B（valid）、都没有（valid）
- **条件关系（Conditional）**：特定值的组合限制
  - 子空间：满足条件的组合、违反条件的组合

# 输出格式要求

## 完整的 JSON 结构（必须严格按照此格式）

输出必须是一个 JSON 对象，包含 spaces 数组：

```json
{
  "spaces": [
    {
      "space_id": 0,
      "space_name": "minimum_space",
      "description": "包含所有必需参数的最小测试空间",
      "parameter_list": [param_name_1, param_name_2, ...],
      "subspaces": [
        {
          "description": "所有必需参数都有效",
          "type": "valid",
          "parameter_list": [param_name_1, param_name_2, ...]
        }
      ]
    },
    {
      "space_id": 1,
      "space_name": "dependency_space_1",
      "description": "测试互斥约束：param_a 和 param_b 不能同时存在",
      "related_dependency": "constraint_name",
      "subspaces": [
        {
          "description": "只有 param_a 存在",
          "type": "valid",
          "parameter_list": ["param_a"]
        },
        {
          "description": "只有 param_b 存在",
          "type": "valid",
          "parameter_list": ["param_b"]
        },
        {
          "description": "两个都不存在",
          "type": "valid",
          "parameter_list": []
        },
        {
          "description": "两个都存在（违反互斥约束）",
          "type": "invalid",
          "parameter_list": ["param_a", "param_b"]
        }
      ]
    },
    {
      "space_id": 2,
      "space_name": "orphan_parameter_space",
      "description": "测试不受约束的可选参数：param_c",
      "parameters": ["param_c"],
      "subspaces": [
        {
          "description": "param_c 不存在",
          "type": "valid",
          "parameter_list": []
        },
        {
          "description": "param_c 存在",
          "type": "valid",
          "parameter_list": ["param_c"]
        }
      ]
    }
  ]
}
```

## 字段说明

### 顶层对象
- **spaces**: 数组，包含所有的参数空间

### 每个空间对象
- **space_id**: 整数，空间 ID，从 0 开始递增
- **space_name**: 字符串，空间名称，例如 "minimum_space", "dependency_space_1", "orphan_parameter_space" 等
- **description**: 字符串，描述这个空间的测试目的和包含的约束关系，以及对参数值的要求，例如param_a小于或等于100
- **related_dependency**: 字符串（可选），如果这个空间是针对某个依赖关系的，注明相关的依赖关系名称
- **parameter_list**: 数组，列出这个空间内涉及的参数列表（参数名字符串）
- **subspaces**: 数组，包含这个空间内的所有子空间

### 每个子空间对象
- **description**: 字符串，描述这个子空间的测试场景，例如 "只有 param_a 存在"、"param_name_1 缺失（必需参数）" 等
- **type**: 字符串，"valid" 或 "invalid"，表示这个子空间是有效的测试场景还是无效的测试场景
- **parameter_list**: 数组，列出这个子空间内涉及的参数列表（参数名字符串）

## 重要规则
- 每个空间必须至少包含一个子空间
- 每个子空间必须明确描述测试场景，并标明是 valid 还是 invalid
- 参数值只能使用 JSON 基本类型：字符串、数字、布尔值、null
"""
        
        user_message = f"""请根据以下参数和依赖关系，生成多参数输入空间划分：

参数列表（按位置分类）：
{json.dumps(all_params, indent=2, ensure_ascii=False)}

参数间依赖关系：
{json.dumps(dependencies, indent=2, ensure_ascii=False)}

单参数划分信息【供参考，用于生成示例值】：
{json.dumps(single_partitions, indent=2, ensure_ascii=False)}

依赖涉及的参数对：
{json.dumps(related_param_pairs, indent=2, ensure_ascii=False)}

不受任何约束的孤立参数：
{json.dumps(orphan_params, indent=2, ensure_ascii=False)}

# 输出要求
请严格按照上述 JSON 格式要求生成输出

**重要**：
- 输出必须是完整的、合法的 JSON
- 不要输出任何其他文本、说明或代码
- 所有参数值必须是实际的值，不能包含 repeat()、length 等代码
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,
            )
            
            content = response.choices[0].message.content.strip()
            
            # 预处理 JavaScript 模式
            content = self._preprocess_js_patterns(content)
            
            # 提取 JSON
            json_content = self._extract_json(content)
            if not json_content:
                raise ValueError("AI 响应不包含有效的 JSON")
            
            result = json.loads(json_content)
            
            # 期望格式：{"spaces": [...], ...} 或备选直接数组
            if isinstance(result, dict):
                if "spaces" in result:
                    # 已是正确格式
                    if "api_id" not in result:
                        result["api_id"] = api_id
                else:
                    # 可能是单个 space 对象误包装
                    result = {"spaces": [result], "api_id": api_id}
            elif isinstance(result, list):
                # AI 返回直接数组，包装成正确格式
                result = {"spaces": result, "api_id": api_id}
            else:
                raise ValueError(f"AI 响应格式不符：期望对象或数组，获得 {type(result)}")
            
            print(f"✅ 成功生成多参数输入空间划分，API ID: {api_id}")
            print(f"生成的空间划分 {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            return result
            
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON 解析失败: {e}\n响应内容: {content}")
        except Exception as e:
            raise RuntimeError(f"AI 生成多参数输入空间失败: {e}")
    
    def _collect_all_parameters(self, parameters: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, Any]]:
        """收集所有参数信息，返回以参数名为 key 的字典"""
        result = {}
        
        for param_type, params_list in parameters.items():
            if params_list:
                for param in params_list:
                    param_name = param.get("name")
                    if param_name:
                        result[param_name] = {
                            "name": param_name,
                            "type": param.get("type", "string"),
                            "location": param_type,
                            "required": param.get("required", False),
                            "description": param.get("description", ""),
                        }
        
        return result
    
    def _extract_related_param_pairs(self, dependencies: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """从依赖关系中提取相关参数对"""
        result = {}
        
        for i, dep in enumerate(dependencies):
            dep_name = dep.get("name", f"dependency_{i}")
            params = dep.get("parameters", [])
            
            if params:
                # 提取参数名
                param_names = []
                for p in params:
                    if isinstance(p, dict):
                        param_names.append(p.get("name", ""))
                    else:
                        param_names.append(str(p))
                
                result[dep_name] = [p for p in param_names if p]
        
        return result
    
    def _find_orphan_parameters(self, all_param_names: set, dependencies: List[Dict[str, Any]]) -> List[str]:
        """找出不受任何约束的孤立参数"""
        related_params = set()
        
        for dep in dependencies:
            params = dep.get("parameters", [])
            for p in params:
                if isinstance(p, dict):
                    related_params.add(p.get("name", ""))
                else:
                    related_params.add(str(p))
        
        orphan = list(all_param_names - related_params)
        return sorted(orphan)
    
    def _preprocess_js_patterns(self, content: str) -> str:
        """预处理 AI 响应中可能出现的 JavaScript 语法模式"""
        import re
        
        def replace_repeat(match):
            try:
                char_part = match.group(1)
                count = int(match.group(2))
                
                if count > 100:
                    if len(char_part) == 1:
                        display = f'{char_part * min(10, count)}...({count}个字符)'
                    else:
                        display = f'{char_part * 2}...({count}次)'
                    return f'"{display}"'
                else:
                    repeated = char_part * count
                    return f'"{repeated}"'
            except Exception:
                return match.group(0)
        
        # 匹配 "...".repeat(n) 模式
        content = re.sub(
            r'"([^"\\]*(?:\\.[^"\\]*)*)"\s*\.\s*repeat\s*\(\s*(\d+)\s*\)',
            replace_repeat,
            content,
            flags=re.DOTALL
        )
        
        return content
    
    def _extract_json(self, content: str) -> Optional[str]:
        """从文本中提取 JSON 内容"""
        # 移除 markdown 代码块标记
        content = content.replace("```json\n", "").replace("```json", "").replace("```\n", "").replace("```", "")
        
        # 尝试找到 { 和 }
        start_idx = content.find("{")
        end_idx = content.rfind("}")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = content[start_idx:end_idx + 1]
            return self._fix_json_string(json_str)
        
        # 如果没找到对象，尝试找数组
        start_idx = content.find("[")
        end_idx = content.rfind("]")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = content[start_idx:end_idx + 1]
            return self._fix_json_string(json_str)
        
        return None
    
    def _fix_json_string(self, json_str: str) -> str:
        """修复 JSON 字符串中的常见问题（换行符等）"""
        result = []
        i = 0
        in_string = False
        escape_next = False
        
        while i < len(json_str):
            char = json_str[i]
            
            if escape_next:
                result.append(char)
                escape_next = False
                i += 1
                continue
            
            if char == '\\' and in_string:
                result.append(char)
                escape_next = True
                i += 1
                continue
            
            if char == '"':
                in_string = not in_string
                result.append(char)
                i += 1
                continue
            
            # 如果在字符串中遇到换行或回车，转换为 \n
            if in_string and char in '\n\r':
                result.append('\\')
                result.append('n')
                i += 1
                continue
            
            result.append(char)
            i += 1
        
        return ''.join(result)


# 辅助函数
def generate_multi_parameter_partition(
    api_id: int,
    parameters: Dict[str, List[Dict[str, Any]]],
    dependencies: List[Dict[str, Any]],
    single_partitions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    生成多参数输入空间划分的辅助函数
    """
    generator = MultiParameterSpaceGenerator()
    return generator.generate_partition(
        api_id=api_id,
        parameters=parameters,
        dependencies=dependencies,
        single_partitions=single_partitions,
    )
