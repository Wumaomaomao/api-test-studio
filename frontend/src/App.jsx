import { useState, useEffect } from 'react';
import ApiManagement from './components/ApiManagement';
import AutoTestModule from './components/AutoTestModule';
import TestReportModule from './components/TestReportModule';
import CreateProjectModal from './components/CreateProjectModal';
import CreateApiModal from './components/CreateApiModal';

function App() {
  // --- 🌟 核心状态 ---
  const [activeTab, setActiveTab] = useState('api');
  const [reportFocusTaskId, setReportFocusTaskId] = useState(null);

  // --- 项目与接口数据状态 ---
  const [projects, setProjects] = useState([]);
  const [apis, setApis] = useState([]);
  const [statusMsg, setStatusMsg] = useState('🟢 就绪');
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showAddApiCard, setShowAddApiCard] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectBaseUrl, setNewProjectBaseUrl] = useState('');
  const [openapiFile, setOpenapiFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiMethod, setNewApiMethod] = useState('GET');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [addingApi, setAddingApi] = useState(false);
  
  // 接口测试参数状态
  const [headers, setHeaders] = useState([]);
  const [queryParams, setQueryParams] = useState([]);
  const [pathParams, setPathParams] = useState([]);
  const [bodyType, setBodyType] = useState('json');
  const [bodyData, setBodyData] = useState('');
  const [bodyFormData, setBodyFormData] = useState([]);
  const [paramsTab, setParamsTab] = useState('headers');
  const [responseData, setResponseData] = useState('');
  const [availableRequestBodies, setAvailableRequestBodies] = useState([]);
  
  // 参数约束状态
  const [constraintsTab, setConstraintsTab] = useState('single');
  const [singleConstraints, setSingleConstraints] = useState({});
  const [dependencies, setDependencies] = useState([]);
  
  // AI 生成约束状态
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerateType, setAiGenerateType] = useState('single');
  const [isConstraintGenerating, setIsConstraintGenerating] = useState(false);
  
  // 💥 新增：记录当前点选了哪个项目、哪个接口
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedApi, setSelectedApi] = useState(null);
  const [selectedApiData, setSelectedApiData] = useState(null);
  const [showProjectOverview, setShowProjectOverview] = useState(false);
  
  // Base URL 编辑状态
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [tempBaseUrl, setTempBaseUrl] = useState('');

  useEffect(() => {
    if (selectedApi && apis.length > 0) {
      const apiData = apis.find(a => a.id === selectedApi);
      setSelectedApiData(apiData || null);
      
      // 从API数据加载参数，或初始化为空
      if (apiData) {
        // 转换OpenAPI参数格式：添加value字段，初始化为空
        const convertParams = (params = []) => {
          return params.map(p => ({
            name: p.name || '',
            value: p.value || '',
            type: p.type || 'string',
            description: p.description || '',
            required: p.required || false,
          }));
        };
        
        setHeaders(convertParams(apiData.headers_params));
        setQueryParams(convertParams(apiData.query_params));
        setPathParams(convertParams(apiData.path_params));
        
        // 处理请求体
        if (apiData.request_bodies && apiData.request_bodies.length > 0) {
          console.log('请求体数据:', apiData.request_bodies);
          setAvailableRequestBodies(apiData.request_bodies);
          
          // 查找默认的请求体，或使用第一个
          const defaultBody = apiData.request_bodies.find(rb => rb.is_default) || apiData.request_bodies[0];
          console.log('默认请求体:', defaultBody);
          console.log('body_params 类型:', typeof defaultBody.body_params);
          console.log('body_params 是否为数组:', Array.isArray(defaultBody.body_params));
          
          // 转换 media_type 为前端用的 bodyType
          const mediaTypeToBodyType = {
            'application/json': 'json',
            'application/xml': 'xml',
            'application/x-www-form-urlencoded': 'form',
          };
          const bodyType = mediaTypeToBodyType[defaultBody.media_type] || 'json';
          console.log('bodyType:', bodyType);
          setBodyType(bodyType);
          
          // 转换 body 参数
          const convertBodyParams = (params = []) => {
            console.log('convertBodyParams 输入:', params);
            const result = (params || []).map(p => ({
              key: p.name || '',
              value: p.value || '',
              type: p.type || 'string',
              description: p.description || '',
              required: p.required || false,
            }));
            console.log('convertBodyParams 输出:', result);
            return result;
          };
          
          if (bodyType === 'form') {
            const converted = convertBodyParams(defaultBody.body_params);
            console.log('最终设置的form参数:', converted);
            setBodyFormData(converted);
            // 有form参数时，自动切换到Body标签
            setParamsTab('body');
          } else if (bodyType === 'json') {
            setBodyFormData([]);
            // 尝试从 body_params 中提取 JSON 原始内容
            if (defaultBody.body_params && defaultBody.body_params.length > 0) {
              const jsonRawItem = defaultBody.body_params.find(p => p.name === '_json_raw');
              if (jsonRawItem) {
                setBodyData(jsonRawItem.value || '');
              } else {
                setBodyData('');
              }
            }
            setParamsTab('body');
          } else if (bodyType === 'xml') {
            setBodyFormData([]);
            // 尝试从 body_params 中提取 XML 原始内容
            if (defaultBody.body_params && defaultBody.body_params.length > 0) {
              const xmlRawItem = defaultBody.body_params.find(p => p.name === '_xml_raw');
              if (xmlRawItem) {
                setBodyData(xmlRawItem.value || '');
              } else {
                setBodyData('');
              }
            }
            setParamsTab('body');
          }
        } else {
          console.log('没有 request_bodies');
          setAvailableRequestBodies([]);
          setBodyType('json');
          setBodyFormData([]);
          setParamsTab('headers');
        }
      } else {
        setHeaders([]);
        setQueryParams([]);
        setPathParams([]);
        setBodyFormData([]);
        setBodyType('json');
        setParamsTab('headers');
      }
      
      // 加载参数约束数据
      if (apiData) {
        // 规范化约束格式：处理可能来自AI生成或手动编辑的两种格式
        const normalizedConstraints = {};
        const rawConstraints = apiData.single_constraints || {};
        for (const [key, value] of Object.entries(rawConstraints)) {
          // 处理两种格式：
          // 1. AI生成格式：{parameter_name: 'xx', location: 'query', constraint: 'xx'}
          // 2. 手动编辑格式：{location: 'query', constraint: 'xx'}
          if (value.parameter_name) {
            // AI生成格式：以 parameter_name 为 key
            normalizedConstraints[value.parameter_name] = {
              location: value.location || 'query',
              constraint: value.constraint || ''
            };
          } else if (value.parameter?.name) {
            // 旧格式：嵌套 parameter 对象
            normalizedConstraints[value.parameter.name] = {
              location: value.parameter.location || 'query',
              constraint: value.constraint || ''
            };
          } else {
            // 手动编辑格式：key 就是参数名
            normalizedConstraints[key] = {
              location: value.location || 'query',
              constraint: value.constraint || ''
            };
          }
        }
        setSingleConstraints(normalizedConstraints);
        setDependencies(Array.isArray(apiData.dependencies) ? apiData.dependencies : []);
        setConstraintsTab('single');
      } else {
        setSingleConstraints({});
        setDependencies([]);
      }
      
      // 清除响应数据
      setBodyData('');
      setResponseData('');
    } else {
      setSelectedApiData(null);
      setHeaders([]);
      setQueryParams([]);
      setPathParams([]);
      setBodyType('json');
      setBodyData('');
      setBodyFormData([]);
      setResponseData('');
      setParamsTab('headers');
      setSingleConstraints({});
      setDependencies([]);
    }
  }, [selectedApi, apis]);

  // 当 bodyType 改变时，从 availableRequestBodies 中加载对应的内容
  useEffect(() => {
    if (!availableRequestBodies || availableRequestBodies.length === 0) {
      return;
    }

    // 转换 bodyType 到 media_type
    const bodyTypeToMediaType = {
      'json': 'application/json',
      'xml': 'application/xml',
      'form': 'application/x-www-form-urlencoded',
    };
    const mediaType = bodyTypeToMediaType[bodyType] || 'application/json';

    // 查找是否存在对应 media_type 的 request_body
    const requestBody = availableRequestBodies.find(rb => rb.media_type === mediaType);
    
    if (requestBody) {
      // 找到了，根据类型加载内容
      if (bodyType === 'form') {
        const converted = (requestBody.body_params || []).map(p => ({
          key: p.name || '',
          value: p.value || '',
          type: p.type || 'string',
          description: p.description || '',
          required: p.required || false,
        }));
        setBodyFormData(converted);
      } else if (bodyType === 'json') {
        const jsonRawItem = (requestBody.body_params || []).find(p => p.name === '_json_raw');
        setBodyData(jsonRawItem ? jsonRawItem.value || '' : '');
      } else if (bodyType === 'xml') {
        const xmlRawItem = (requestBody.body_params || []).find(p => p.name === '_xml_raw');
        setBodyData(xmlRawItem ? xmlRawItem.value || '' : '');
      }
    } else {
      // 没有找到，初始化为空
      setBodyFormData([]);
      setBodyData('');
    }
  }, [bodyType, availableRequestBodies]);

  const API_BASE_URL = "http://localhost:8080";

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`);
      const data = await res.json();
      setProjects(data);
      // 如果获取到了项目，默认选中第一个
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      setStatusMsg('🔴 后端未连接');
    }
  };

  const fetchApis = async (projectId) => {
    if (!projectId) {
      setApis([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/apis`);
      const data = await res.json();
      setApis(data);
    } catch (error) {
      setStatusMsg('🔴 获取接口列表失败');
      setApis([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchApis(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setStatusMsg('🔴 请输入项目名称');
      return;
    }

    try {
      setCreating(true);
      setStatusMsg('🟡 正在创建项目...');

      const formData = new FormData();
      formData.append('name', newProjectName.trim());
      formData.append('base_url', newProjectBaseUrl.trim());
      if (openapiFile) {
        formData.append('openapi_file', openapiFile);
      }

      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '创建失败');
      }

      setStatusMsg(`🟢 创建成功：${data.name}`);
      setShowCreateCard(false);
      setNewProjectName('');
      setNewProjectBaseUrl('');
      setOpenapiFile(null);
      await fetchProjects();
      if (data.id) {
        setSelectedProjectId(data.id);
      }
    } catch (error) {
      setStatusMsg(`🔴 ${error.message || '创建失败'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateApi = async () => {
    if (!newApiName.trim()) {
      setStatusMsg('🔴 请输入接口名称');
      return;
    }

    if (!newApiUrl.trim()) {
      setStatusMsg('🔴 请输入接口 URL');
      return;
    }

    try {
      setAddingApi(true);
      setStatusMsg('🟡 正在添加接口...');

      const formData = new FormData();
      formData.append('name', newApiName.trim());
      formData.append('method', newApiMethod);
      formData.append('url', newApiUrl.trim());

      const res = await fetch(`${API_BASE_URL}/projects/${selectedProjectId}/apis`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '添加失败');
      }

      setStatusMsg(`🟢 接口添加成功：${data.name}`);
      setShowAddApiCard(false);
      setNewApiName('');
      setNewApiMethod('GET');
      setNewApiUrl('');
      await fetchApis(selectedProjectId);
      if (data.id) {
        setSelectedApi(data.id);
      }
    } catch (error) {
      setStatusMsg(`🔴 ${error.message || '添加失败'}`);
    } finally {
      setAddingApi(false);
    }
  };

  const handleSaveParameters = async () => {
    if (!selectedApi || !selectedProjectId) {
      setStatusMsg('🔴 请先选择一个接口');
      return;
    }

    try {
      setStatusMsg('🟡 正在保存参数...');

      // 将headers数据转换为后端格式
      const headersData = headers.map(h => ({
        name: h.key || h.name || '',
        value: h.value || '',
        type: h.type || 'string',
        description: h.description || '',
        required: h.required || false,
      }));

      const queryData = queryParams.map(p => ({
        name: p.name || '',
        value: p.value || '',
        type: p.type || 'string',
        description: p.description || '',
        required: p.required || false,
      }));

      const pathData = pathParams.map(p => ({
        name: p.name || '',
        value: p.value || '',
        type: p.type || 'string',
        description: p.description || '',
        required: p.required || false,
      }));

      // 根据 bodyType 构建 body_params
      let bodyParamsToSave = [];
      if (bodyType === 'form') {
        // form 类型：保存参数数组
        bodyParamsToSave = bodyFormData.map(b => ({
          name: b.key || '',
          value: b.value || '',
          type: b.type || 'string',
          description: b.description || '',
          required: b.required || false,
        }));
      } else if (bodyType === 'json') {
        // json 类型：保存原始 JSON 内容
        if (bodyData.trim()) {
          try {
            JSON.parse(bodyData);  // 验证格式
            bodyParamsToSave = [{ name: '_json_raw', value: bodyData }];
          } catch (e) {
            setStatusMsg('🔴 JSON 格式错误');
            return;
          }
        }
      } else if (bodyType === 'xml') {
        // xml 类型：保存原始 XML 内容
        if (bodyData.trim()) {
          bodyParamsToSave = [{ name: '_xml_raw', value: bodyData }];
        }
      }

      // 转换 bodyType 为 media_type
      const bodyTypeToMediaType = {
        'json': 'application/json',
        'xml': 'application/xml',
        'form': 'application/x-www-form-urlencoded',
      };
      const mediaType = bodyTypeToMediaType[bodyType] || 'application/json';

      const formData = new FormData();
      formData.append('headers_params', JSON.stringify(headersData));
      formData.append('query_params', JSON.stringify(queryData));
      formData.append('path_params', JSON.stringify(pathData));
      formData.append('body_type', mediaType);
      formData.append('body_params', JSON.stringify(bodyParamsToSave));
      formData.append('single_constraints', JSON.stringify(singleConstraints));
      formData.append('dependencies', JSON.stringify(dependencies));

      const res = await fetch(`${API_BASE_URL}/projects/${selectedProjectId}/apis/${selectedApi}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('保存失败');
      }

      setStatusMsg('🟢 参数已保存');
      // 重新加载接口列表以更新数据
      await fetchApis(selectedProjectId);
    } catch (error) {
      setStatusMsg(`🔴 保存失败: ${error.message}`);
    }
  };

  const handleUpdateBaseUrl = async (projectId) => {
    if (!tempBaseUrl.trim()) {
      setStatusMsg('🔴 Base URL 不能为空');
      return;
    }

    try {
      setStatusMsg('🟡 正在更新Base URL...');

      const formData = new FormData();
      formData.append('base_url', tempBaseUrl.trim());

      const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '更新失败');
      }

      setStatusMsg('🟢 Base URL 已更新');
      setEditingProjectId(null);
      setTempBaseUrl('');
      await fetchProjects();
    } catch (error) {
      setStatusMsg(`🔴 更新失败: ${error.message}`);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedApiData || !selectedProjectId) {
      setStatusMsg('🔴 请先选择一个接口');
      return;
    }

    try {
      setStatusMsg('🟡 正在发送请求...');

      // 准备调用后端代理接口的参数
      const headersData = headers.map(h => ({
        name: h.key || h.name || '',
        value: h.value || '',
      }));

      const queryData = queryParams.map(p => ({
        name: p.name || '',
        value: p.value || '',
      }));

      const pathData = pathParams.map(p => ({
        name: p.name || '',
        value: p.value || '',
      }));

      // 根据 bodyType 构建 body 数据
      let bodyDataToSend = '';
      if (['POST', 'PUT', 'PATCH'].includes(selectedApiData.method)) {
        if (bodyType === 'json') {
          bodyDataToSend = bodyData.trim();
          if (bodyDataToSend) {
            try {
              JSON.parse(bodyDataToSend);
            } catch (e) {
              setStatusMsg('🔴 Body JSON 格式错误');
              return;
            }
          }
        } else if (bodyType === 'xml') {
          bodyDataToSend = bodyData.trim();
        } else if (bodyType === 'form') {
          const activeFormData = bodyFormData.filter(f => f.key && f.value);
          if (activeFormData.length > 0) {
            bodyDataToSend = activeFormData
              .map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
              .join('&');
          }
        }
      }

      // 转换 bodyType 为 media_type
      const bodyTypeToMediaType = {
        'json': 'application/json',
        'xml': 'application/xml',
        'form': 'application/x-www-form-urlencoded',
      };
      const mediaType = bodyTypeToMediaType[bodyType] || 'application/json';

      // 调用后端代理接口
      const formData = new FormData();
      formData.append('headers_params', JSON.stringify(headersData));
      formData.append('query_params', JSON.stringify(queryData));
      formData.append('path_params', JSON.stringify(pathData));
      formData.append('body_type', mediaType);
      formData.append('body_data', bodyDataToSend);

      const res = await fetch(`${API_BASE_URL}/projects/${selectedProjectId}/apis/${selectedApiData.id}/debug`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || '请求发送失败');
      }

      // 格式化响应显示
      const responseDisplay = `状态码: ${data.status_code}\n\n响应体:\n${typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2)}`;
      setResponseData(responseDisplay);
      setStatusMsg(`🟢 请求成功 (${data.status_code})`);
    } catch (error) {
      setResponseData(`错误: ${error.message}`);
      setStatusMsg(`🔴 请求失败: ${error.message}`);
    }
  };

  const handleDeleteApi = async (apiId) => {
    if (!confirm('确定要删除这个接口吗？')) {
      return;
    }

    try {
      setStatusMsg('🟡 正在删除接口...');

      const res = await fetch(`${API_BASE_URL}/projects/${selectedProjectId}/apis/${apiId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || '删除失败');
      }

      setStatusMsg('🟢 接口已删除');
      await fetchApis(selectedProjectId);
      setSelectedApi(null);
    } catch (error) {
      setStatusMsg(`🔴 ${error.message || '删除失败'}`);
    }
  };

  const handleAiGenerateConstraints = async () => {
    if (!selectedProjectId || !selectedApi) {
      setStatusMsg('🔴 请先选择一个接口');
      return;
    }

    // 检查项目是否有 OpenAPI 文档
    const project = projects.find(p => p.id === selectedProjectId);
    const hasOpenApi = project && project.openapi_content;

    if (!hasOpenApi && !aiPrompt.trim()) {
      setStatusMsg('🔴 该项目无 OpenAPI 文档，请输入约束描述');
      return;
    }

    try {
      setIsConstraintGenerating(true);

      const formData = new FormData();
      
      if (hasOpenApi) {
        formData.append('user_prompt', '基于 OpenAPI 文档自动提取参数约束');
      } else {
        formData.append('user_prompt', aiPrompt);
      }
      
      formData.append('constraint_type', aiGenerateType);

      const res = await fetch(
        `${API_BASE_URL}/projects/${selectedProjectId}/apis/${selectedApi}/extract-constraints`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'AI 约束生成失败');
      }

      // 处理返回的约束
      const { type, data: extractedData } = data;
      
      if (!extractedData || Object.keys(extractedData).length === 0) {
        setStatusMsg('⚠️ 未提取到约束信息');
        return;
      }

      if (type === 'dependency') {
        // 处理参数依赖关系
        setDependencies(extractedData);
        
        // 自动保存依赖关系到数据库
        try {
          const saveDepsFormData = new FormData();
          saveDepsFormData.append('headers_params', JSON.stringify(headers));
          saveDepsFormData.append('query_params', JSON.stringify(queryParams));
          saveDepsFormData.append('path_params', JSON.stringify(pathParams));
          saveDepsFormData.append('body_type', bodyType === 'json' ? 'application/json' : bodyType === 'xml' ? 'application/xml' : 'application/x-www-form-urlencoded');
          saveDepsFormData.append('body_params', JSON.stringify(bodyFormData.length > 0 ? bodyFormData.map(b => ({name: b.key, value: b.value, type: b.type, required: b.required})) : []));
          saveDepsFormData.append('single_constraints', JSON.stringify(singleConstraints));
          saveDepsFormData.append('dependencies', JSON.stringify(extractedData));
          
          const saveRes = await fetch(
            `${API_BASE_URL}/projects/${selectedProjectId}/apis/${selectedApi}`,
            {
              method: 'PUT',
              body: saveDepsFormData,
            }
          );
          
          if (!saveRes.ok) {
            const saveError = await saveRes.json();
            console.warn('Failed to save dependencies:', saveError);
          }
        } catch (saveError) {
          console.warn('Error saving dependencies:', saveError);
        }
        
        const depCount = Object.keys(extractedData).length;
        setStatusMsg(`✅ 成功生成 ${depCount} 条参数依赖关系并已自动保存`);
      } else {
        // 处理单参数约束 - 规范化格式
        const normalizedConstraints = {};
        for (const [key, value] of Object.entries(extractedData)) {
          // 处理 AI 生成的格式：{parameter_name: 'xx', location: 'query', constraint: 'xx'}
          if (value.parameter_name) {
            normalizedConstraints[value.parameter_name] = {
              location: value.location || 'query',
              constraint: value.constraint || ''
            };
          } else if (value.parameter?.name) {
            normalizedConstraints[value.parameter.name] = {
              location: value.parameter.location || 'query',
              constraint: value.constraint || ''
            };
          } else {
            // 如果已经是规范化格式
            normalizedConstraints[key] = {
              location: value.location || 'query',
              constraint: value.constraint || ''
            };
          }
        }
        setSingleConstraints(normalizedConstraints);
        
        // 自动保存单参数约束到数据库
        try {
          const saveSingleFormData = new FormData();
          saveSingleFormData.append('headers_params', JSON.stringify(headers));
          saveSingleFormData.append('query_params', JSON.stringify(queryParams));
          saveSingleFormData.append('path_params', JSON.stringify(pathParams));
          saveSingleFormData.append('body_type', bodyType === 'json' ? 'application/json' : bodyType === 'xml' ? 'application/xml' : 'application/x-www-form-urlencoded');
          saveSingleFormData.append('body_params', JSON.stringify(bodyFormData.length > 0 ? bodyFormData.map(b => ({name: b.key, value: b.value, type: b.type, required: b.required})) : []));
          saveSingleFormData.append('single_constraints', JSON.stringify(normalizedConstraints));
          saveSingleFormData.append('dependencies', JSON.stringify(dependencies));
          
          const saveRes = await fetch(
            `${API_BASE_URL}/projects/${selectedProjectId}/apis/${selectedApi}`,
            {
              method: 'PUT',
              body: saveSingleFormData,
            }
          );
          
          if (!saveRes.ok) {
            const saveError = await saveRes.json();
            console.warn('Failed to save constraints:', saveError);
          }
        } catch (saveError) {
          console.warn('Error saving constraints:', saveError);
        }
        
        const constraintCount = Object.keys(normalizedConstraints).length;
        setStatusMsg(`✅ 成功生成 ${constraintCount} 条约束并已自动保存`);
      }
      
      // 关闭模态框并重置状态
      setShowAiGenerateModal(false);
      setAiPrompt('');
      setAiGenerateType('single');
      
    } catch (error) {
      setStatusMsg(`🔴 ${error.message}`);
    } finally {
      setIsConstraintGenerating(false);
    }
  };

  const tabs = [
    { id: 'api', name: '接口管理' },
    { id: 'auto', name: '自动化测试' },
    { id: 'report', name: '测试报告' },
  ];

  // --- 🎨 界面渲染 ---
  return (
    <div style={styles.layout}>
      {/* 1. 最左侧：全局导航栏 */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}> API Test Studio</div>
        <nav style={styles.nav}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ ...styles.navItem, ...(activeTab === tab.id ? styles.navItemActive : {}) }}
            >
              {tab.name}
            </button>
          ))}
        </nav>
        <div style={styles.statusFooter}>{statusMsg}</div>
      </aside>

      {/* 主体内容区 */}
      <main style={styles.mainContent}>
        
      {/* === 接口管理工作区 (经典左右分栏) === */}
        {activeTab === 'api' && (
          <ApiManagement
            projects={projects}
            apis={apis}
            selectedProjectId={selectedProjectId}
            selectedApi={selectedApi}
            selectedApiData={selectedApiData}
            queryParams={queryParams}
            setQueryParams={setQueryParams}
            pathParams={pathParams}
            setPathParams={setPathParams}
            headers={headers}
            setHeaders={setHeaders}
            bodyType={bodyType}
            setBodyType={setBodyType}
            bodyData={bodyData}
            setBodyData={setBodyData}
            bodyFormData={bodyFormData}
            setBodyFormData={setBodyFormData}
            paramsTab={paramsTab}
            setParamsTab={setParamsTab}
            responseData={responseData}
            setResponseData={setResponseData}
            availableRequestBodies={availableRequestBodies}
            statusMsg={statusMsg}
            setStatusMsg={setStatusMsg}
            showCreateCard={showCreateCard}
            setShowCreateCard={setShowCreateCard}
            showAddApiCard={showAddApiCard}
            setShowAddApiCard={setShowAddApiCard}
            newApiName={newApiName}
            setNewApiName={setNewApiName}
            newApiMethod={newApiMethod}
            setNewApiMethod={setNewApiMethod}
            newApiUrl={newApiUrl}
            setNewApiUrl={setNewApiUrl}
            addingApi={addingApi}
            fetchApis={fetchApis}
            handleCreateApi={handleCreateApi}
            handleDeleteApi={handleDeleteApi}
            handleSendRequest={handleSendRequest}
            handleSaveParameters={handleSaveParameters}
            setSelectedProjectId={setSelectedProjectId}
            setSelectedApi={setSelectedApi}
            editingProjectId={editingProjectId}
            setEditingProjectId={setEditingProjectId}
            tempBaseUrl={tempBaseUrl}
            setTempBaseUrl={setTempBaseUrl}
            handleUpdateBaseUrl={handleUpdateBaseUrl}
            constraintsTab={constraintsTab}
            setConstraintsTab={setConstraintsTab}
            singleConstraints={singleConstraints}
            setSingleConstraints={setSingleConstraints}
            dependencies={dependencies}
            setDependencies={setDependencies}
            showAiGenerateModal={showAiGenerateModal}
            setShowAiGenerateModal={setShowAiGenerateModal}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            aiGenerateType={aiGenerateType}
            setAiGenerateType={setAiGenerateType}
            isConstraintGenerating={isConstraintGenerating}
            setIsConstraintGenerating={setIsConstraintGenerating}
            handleAiGenerateConstraints={handleAiGenerateConstraints}
            styles={styles}
          />
        )}

        {/* 自动化测试 与 测试报告 占位 */}
        {activeTab === 'auto' && (
          <AutoTestModule
            projects={projects}
            apis={apis}
            styles={styles}
            onTaskCreated={(taskId, projectId) => {
              setReportFocusTaskId(taskId);
              if (projectId) {
                setSelectedProjectId(projectId);
              }
              setActiveTab('report');
            }}
          />
        )}
        {activeTab === 'report' && (
          <TestReportModule
            projects={projects}
            apis={apis}
            styles={styles}
            selectedProjectId={selectedProjectId}
            focusTaskId={reportFocusTaskId}
          />
        )}

      </main>

      <CreateProjectModal
        showModal={showCreateCard}
        onClose={() => {
          setShowCreateCard(false);
          setNewProjectName('');
          setNewProjectBaseUrl('');
          setOpenapiFile(null);
        }}
        projectName={newProjectName}
        setProjectName={setNewProjectName}
        projectBaseUrl={newProjectBaseUrl}
        setProjectBaseUrl={setNewProjectBaseUrl}
        openApiFile={openapiFile}
        setOpenApiFile={setOpenapiFile}
        sending={creating}
        onCreateProject={handleCreateProject}
        styles={styles}
      />

      <CreateApiModal
        showModal={showAddApiCard}
        onClose={() => {
          setShowAddApiCard(false);
          setNewApiName('');
          setNewApiMethod('GET');
          setNewApiUrl('');
        }}
        apiName={newApiName}
        setApiName={setNewApiName}
        apiMethod={newApiMethod}
        setApiMethod={setNewApiMethod}
        apiUrl={newApiUrl}
        setApiUrl={setNewApiUrl}
        adding={addingApi}
        onCreateApi={handleCreateApi}
        styles={styles}
      />
    </div>
  );
}

// --- 💅 样式区 (为三栏布局定制) ---
const styles = {
  layout: { display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', backgroundColor: '#fff' },
  sidebar: { width: '220px', backgroundColor: '#1e293b', color: '#fff', display: 'flex', flexDirection: 'column' },
  logo: { padding: '20px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #334155' },
  nav: { flex: 1, padding: '15px 10px' },
  navItem: { display: 'block', width: '100%', padding: '10px 15px', marginBottom: '5px', textAlign: 'left', backgroundColor: 'transparent', color: '#cbd5e1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' },
  navItemActive: { backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold' },
  statusFooter: { padding: '15px', fontSize: '13px', color: '#94a3b8', borderTop: '1px solid #334155' },
  
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', overflow: 'hidden' },
  
  // 接口管理工作区核心布局
  apiWorkspace: { display: 'flex', flex: 1, height: '100%' },
  
  // 中间项目树状菜单
  innerSidebar: { width: '260px', backgroundColor: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' },
  innerSidebarHeader: { padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  createProjectBtn: { border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '999px', padding: '5px 10px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 },
  // Modal 样式（简单卡片）
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '420px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)', zIndex: 1001 },
  modalHeader: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' },
  closeBtn: { display: 'none' },
  modalContent: { marginBottom: '12px' },
  formGroup: { marginBottom: '10px' },
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', marginBottom: '8px' },
  fileInputWrapper: { display: 'none' },
  fileInput: { display: 'none' },
  fileInputLabel: { display: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' },
  cancelBtn: { padding: '6px 12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  confirmBtn: { padding: '6px 12px', border: 'none', backgroundColor: '#2563eb', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 },
  
  // 旧 Modal 样式（兼容）
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modalCard: { width: '100%', maxWidth: '460px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)' },
  createCardTitle: { margin: '0 0 10px 0', fontSize: '15px', color: '#1e3a8a' },
  cardInput: { width: '100%', boxSizing: 'border-box', marginBottom: '8px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' },
  cardFileInput: { width: '100%', marginBottom: '10px', fontSize: '13px' },
  fileHint: { fontSize: '13px', color: '#64748b', marginBottom: '10px' },
  cardActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  cardCancelBtn: { padding: '6px 10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '6px', cursor: 'pointer' },
  cardCreateBtn: { padding: '6px 10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', cursor: 'pointer', opacity: 1 },
  cardCreateBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' },
  
  projectList: { listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto' },
  projectItem: { borderBottom: '1px solid #f1f5f9' },
  projectName: { padding: '12px 15px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', color: '#334155' },
  projectNameActive: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
  
  // 接口列表
  apiList: { listStyle: 'none', padding: '5px 0', margin: 0, backgroundColor: '#f8fafc' },
  apiItem: { padding: '8px 15px 8px 30px', fontSize: '14px', display: 'flex', alignItems: 'center', color: '#475569', borderBottom: '1px solid #f1f5f9' },
  deleteApiBtn: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px', padding: '0 5px', marginLeft: 'auto', opacity: 0.6 },
  methodGet: { color: '#10b981', fontWeight: 'bold', marginRight: '8px', fontSize: '13px' },
  methodPost: { color: '#f59e0b', fontWeight: 'bold', marginRight: '8px', fontSize: '13px' },
  methodOther: { color: '#8b5cf6', fontWeight: 'bold', marginRight: '8px', fontSize: '13px' },
  
  // 右侧详情区
  apiDetailArea: { flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f9fafb' },
  emptyState: { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' },
  projectOverview: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  overviewSection: { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' },
  overviewValue: { color: '#1e293b', fontSize: '15px', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '4px', margin: '8px 0' },
  overviewApiList: { listStyle: 'none', padding: 0, margin: '10px 0' },
  overviewApiItem: { padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' },
  overviewUrl: { marginLeft: 'auto', fontSize: '13px', color: '#64748b', backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' },
  
  // 接口编辑面板
  apiEditor: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' },
  urlBar: { display: 'flex', marginBottom: '20px' },
  methodSelect: { padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px', backgroundColor: '#f8fafc', fontWeight: 'bold' },
  urlInput: { flex: 1, padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderLeft: 'none', borderRight: 'none', outline: 'none' },
  sendBtn: { padding: '10px 20px', fontSize: '14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontWeight: 'bold' },
  
  paramsSection: { flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' },
  paramsTabs: { display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid #e2e8f0' },
  paramsTab: { padding: '8px 12px', border: 'none', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: 500, borderBottom: '2px solid transparent' },
  paramsTabActive: { color: '#2563eb', borderBottom: '2px solid #2563eb' },
  paramsTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '13px' },
  tableHeader: { backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  tableCell: { padding: '10px', textAlign: 'left' },
  paramInput: { width: '100%', boxSizing: 'border-box', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' },
  paramSelect: { width: '100%', boxSizing: 'border-box', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' },
  addParamBtn: { padding: '6px 12px', border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 },
  deleteParamBtn: { padding: '4px 8px', border: '1px solid #fecaca', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  textarea: { width: '100%', minHeight: '150px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', fontSize: '14px' },
  
  responseArea: { flex: 1, display: 'flex', flexDirection: 'column' },
  responseBox: { flex: 1, backgroundColor: '#fff', color: '#1e293b', padding: '15px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '16px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #e2e8f0' },
  
  // 自动化测试模块样式
  autoTestLayout: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%' },
  autoTestHeader: { display: 'flex', gap: '10px', padding: '15px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' },
  autoTestTab: { padding: '8px 16px', border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 },
  autoTestTabActive: { backgroundColor: '#2563eb', color: '#fff', borderColor: '#2563eb' },
  autoTestContent: { display: 'flex', flex: 1, overflow: 'hidden' },
  autoTestSidebar: { width: '280px', backgroundColor: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  autoTestMain: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', backgroundColor: '#f9fafb', overflowY: 'auto' },
  sidebarTitle: { padding: '15px 15px 10px 15px', fontSize: '14px', fontWeight: 'bold', color: '#334155', margin: 0, borderBottom: '1px solid #f1f5f9' },
  projectSelectList: { padding: '10px 0' },
  projectSelectItem: { padding: '10px 15px', cursor: 'pointer', fontSize: '14px', color: '#475569', borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' },
  projectSelectItemActive: { backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold' },
  apiSelectList: { padding: '10px 15px 0 15px', flex: 1, overflowY: 'auto' },
  apiSelectItem: { padding: '10px', marginBottom: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '8px', transition: 'border-color 0.2s' },
  apiSelectItemActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  apiMethodBadge: { display: 'inline-block', backgroundColor: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', minWidth: '45px', textAlign: 'center' },
  apiUrlText: { color: '#64748b', fontSize: '12px', flex: 1 },
  emptyText: { padding: '15px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' },
  testCaseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  testCaseTitle: { margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' },
  addCaseBtn: { padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 },
  caseForm: { backgroundColor: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  caseFormInput: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
  caseFormTextarea: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' },
  caseFormActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  caseTable: { backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  deleteBtn: { padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }
};

export default App;