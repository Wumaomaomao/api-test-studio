from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class ParameterLocation(BaseModel):
    """参数位置定义"""
    name: str = Field(..., description="参数名称")
    location: str = Field(..., description="参数位置: query, path, header, body")


class SingleConstraint(BaseModel):
    """单个参数的约束定义"""
    parameter: ParameterLocation = Field(..., description="参数及其位置")
    constraint: str = Field(..., description="自然语言约束描述")


class Dependency(BaseModel):
    """多参数依赖关系定义"""
    name: str = Field(..., description="依赖关系名称")
    parameters: List[ParameterLocation] = Field(..., description="涉及的参数列表")
    constraint: str = Field(..., description="自然语言约束描述")


class ApiConstraints(BaseModel):
    """API约束信息（包含单参数约束和多参数依赖关系）"""
    single_constraints: List[SingleConstraint] = Field(default_factory=list, description="单参数约束列表")
    dependencies: List[Dependency] = Field(default_factory=list, description="多参数依赖关系列表")


class ApiUpdate(BaseModel):
    """用于更新API的参数模型"""
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    headers_params: Optional[List[Dict[str, Any]]] = None
    query_params: Optional[List[Dict[str, Any]]] = None
    path_params: Optional[List[Dict[str, Any]]] = None
    single_constraints: Optional[Dict[str, Any]] = None
    dependencies: Optional[Dict[str, Any]] = None
