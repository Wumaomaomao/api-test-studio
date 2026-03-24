import json
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class MixedSpaceGenerator:
    """生成多参数空间，并关联单参数空间信息"""
    
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
        multi_parameter_spaces: List[Dict[str, Any]],
        single_parameter_spaces: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        为已提取的多参数空间关联单参数空间的分类信息
        
        Args:
            api_id: API ID
            multi_parameter_spaces: 已提取的多参数输入空间列表
            single_parameter_spaces: 单参数空间 {param_name: [categories...]}
            
        Returns:
            {
                "api_id": int,
                "multi_parameter_spaces": [
                    {
                        "space_id": 0,
                        "space_name": "minimum_space",
                        "description": "...",
                        "parameter_list": ["param_1", "param_2"],
                        "subspaces": [
                            {
                                "description": "...",
                                "type": "valid",
                                "parameter_list": ["param_1", "param_2"],
                                "single_parameter_spaces": {
                                    "param_1": {
                                        "category_name": "来自单参数空间的分类",
                                        "description": "...",
                                        "type": "valid"
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        """
        self.single_parameter_spaces = single_parameter_spaces or {}
        
        # 构建系统 prompt
        system_prompt = """
# 角色
你是一个资深的 API 自动化测试工程师, 你最擅长使用黑盒测试中的等价类划分来生成测试用例，从而覆盖更广的用户输入情况。

# 任务
你需要为已提取的多参数输入空间关联单参数空间的分类信息, 帮助后续的测试用例生成。
- 输入：多参数空间（包含参数组合关系）+ 单参数空间（每个参数的等价类分类）
- 输出：混合空间（多参数空间 + 每个参数指向具体的单参数分类）

# 输出格式

输出必须是一个 JSON 数组（直接从 `[` 开始，不要包裹在对象中），格式如下：

```json
[
  {
    "space_id": 0,
    "space_name": "minimum_space",
    "description": "包含所有必需参数的最小测试空间",
    "parameter_list": ["param_1", "param_2"],
    "subspaces": [
      {
        "description": "所有必需参数都有效",
        "type": "valid",
        "parameter_list": ["param_1", "param_2"],
        "single_parameter_spaces": {
          "param_1": [
            {
              "category_name": "来自单参数空间的分类名",
              "description": "该分类的描述",
              "type": "valid"
            },
            {
              "category_name": "来自单参数空间的另一个分类名",
              "description": "该分类的描述",
              "type": "valid"
            },
            {
              "category_name": "来自单参数空间的第三个分类名",
              "description": "该分类的描述",
              "type": "invalid"
            }
          ],
          "param_2": [
            {
              "category_name": "来自单参数空间的分类名",
              "description": "该分类的描述",
              "type": "valid"
            },
            {
              "category_name": "来自单参数空间的另一个分类名",
              "description": "该分类的描述",
              "type": "valid"
            }
          ]
        }
      }
    ]
  }
]
```

# 关键规则

1. **输出格式**：输出是一个数组，不要包裹在对象中，直接从 `[` 开始。
2. **多参数空间结构**：保留原有的 space_id、space_name、description、parameter_list 和 subspaces。
3. **子空间关联**：对于每个子空间，根据其测试场景（type = "valid" 或 "invalid"），为每个参数选择合适的单参数空间分类。
4. **单参数分类映射**：single_parameter_spaces 中的每个参数，其值应该是一个**数组**，包含该参数在此子空间中对应的单参数空间分类。
5. **分类对象结构**：数组中的每个分类对象包含 category_name、description 和 type。
6. **type 一致性**：
   - 如果子空间 type="valid"，参数应选择符合约束的所有分类，也可以包含invalid分类
   - 如果子空间 type="invalid"，至少一个参数应选择至少一个invalid分类，但也可以包含valid分类
6. **完整覆盖**：single_parameter_spaces 中必须包含该子空间 parameter_list 中的所有参数。
"""
        
        user_message = f"""请为以下已提取的多参数输入空间关联单参数空间的分类信息：

# 已提取的多参数输入空间（需要补全分类信息）
{json.dumps(multi_parameter_spaces, indent=2, ensure_ascii=False)}

# 单参数输入空间分类（作为选择目标）
{json.dumps(self.single_parameter_spaces, indent=2, ensure_ascii=False)}

# 处理指南

1. **理解多参数空间**：每个空间包含多个子空间，每个子空间定义了参数的组合关系。
2. **映射单参数分类**：对于每个子空间中的每个参数，从单参数空间中选择一个或多个适当的分类。
3. **数组结构**：single_parameter_spaces 中每个参数对应一个**分类数组**，包含在此子空间中选中的分类。
4. **type 一致性**：
   - 如果子空间 type="valid"，参数应选择其对应的 "valid" 分类
   - 如果子空间 type="invalid"，至少一个参数应选择 "invalid" 分类
5. **完整性**：single_parameter_spaces 中必须包含该子空间的所有参数。

# 输出要求（严格遵守，不要偏离）
- 输出ONLY JSON数组，不要任何其他文本、说明、换行、注释
- 数组直接从 `[` 开始，从 `]` 结束
- 不要在 JSON 前后添加任何内容（不要 Markdown 代码块 ```）
- 不要包裹在对象中
- 保留原有多参数空间的结构（space_id、space_name、description、parameter_list）
- 为每个子空间的 single_parameter_spaces 补全参数分类映射，每个参数的值是一个数组
- 输出必须是完整有效的 JSON，可以被 JSON.parse() 直接解析
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.0,
            )
            
            content = response.choices[0].message.content.strip()
            
            # 预处理 JavaScript 模式
            content = self._preprocess_js_patterns(content)
            
            # 提取 JSON
            json_content = self._extract_json(content)
            if not json_content:
                # 调试：显示原始内容的前500字符
                debug_content = content[:500] if len(content) > 500 else content
                raise ValueError(f"AI 响应不包含有效的 JSON\n原始响应前500字: {debug_content}")
            
            try:
                result = json.loads(json_content)
            except json.JSONDecodeError as e:
                # 如果直接解析失败，尝试修复
                print(f"⚠️  JSON 解析失败，尝试修复: {e}")
                # 显示JSON内容的长度和前后信息
                debug_info = f"\nJSON长度: {len(json_content)}\nJSON开头: {json_content[:100]}\nJSON结尾: {json_content[-100:]}"
                raise ValueError(f"JSON 解析失败: {e}{debug_info}")
            
            # prompt 要求输出直接是 JSON 数组，或者包在 multi_parameter_spaces 对象中
            if isinstance(result, list):
                # 直接是数组
                result_array = result
            elif isinstance(result, dict) and "multi_parameter_spaces" in result:
                # 包裹在对象中
                if isinstance(result["multi_parameter_spaces"], list):
                    result_array = result["multi_parameter_spaces"]
                else:
                    raise ValueError(f"multi_parameter_spaces 应为数组，获得 {type(result['multi_parameter_spaces'])}")
            else:
                raise ValueError(f"AI 响应格式不符：期望数组或包含 multi_parameter_spaces 的对象，获得 {type(result)}")
            
            # 包装成最终格式返回
            return_result = {"api_id": api_id, "multi_parameter_spaces": result_array}
            
            print(f"✅ 成功生成多参数输入空间划分，API ID: {api_id}，数组长度: {len(result)}")
            
            return return_result
            
        except json.JSONDecodeError as e:
            # 这个异常不应该再出现，因为我们在上面处理了
            raise ValueError(f"JSON 解析失败 (不应该到这里): {e}")
        except ValueError as e:
            # 重新抛出ValueError，包含最多500字的原始响应
            raise e
        except Exception as e:
            raise RuntimeError(f"AI 生成多参数空间失败: {e}")
    
    def _collect_all_parameters(self, parameters: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, Any]]:
        """收集所有参数信息"""
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
    
    def _preprocess_js_patterns(self, content: str) -> str:
        """预处理 JavaScript 语法模式"""
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
        
        content = re.sub(
            r'"([^"\\]*(?:\\.[^"\\]*)*)"\s*\.\s*repeat\s*\(\s*(\d+)\s*\)',
            replace_repeat,
            content,
            flags=re.DOTALL
        )
        
        return content
    
    def _extract_json(self, content: str) -> Optional[str]:
        """从文本中提取 JSON - 严格处理以避免 Extra data 错误"""
        content = content.strip()
        # 移除 Markdown 代码块标记
        content = content.replace("```json\n", "").replace("```json", "").replace("```\n", "").replace("```", "")
        content = content.strip()
        
        # 如果内容以 [ 开头（数组），找到匹配的结束 ]
        if content.startswith("["):
            bracket_count = 0
            in_string = False
            escape = False
            
            for i, char in enumerate(content):
                if escape:
                    escape = False
                    continue
                    
                if char == "\\" and in_string:
                    escape = True
                    continue
                    
                if char == '"':
                    in_string = not in_string
                    continue
                    
                if not in_string:
                    if char == "[":
                        bracket_count += 1
                    elif char == "]":
                        bracket_count -= 1
                        if bracket_count == 0:
                            # 找到结束，截取有效的JSON
                            json_str = content[0:i + 1]
                            return self._fix_json_string(json_str)
        
        # 如果内容以 { 开头（对象），找到匹配的结束 }
        if content.startswith("{"):
            brace_count = 0
            in_string = False
            escape = False
            
            for i, char in enumerate(content):
                if escape:
                    escape = False
                    continue
                    
                if char == "\\" and in_string:
                    escape = True
                    continue
                    
                if char == '"':
                    in_string = not in_string
                    continue
                    
                if not in_string:
                    if char == "{":
                        brace_count += 1
                    elif char == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            # 找到结束，截取有效的JSON
                            json_str = content[0:i + 1]
                            return self._fix_json_string(json_str)
        
        return None
    
    def _fix_json_string(self, json_str: str) -> str:
        """修复 JSON 字符串"""
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
            
            if in_string and char in '\n\r':
                result.append('\\')
                result.append('n')
                i += 1
                continue
            
            result.append(char)
            i += 1
        
        return ''.join(result)

# 辅助函数
def generate_mixed_parameter_partition(
    api_id: int,
    multi_parameter_spaces: List[Dict[str, Any]],
    single_parameter_spaces: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    为已提取的多参数空间关联单参数空间分类
    
    输入多参数空间和单参数空间，输出混合空间
    """
    generator = MixedSpaceGenerator()
    return generator.generate_partition(
        api_id=api_id,
        multi_parameter_spaces=multi_parameter_spaces,
        single_parameter_spaces=single_parameter_spaces,
    )
