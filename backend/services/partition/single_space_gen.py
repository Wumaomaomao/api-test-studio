import json
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class SingleParameterSpaceGenerator:
    """使用 AI 为 API 参数生成输入空间划分"""
    
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
        swagger_operation: Dict[str, Any],
        parameters: Dict[str, List[Dict[str, Any]]],  # {query: [...], path: [...], headers: [...], body: [...]}
        single_constraints: Dict[str, str],  # {param_name: constraint_description}
    ) -> List[Dict[str, Any]]:
        """
        为 API 的所有参数生成输入空间划分
        
        Args:
            api_id: API ID
            swagger_operation: Swagger 操作对象
            parameters: 从数据库提取的参数，按位置分类
            single_constraints: 单参数约束列表
            
        Returns:
            JSON 数组，每个 item 包含：
            {
                "api_id": int,
                "param_name": str,
                "val_type": str,  # string, integer, number, boolean, array, object
                "param_type": str,  # query, path, header, body
                "format": str,  # 正则格式或类型描述
                "valid": [
                    {
                        "param_name": str,
                        "category_name": str,  # 例如：非空文本、正整数、有效邮箱等
                        "description": str,
                        "sample_values": [str, ...]  # 5个左右的示例值
                    },
                    ...
                ],
                "invalid": [
                    {
                        "param_name": str,
                        "category_name": str,  # 例如：空值、负数、无效邮箱等
                        "description": str,
                        "sample_values": [str, ...]
                    },
                    ...
                ]
            }
        """
        # 收集所有参数信息
        all_params = self._collect_all_parameters(parameters)
        
        # 构建系统 prompt
        system_prompt = """
# 角色
你是一个资深的 API 自动化测试工程师，精通等价类划分、边界值分析等黑盒测试技术。

# 任务
你的任务是为 API 的每个参数生成输入空间划分。通过分析参数的数据类型、约束条件、业务逻辑等，
将参数的取值空间划分为有效类别和无效类别，每个类别包含若干个等价的测试用例。

# 输入空间划分原则
1. **有效类别 (Valid Classes)**：满足所有约束条件的参数取值，你需要结合约束关系，尽可能多的划分出更多子类。

2. **无效类别 (Invalid Classes)**：违反约束条件的参数取值
   - 空值：null、''、0（根据类型）
   - 类型错误：字符串给数字字段、数字给字符串字段等
   - 超出范围：小于最小值、大于最大值、长度超过限制等
   - 格式错误：邮箱格式错误、日期格式错误、正则不匹配等
   - 业务逻辑冲突：根据约束描述推断的业务限制

# 输出要求
输出必须是有效的 JSON 数组格式。不要输出任何其他文本或解释。

每个参数的输出结构：
{
    "param_name": "参数名",
    "val_type": "string|integer|number|boolean|array",
    "param_type": "query|path|header|body",
    "format": "数据格式描述或正则表达式",
    "valid": [
        {
            "param_name": "参数名",
            "category_name": "类别名称（例如：非空字符串、正整数、有效邮箱）",
            "description": "这个类别的描述和约束说明",
            "sample_values": ["示例值1", "示例值2", "示例值3", "示例值4", "示例值5"]
        },
        ...更多有效类别...
    ],
    "invalid": [
        {
            "param_name": "参数名",
            "category_name": "类别名称（例如：空值、负数、无效格式）",
            "description": "这个类别的描述和违反的约束",
            "sample_values": ["示例值1", "示例值2", "示例值3"]
        },
        ...更多无效类别...
    ]
}

# 注意事项
- 如果存在嵌套对象，只需要为最内层参数生成划分，不需要为外层对象生成划分
- 每个参数至少提供**3个有效输入空间**和**3个无效输入空间**，每个空间至少提供3-5个示例值
- **对于参数的有效输入空间**：
  - 如果有特殊含义的值（如 'auto', 'default', 'none'），务必单独成为一个类别
  - 根据极小划分原则，尽可能细分有效类别，例如：非空字符串可以细分为 "普通非空字符串"、"包含特殊字符的非空字符串"、"仅包含数字的非空字符串" 等
- **严格要求**：sample_values 中的每个值必须是实际的字符串、数字或其他 JSON 基本类型，不能包含任何代码或函数调用
- 对于超长文本（如重复字符），使用实际的文本值，例如用 "aaaa...aaaa" 表示长字符串，或用 "[10001个 'a' 字符]" 这样的描述
- 所有示例值必须是有效的 JSON 类型：字符串用双引号，数字不用引号，布尔值用 true/false，空值用 null
- 不要使用 JavaScript 的 repeat()、length 等函数或任何代码语法
"""
        
        user_message = f"""请为以下 API 的参数生成输入空间划分：

API 操作定义：
{json.dumps(swagger_operation, indent=2, ensure_ascii=False)}

参数信息（按位置分类）：
{json.dumps(all_params, indent=2, ensure_ascii=False)}

单参数约束：
{json.dumps(single_constraints, indent=2, ensure_ascii=False)}

请按照以上要求，为每个参数生成其有效和无效的等价类划分。
每个等价类应该包含 3-5 个代表性的示例值。
确保样例值不仅代表等价类的特征，还能帮助测试人员快速理解这个类别。

重要提示：sample_values 中的所有值必须是有效的 JSON 值，不能包含任何代码或函数调用！
输出必须是有效的 JSON 数组，不要包含任何其他文本。
"""
        
        # 调用 OpenAI API
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,
            )
            
            # 解析 AI 响应
            content = response.choices[0].message.content.strip()
            
            # 尝试提取 JSON 内容
            json_content = self._extract_json(content)
            if not json_content:
                raise ValueError("AI 响应不包含有效的 JSON")
            
            partitions = json.loads(json_content)
            if not isinstance(partitions, list):
                partitions = [partitions]
            
            # 为每个分区添加 api_id
            for partition in partitions:
                partition["api_id"] = api_id
            
            print(f"✅ 成功生成单参数输入空间划分，API ID: {api_id}")
            print(f"生成的分区 {json.dumps(partitions, indent=2, ensure_ascii=False)}")
            
            return partitions
            
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON 解析失败: {e}\n响应内容: {content}")
        except Exception as e:
            raise RuntimeError(f"AI 生成输入空间划分失败: {e}")
    
    def _collect_all_parameters(
        self,
        parameters: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """收集所有参数信息"""
        result = {}
        
        for param_type, params_list in parameters.items():
            if params_list:
                result[param_type] = []
                for param in params_list:
                    result[param_type].append({
                        "name": param.get("name"),
                        "type": param.get("type", "string"),
                        "description": param.get("description", ""),
                        "required": param.get("required", False),
                        "enum": param.get("enum"),
                        "minimum": param.get("minimum"),
                        "maximum": param.get("maximum"),
                        "minLength": param.get("minLength"),
                        "maxLength": param.get("maxLength"),
                        "pattern": param.get("pattern"),
                        "format": param.get("format"),
                    })
        
        return result
    
    def _extract_json(self, content: str) -> Optional[str]:
        """从文本中提取 JSON 内容"""
        # 首先移除 markdown 代码块标记
        content = content.replace("```json\n", "").replace("```json", "").replace("```\n", "").replace("```", "")
        
        # 尝试找到 [ 和 ]
        start_idx = content.find("[")
        end_idx = content.rfind("]")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = content[start_idx:end_idx + 1]
            # 修复 JSON 中的换行和空格问题
            return self._fix_json_string(json_str)
        
        # 如果没找到数组，尝试找对象
        start_idx = content.find("{")
        end_idx = content.rfind("}")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = content[start_idx:end_idx + 1]
            return self._fix_json_string(json_str)
        
        return None
    
    def _fix_json_string(self, json_str: str) -> str:
        """修复 JSON 字符串中的常见问题"""
        import re
        
        # 首先，处理字符串中的文字换行符
        # 需要找到所有 "..." 对并将其中的换行转换为 \n
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
def generate_single_parameter_partition(
    api_id: int,
    swagger_operation: Dict[str, Any],
    parameters: Dict[str, List[Dict[str, Any]]],
    single_constraints: Dict[str, str],
) -> List[Dict[str, Any]]:
    """
    生成单参数输入空间划分的辅助函数
    """
    generator = SingleParameterSpaceGenerator()
    return generator.generate_partition(
        api_id=api_id,
        swagger_operation=swagger_operation,
        parameters=parameters,
        single_constraints=single_constraints,
    )
