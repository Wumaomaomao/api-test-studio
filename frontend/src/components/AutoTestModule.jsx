import { useState, useEffect } from 'react';

export default function AutoTestModule({ projects, apis, styles, onTaskCreated }) {
  const [innerTab, setInnerTab] = useState('single'); // 'single' 只看单接口用例，'suite' 看套件
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedApi, setSelectedApi] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [newCase, setNewCase] = useState({
    apiId: null,
    title: '',
    description: '',
    expectedStatus: 200,
  });

  // AI生成用例相关状态
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [selectedConstraints, setSelectedConstraints] = useState([]);
  const [selectedCaseTypes, setSelectedCaseTypes] = useState([]); // 可以同时选择 'positive' 和 'negative'
  const [generateCount, setGenerateCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [partitionResult, setPartitionResult] = useState(null);
  
  // 完整流程生成结果（SISP, MISP前后）
  const [fullPipelineResult, setFullPipelineResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // 用例详情查看
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [showTestCaseDetail, setShowTestCaseDetail] = useState(false);

  const API_BASE_URL = 'http://localhost:8080';

  // 获取当前项目的API列表
  const projectApis = selectedProject ? apis.filter(api => api.project_id === selectedProject) : [];

  // 获取当前API的约束信息
  const getApiConstraints = () => {
    if (!selectedApi) return [];
    
    const constraints = [];
    
    // 单参数约束
    if (selectedApi.single_constraints) {
      const singleConstraints = typeof selectedApi.single_constraints === 'string' 
        ? JSON.parse(selectedApi.single_constraints)
        : selectedApi.single_constraints;
      
      if (typeof singleConstraints === 'object' && singleConstraints !== null) {
        Object.entries(singleConstraints).forEach(([param, constraint]) => {
          constraints.push({
            id: `single_${param}`,
            name: `${param} - ${constraint}`,
            type: 'single'
          });
        });
      }
    }
    
    // 多参数依赖
    if (selectedApi.dependencies && Array.isArray(selectedApi.dependencies)) {
      selectedApi.dependencies.forEach((dep, idx) => {
        const depName = dep.name || `依赖 ${idx + 1}`;
        constraints.push({
          id: `dep_${idx}`,
          name: depName,
          type: 'dependency'
        });
      });
    }
    
    return constraints;
  };

  const apiConstraints = getApiConstraints();

  const handleSelectConstraint = (constraintId) => {
    setSelectedConstraints(prev => 
      prev.includes(constraintId) 
        ? prev.filter(id => id !== constraintId)
        : [...prev, constraintId]
    );
  };

  const handleSelectAllConstraints = () => {
    if (selectedConstraints.length === apiConstraints.length) {
      // 如果已全选，则取消全选
      setSelectedConstraints([]);
    } else {
      // 否则全选
      setSelectedConstraints(apiConstraints.map(c => c.id));
    }
  };

  const handleSelectCaseType = (type) => {
    setSelectedCaseTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSelectApi = (api) => {
    setSelectedApi(api);
    setNewCase({ ...newCase, apiId: api.id });
  };

  const mapBackendCaseToFrontend = (tc, projectId, apiInfo) => ({
    id: tc.id,
    projectId,
    apiId: apiInfo.id,
    apiMethod: apiInfo.method,
    apiUrl: apiInfo.url,
    title: tc.name,
    description: tc.description,
    headers_params: tc.headers_params || {},
    query_params: tc.query_params || {},
    path_params: tc.path_params || {},
    body_params: tc.body_params || {},
    expectedStatus: parseInt(tc.expected_status || '200', 10),
    status: tc.status || (tc.adopted ? '已采纳' : '未采纳'),
    case_type: tc.case_type || '正向用例',
  });

  const toBackendCasePayload = (tc) => ({
    id: tc.id,
    name: tc.title,
    description: tc.description,
    headers_params: tc.headers_params || {},
    query_params: tc.query_params || {},
    path_params: tc.path_params || {},
    body_params: tc.body_params || {},
    expected_status: String(tc.expectedStatus || 200),
    case_type: tc.case_type || '正向用例',
    status: tc.status || '未采纳',
    adopted: tc.status === '已采纳',
  });

  const loadCasesFromDatabase = async (projectId, apiInfo) => {
    if (!projectId || !apiInfo) return;

    setIsLoadingCases(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/apis/${apiInfo.id}/test-cases`);
      if (!response.ok) {
        throw new Error('获取测试用例失败');
      }

      const data = await response.json();
      const loadedCases = (data.test_cases || []).map((tc) => mapBackendCaseToFrontend(tc, projectId, apiInfo));

      setTestCases((prev) => {
        const remaining = prev.filter((c) => !(c.projectId === projectId && c.apiId === apiInfo.id));
        return [...remaining, ...loadedCases];
      });
    } catch (error) {
      alert(`加载测试用例失败: ${error.message}`);
    } finally {
      setIsLoadingCases(false);
    }
  };

  const saveCasesToDatabase = async (projectId, apiId, casesForApi) => {
    const formData = new FormData();
    formData.append('test_cases_data', JSON.stringify(casesForApi.map(toBackendCasePayload)));

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/apis/${apiId}/save-test-cases`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '保存测试用例失败');
    }
  };

  const adoptCasesToDatabase = async (projectId, apiId, casesForApi) => {
    const formData = new FormData();
    formData.append('test_cases_data', JSON.stringify(casesForApi.map(toBackendCasePayload)));

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/apis/${apiId}/adopt-test-cases`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '采纳测试用例失败');
    }
  };

  useEffect(() => {
    if (selectedProject && selectedApi) {
      loadCasesFromDatabase(selectedProject, selectedApi);
    }
  }, [selectedProject, selectedApi]);

  const handleAddTestCase = async () => {
    if (!newCase.title.trim() || !newCase.apiId) {
      alert('请填写用例名称和选择API');
      return;
    }

    const caseId = Date.now();
    const newCaseWithId = {
      ...newCase,
      id: caseId,
      projectId: selectedProject,
      status: '未采纳',
    };

    // 获取选中的api信息
    const apiInfo = apis.find(a => a.id === newCase.apiId);
    if (apiInfo) {
      newCaseWithId.apiMethod = apiInfo.method;
      newCaseWithId.apiUrl = apiInfo.url;
    }

    const casesForCurrentApi = testCases.filter(
      (c) => c.projectId === selectedProject && c.apiId === selectedApi.id
    );

    try {
      await saveCasesToDatabase(selectedProject, selectedApi.id, [...casesForCurrentApi, newCaseWithId]);
      await loadCasesFromDatabase(selectedProject, selectedApi);
    } catch (error) {
      alert(`保存失败: ${error.message}`);
      return;
    }
    
    setNewCase({
      apiId: null,
      title: '',
      description: '',
      expectedStatus: 200,
    });
    setShowCaseForm(false);
  };

  const handleDeleteTestCase = async (caseId) => {
    if (!selectedProject || !selectedApi) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${selectedProject}/apis/${selectedApi.id}/test-cases/${caseId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '删除失败');
      }
      await loadCasesFromDatabase(selectedProject, selectedApi);
    } catch (error) {
      alert(`删除失败: ${error.message}`);
    }
  };

  const handleAiGenerateClose = () => {
    setShowAiGenerateModal(false);
    setSelectedConstraints([]);
    setSelectedCaseTypes([]);
    setGenerateCount(5);
    setPartitionResult(null);
  };

  // 过滤当前项目的用例
  const currentProjectCases = testCases.filter(c => c.projectId === selectedProject);

  const innerTabs = [
    { id: 'single', name: '单接口用例' },
    { id: 'suite', name: '测试套件' },
  ];

  return (
    <div style={styles.apiWorkspace}>
      {/* 左侧：项目与接口树 - 复用 ApiManagement 的样式 */}
      <div style={styles.innerSidebar}>
        <div style={styles.innerSidebarHeader}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>项目目录</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 顶部 Tab 切换 */}
          <div style={{ display: 'flex', gap: '5px', padding: '10px 10px', borderBottom: '1px solid #e2e8f0' }}>
            {innerTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setInnerTab(tab.id)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #dbeafe',
                  backgroundColor: innerTab === tab.id ? '#2563eb' : '#eff6ff',
                  color: innerTab === tab.id ? '#fff' : '#1d4ed8',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  flex: 1,
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* 项目列表 */}
          <ul style={styles.projectList}>
            {projects.map(p => (
              <li key={p.id} style={styles.projectItem}>
                <div 
                  style={{ 
                    ...styles.projectName, 
                    ...(selectedProject === p.id ? styles.projectNameActive : {}) 
                  }}
                  onClick={() => {
                    setSelectedProject(p.id);
                    setSelectedApi(null);
                  }}
                >
                  📁 {p.name}
                </div>

                {selectedProject === p.id && (
                  <ul style={styles.apiList}>
                    {projectApis.map(api => (
                      <li
                        key={api.id}
                        style={{
                          ...styles.apiItem,
                          ...(selectedApi?.id === api.id ? { backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 'bold' } : {}),
                        }}
                        onClick={() => handleSelectApi(api)}
                      >
                        <span style={
                          api.method === 'GET' ? styles.methodGet : 
                          api.method === 'POST' ? styles.methodPost : 
                          styles.methodOther
                        }>
                          {api.method}
                        </span>
                        <span>{api.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 右侧：测试用例内容区 */}
      <div style={styles.apiDetailArea}>
        {innerTab === 'single' ? (
          selectedProject && selectedApi ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                  测试用例 - {selectedApi.method} {selectedApi.url}
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setSelectedConstraints([]);
                      setSelectedCaseTypes([]);
                      setGenerateCount(5);
                      setShowAiGenerateModal(true);
                    }}
                    style={{...styles.confirmBtn, backgroundColor: '#8b5cf6'}}
                  >
                    ✨ AI生成用例
                  </button>
                  <button
                    onClick={() => setShowCaseForm(!showCaseForm)}
                    style={styles.confirmBtn}
                  >
                    {showCaseForm ? '取消' : '+ 新建用例'}
                  </button>
                </div>
              </div>

              {/* AI生成用例弹出卡片 */}
              {showAiGenerateModal && (
                <>
                  <div style={styles.backdrop} onClick={handleAiGenerateClose}></div>
                  <div style={{...styles.modal, maxWidth: '500px', zIndex: 1001}}>
                    <h2 style={{...styles.modalHeader, marginBottom: '16px'}}>🤖 AI生成测试用例</h2>
                    
                    <div style={{marginBottom: '16px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                        <label style={{fontWeight: 'bold', color: '#334155', fontSize: '14px'}}>
                          📋 考虑的约束条件
                        </label>
                        {apiConstraints.length > 0 && (
                          <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#2563eb'}}>
                            <input
                              type="checkbox"
                              checked={selectedConstraints.length === apiConstraints.length && apiConstraints.length > 0}
                              onChange={handleSelectAllConstraints}
                              style={{cursor: 'pointer'}}
                            />
                            全选
                          </label>
                        )}
                      </div>
                      {apiConstraints.length === 0 ? (
                        <div style={{padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px', color: '#94a3b8', fontSize: '13px', textAlign: 'center'}}>
                          暂无可用的约束条件
                        </div>
                      ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
                          {apiConstraints.map(constraint => (
                            <label key={constraint.id} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px'}}>
                              <input
                                type="checkbox"
                                checked={selectedConstraints.includes(constraint.id)}
                                onChange={() => handleSelectConstraint(constraint.id)}
                                style={{cursor: 'pointer'}}
                              />
                              <span>{constraint.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{marginBottom: '16px'}}>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155', fontSize: '14px'}}>
                        🎯 测试用例类型
                      </label>
                      <div style={{display: 'flex', gap: '10px'}}>
                        <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1, padding: '10px', backgroundColor: selectedCaseTypes.includes('positive') ? '#dbeafe' : '#f8fafc', borderRadius: '6px', border: selectedCaseTypes.includes('positive') ? '1px solid #2563eb' : '1px solid #e2e8f0'}}>
                          <input
                            type="checkbox"
                            checked={selectedCaseTypes.includes('positive')}
                            onChange={() => handleSelectCaseType('positive')}
                            style={{cursor: 'pointer'}}
                          />
                          <span style={{fontSize: '13px', fontWeight: 500}}>正向功能验证</span>
                        </label>
                        <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1, padding: '10px', backgroundColor: selectedCaseTypes.includes('negative') ? '#dbeafe' : '#f8fafc', borderRadius: '6px', border: selectedCaseTypes.includes('negative') ? '1px solid #2563eb' : '1px solid #e2e8f0'}}>
                          <input
                            type="checkbox"
                            checked={selectedCaseTypes.includes('negative')}
                            onChange={() => handleSelectCaseType('negative')}
                            style={{cursor: 'pointer'}}
                          />
                          <span style={{fontSize: '13px', fontWeight: 500}}>异常输入</span>
                        </label>
                      </div>
                    </div>

                    <div style={{marginBottom: '16px'}}>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155', fontSize: '14px'}}>
                        📊 生成用例数量
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        style={{...styles.input, marginBottom: 0}}
                      />
                      <div style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>最多生成50个用例</div>
                    </div>

                    <div style={{...styles.modalFooter, marginTop: '20px'}}>
                      <button
                        onClick={handleAiGenerateClose}
                        style={styles.cancelBtn}
                      >
                        取消
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedCaseTypes.length) {
                            alert('请选择至少一种测试用例类型');
                            return;
                          }

                          setIsGenerating(true);
                          try {
                            // 第一步：调用后端生成完整的输入空间划分流程
                            console.log('🔄 第1步：生成输入空间划分...');
                            const partitionResponse = await fetch(`http://localhost:8080/projects/${selectedProject}/apis/${selectedApi.id}/generate-full-partition`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                            });

                            if (!partitionResponse.ok) {
                              const errorData = await partitionResponse.json();
                              alert(`输入空间生成失败: ${errorData.detail || '未知错误'}`);
                              return;
                            }

                            const partitionResult = await partitionResponse.json();
                            
                            if (partitionResult.status !== 'success') {
                              alert('输入空间生成失败: 返回数据格式错误');
                              return;
                            }

                            console.log('✅ 第1步完成：输入空间划分生成成功', partitionResult);
                            alert(`✅ 步骤1完成：生成完整的输入空间划分\n- 单参数空间: ${partitionResult.single_spaces.count}个参数\n- 多参数空间(混合前): ${partitionResult.multi_spaces_before.count}个空间\n- 多参数空间(混合后): ${partitionResult.multi_spaces_after.count}个空间`);

                            // 第二步：生成具体的测试用例
                            console.log('🔄 第2步：生成测试用例...', `请求${generateCount}个用例`);
                            const testCaseResponse = await fetch(`http://localhost:8080/projects/${selectedProject}/apis/${selectedApi.id}/generate-test-cases`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ count: generateCount }),
                            });

                            if (!testCaseResponse.ok) {
                              const errorData = await testCaseResponse.json();
                              alert(`测试用例生成失败: ${errorData.detail || '未知错误'}`);
                              return;
                            }

                            const testCasesResult = await testCaseResponse.json();
                            
                            if (testCasesResult.status !== 'success') {
                              alert('测试用例生成失败: 返回数据格式错误');
                              return;
                            }

                            console.log('✅ 第2步完成：测试用例生成成功', testCasesResult);
                            alert(`✅ 步骤2完成：生成测试用例成功\n- 总用例数: ${testCasesResult.count}个`);

                            // 生成接口已自动落库，刷新当前API用例
                            await loadCasesFromDatabase(selectedProject, selectedApi);

                            setFullPipelineResult(partitionResult);
                            setShowResultModal(true);
                            handleAiGenerateClose();
                            alert(`✅ 成功生成并保存${testCasesResult.count}个测试用例！`);

                          } catch (error) {
                            alert(`生成失败: ${error.message}`);
                            console.error('生成流程错误:', error);
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                        disabled={isGenerating}
                        style={{...styles.confirmBtn, backgroundColor: '#8b5cf6', opacity: isGenerating ? 0.6 : 1, cursor: isGenerating ? 'not-allowed' : 'pointer'}}
                      >
                        {isGenerating ? '⏳ 生成中...' : '生成用例'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 新建用例表单 */}
              {showCaseForm && (
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <input
                    type="text"
                    placeholder="用例名称"
                    value={newCase.title}
                    onChange={e => setNewCase({ ...newCase, title: e.target.value })}
                    style={styles.input}
                  />
                  <textarea
                    placeholder="用例描述"
                    value={newCase.description}
                    onChange={e => setNewCase({ ...newCase, description: e.target.value })}
                    style={{ ...styles.textarea, minHeight: '80px', marginBottom: '10px' }}
                  />
                  <input
                    type="number"
                    placeholder="预期状态码"
                    value={newCase.expectedStatus}
                    onChange={e => setNewCase({ ...newCase, expectedStatus: parseInt(e.target.value) })}
                    style={styles.input}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button onClick={handleAddTestCase} style={styles.confirmBtn}>
                      保存
                    </button>
                    <button
                      onClick={() => setShowCaseForm(false)}
                      style={styles.cancelBtn}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* 用例列表表格 */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>测试用例</h4>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={async () => {
                        const currentCases = currentProjectCases.filter(c => c.apiId === selectedApi.id);
                        const unadoptedCases = currentCases.filter(c => c.status !== '已采纳');
                        if (unadoptedCases.length === 0) {
                          alert('当前没有可采纳的用例');
                          return;
                        }

                        try {
                          await adoptCasesToDatabase(selectedProject, selectedApi.id, unadoptedCases);
                          await loadCasesFromDatabase(selectedProject, selectedApi);
                          alert(`已采纳 ${unadoptedCases.length} 个用例`);
                        } catch (error) {
                          alert(`采纳失败: ${error.message}`);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#fff',
                        color: '#2563eb',
                        border: '1px solid #2563eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      全部采纳
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedProject || !selectedApi) {
                          alert('请先选择项目和 API');
                          return;
                        }

                        try {
                          const response = await fetch(
                            `${API_BASE_URL}/projects/${selectedProject}/apis/${selectedApi.id}/run-adopted-test-cases`,
                            { method: 'POST' }
                          );

                          const data = await response.json();
                          if (!response.ok) {
                            throw new Error(data.detail || '创建执行任务失败');
                          }

                          alert(`执行任务已创建，任务ID: ${data.task_id}`);
                          if (typeof onTaskCreated === 'function') {
                            onTaskCreated(data.task_id, selectedProject);
                          }
                        } catch (error) {
                          alert(`全部执行失败: ${error.message}`);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#fff',
                        color: '#2563eb',
                        border: '1px solid #2563eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      全部运行
                    </button>
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'auto' }}>
                  <table style={styles.paramsTable}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={{...styles.tableCell, width: '50px'}}>序号</th>
                        <th style={{...styles.tableCell, width: '90px'}}>用例名称</th>
                        <th style={{...styles.tableCell}}>描述</th>
                        <th style={{...styles.tableCell, width: '80px'}}>用例类型</th>
                        <th style={{...styles.tableCell, width: '80px'}}>预期状态</th>
                        <th style={{...styles.tableCell, width: '80px'}}>采纳状态</th>
                        <th style={{...styles.tableCell, width: '100px'}}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingCases && (
                        <tr>
                          <td colSpan="7" style={{...styles.tableCell, textAlign: 'center', color: '#64748b'}}>
                            正在从数据库加载测试用例...
                          </td>
                        </tr>
                      )}
                      {!isLoadingCases && currentProjectCases.filter(c => c.apiId === selectedApi.id).length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{...styles.tableCell, textAlign: 'center', color: '#999'}}>
                            暂无测试用例
                          </td>
                        </tr>
                      ) : (
                        currentProjectCases
                          .filter(c => c.apiId === selectedApi.id)
                          .map((testCase, index) => (
                            <tr key={testCase.id} style={styles.tableRow}>
                              <td style={{...styles.tableCell, width: '50px'}}>{index + 1}</td>
                              <td
                                style={{
                                  ...styles.tableCell,
                                  width: '90px',
                                  maxWidth: '90px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={testCase.title}
                              >
                                {testCase.title}
                              </td>
                              <td style={styles.tableCell}>{testCase.description}</td>
                              <td style={{...styles.tableCell, width: '80px', textAlign: 'center'}}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: '3px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: testCase.case_type === '异常输入' ? '#fee2e2' : '#dbeafe',
                                    color: testCase.case_type === '异常输入' ? '#991b1b' : '#1e40af'
                                  }}
                                >
                                  {testCase.case_type || '正向用例'}
                                </span>
                              </td>
                              <td style={{...styles.tableCell, width: '80px'}}>{testCase.expectedStatus}</td>
                              <td style={{...styles.tableCell, width: '80px', textAlign: 'center'}}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: '3px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: testCase.status === '已采纳' ? '#dcfce7' : '#fef3c7',
                                    color: testCase.status === '已采纳' ? '#166534' : '#92400e'
                                  }}
                                >
                                  {testCase.status || '未采纳'}
                                </span>
                              </td>
                              <td style={{...styles.tableCell, width: '100px', whiteSpace: 'nowrap'}}>
                                <button
                                  onClick={() => {
                                    setSelectedTestCase(testCase);
                                    setShowTestCaseDetail(true);
                                  }}
                                  style={{border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', padding: 0}}
                                >
                                  详情
                                </button>
                                <span style={{margin: '0 6px', color: '#cbd5e1'}}>·</span>
                                {testCase.status !== '已采纳' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await adoptCasesToDatabase(selectedProject, selectedApi.id, [testCase]);
                                          await loadCasesFromDatabase(selectedProject, selectedApi);
                                        } catch (error) {
                                          alert(`采纳失败: ${error.message}`);
                                        }
                                      }}
                                      style={{border: 'none', background: 'none', color: '#10b981', cursor: 'pointer', fontSize: '14px', padding: 0, fontWeight: 'bold'}}
                                    >
                                      采纳
                                    </button>
                                    <span style={{margin: '0 6px', color: '#cbd5e1'}}>·</span>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDeleteTestCase(testCase.id)}
                                  style={{border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: 0}}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 用例详情模态框 */}
              {showTestCaseDetail && selectedTestCase && (
                <>
                  <div style={styles.backdrop} onClick={() => setShowTestCaseDetail(false)}></div>
                  <div style={{...styles.modal, maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto', zIndex: 1001}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                      <h3 style={{margin: 0, color: '#1e293b'}}>📋 用例详情</h3>
                      <button
                        onClick={() => setShowTestCaseDetail(false)}
                        style={{border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8'}}
                      >
                        ✕
                      </button>
                    </div>

                    {/* 基本信息 */}
                    <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0'}}>
                      <h4 style={{color: '#475569', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>基本信息</h4>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px'}}>
                        <div>
                          <label style={{color: '#94a3b8', fontSize: '12px'}}>用例名称</label>
                          <div style={{color: '#1e293b', fontWeight: '500'}}>{selectedTestCase.title}</div>
                        </div>
                        <div>
                          <label style={{color: '#94a3b8', fontSize: '12px'}}>预期状态码</label>
                          <div style={{color: '#1e293b', fontWeight: '500'}}>{selectedTestCase.expectedStatus}</div>
                        </div>
                        <div style={{gridColumn: '1 / -1'}}>
                          <label style={{color: '#94a3b8', fontSize: '12px'}}>描述</label>
                          <div style={{color: '#1e293b', whiteSpace: 'pre-wrap', fontWeight: '500'}}>{selectedTestCase.description}</div>
                        </div>
                      </div>
                    </div>

                    {/* 请求信息 */}
                    <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0'}}>
                      <h4 style={{color: '#475569', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>📡 请求信息</h4>
                      <div style={{backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', marginBottom: '12px'}}>
                        <div style={{marginBottom: '8px'}}>
                          <span style={{color: '#2563eb', fontWeight: 'bold'}}>{selectedTestCase.apiMethod}</span>
                          <span style={{marginLeft: '8px', color: '#1e293b'}}>{selectedTestCase.apiUrl}</span>
                        </div>
                      </div>
                    </div>

                    {/* Query 参数 */}
                    {selectedTestCase.query_params && Object.keys(selectedTestCase.query_params).length > 0 && (
                      <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0'}}>
                        <h4 style={{color: '#475569', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>Query 参数</h4>
                        <div style={{backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace'}}>
                          {Object.entries(selectedTestCase.query_params).map(([key, value]) => (
                            <div key={key} style={{marginBottom: '6px', display: 'flex', justifyContent: 'space-between'}}>
                              <span style={{color: '#2563eb'}}>{key}:</span>
                              <span style={{color: '#1e293b'}}>{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Path 参数 */}
                    {selectedTestCase.path_params && Object.keys(selectedTestCase.path_params).length > 0 && (
                      <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0'}}>
                        <h4 style={{color: '#475569', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>Path 参数</h4>
                        <div style={{backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace'}}>
                          {Object.entries(selectedTestCase.path_params).map(([key, value]) => (
                            <div key={key} style={{marginBottom: '6px', display: 'flex', justifyContent: 'space-between'}}>
                              <span style={{color: '#2563eb'}}>{key}:</span>
                              <span style={{color: '#1e293b'}}>{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Headers 参数 */}
                    {selectedTestCase.headers_params && Object.keys(selectedTestCase.headers_params).length > 0 && (
                      <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0'}}>
                        <h4 style={{color: '#475569', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>Headers</h4>
                        <div style={{backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace'}}>
                          {Object.entries(selectedTestCase.headers_params).map(([key, value]) => (
                            <div key={key} style={{marginBottom: '6px', display: 'flex', justifyContent: 'space-between'}}>
                              <span style={{color: '#2563eb'}}>{key}:</span>
                              <span style={{color: '#1e293b'}}>{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Body 参数 */}
                    {selectedTestCase.body_params && Object.keys(selectedTestCase.body_params).length > 0 && (
                      <div style={{marginBottom: '16px'}}>
                        <h4 style={{color: '#475569', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>Request Body</h4>
                        <div style={{backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto'}}>
                          <pre style={{margin: 0, color: '#1e293b', whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                            {JSON.stringify(selectedTestCase.body_params, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* 关闭按钮 */}
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0'}}>
                      <button
                        onClick={() => setShowTestCaseDetail(false)}
                        style={styles.confirmBtn}
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              <p>请先选择项目和 API</p>
            </div>
          )
        ) : (
          <div style={styles.emptyState}>
            <p>测试套件功能开发中...</p>
          </div>
        )}
      </div>

      {/* 完整生成流程结果展示模态框 */}
      {showResultModal && fullPipelineResult && (
        <>
          <div style={styles.backdrop} onClick={() => setShowResultModal(false)}></div>
          <div style={{...styles.modal, width: '80%', maxHeight: '90vh', overflow: 'auto'}}>
            <div style={{...styles.modalHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>✅ 完整输入空间生成结果</h2>
              <button 
                onClick={() => setShowResultModal(false)}
                style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}
              >×</button>
            </div>

            <div style={{padding: '20px', fontSize: '14px', lineHeight: '1.6', color: '#333'}}>
              <div style={{marginBottom: '20px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '4px', borderLeft: '4px solid #3b82f6'}}>
                <div style={{fontSize: '12px', color: '#666'}}>缓存状态</div>
                <div style={{display: 'flex', gap: '20px', marginTop: '8px'}}>
                  <div>
                    <span style={{fontSize: '12px', fontWeight: 'bold'}}>SISP (单参数空间):</span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      backgroundColor: fullPipelineResult.from_cache?.sisp ? '#dcfce7' : '#fef3c7',
                      color: fullPipelineResult.from_cache?.sisp ? '#166534' : '#92400e',
                      fontSize: '12px'
                    }}>
                      {fullPipelineResult.from_cache?.sisp ? '📦 从缓存读取' : '✨ 新生成'}
                    </span>
                  </div>
                  <div>
                    <span style={{fontSize: '12px', fontWeight: 'bold'}}>MISP (多参数空间):</span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      backgroundColor: fullPipelineResult.from_cache?.misp ? '#dcfce7' : '#fef3c7',
                      color: fullPipelineResult.from_cache?.misp ? '#166534' : '#92400e',
                      fontSize: '12px'
                    }}>
                      {fullPipelineResult.from_cache?.misp ? '📦 从缓存读取' : '✨ 新生成'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{marginBottom: '20px'}}>
                <h3 style={{color: '#8b5cf6', marginBottom: '10px'}}>📊 生成统计</h3>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                  <div style={{padding: '10px', backgroundColor: '#f0f4ff', borderRadius: '4px'}}>
                    <div style={{fontSize: '12px', color: '#666'}}>单参数空间 (SISP)</div>
                    <div style={{fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6'}}>
                      {fullPipelineResult.single_spaces.count} 参数
                    </div>
                  </div>
                  <div style={{padding: '10px', backgroundColor: '#f5f0ff', borderRadius: '4px'}}>
                    <div style={{fontSize: '12px', color: '#666'}}>多参数空间 - 混合前</div>
                    <div style={{fontSize: '20px', fontWeight: 'bold', color: '#6d28d9'}}>
                      {fullPipelineResult.multi_spaces_before.count} 空间
                    </div>
                  </div>
                  <div style={{padding: '10px', backgroundColor: '#f9f5ff', borderRadius: '4px'}}>
                    <div style={{fontSize: '12px', color: '#666'}}>多参数空间 - 混合后</div>
                    <div style={{fontSize: '20px', fontWeight: 'bold', color: '#5b21b6'}}>
                      {fullPipelineResult.multi_spaces_after.count} 空间
                    </div>
                  </div>
                </div>
              </div>

              <div style={{marginBottom: '20px'}}>
                <h3 style={{color: '#8b5cf6', marginBottom: '10px'}}>📝 单参数列表 (SISP)</h3>
                <div style={{
                  backgroundColor: '#f9f5ff',
                  padding: '10px',
                  borderRadius: '4px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {fullPipelineResult.single_spaces.parameters.map((param, idx) => (
                    <span key={idx} style={{
                      backgroundColor: '#e9d5ff',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}>
                      {param}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{marginBottom: '20px'}}>
                <h3 style={{color: '#8b5cf6', marginBottom: '10px'}}>🔗 多参数空间 - 混合前 (示例前2个)</h3>
                <pre style={{
                  backgroundColor: '#f5f3ff',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(fullPipelineResult.multi_spaces_before.spaces, null, 2)}
                </pre>
              </div>

              <div style={{marginBottom: '20px'}}>
                <h3 style={{color: '#8b5cf6', marginBottom: '10px'}}>🎯 多参数空间 - 混合后 (示例前2个)</h3>
                <pre style={{
                  backgroundColor: '#faf5ff',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(fullPipelineResult.multi_spaces_after.spaces, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{...styles.modalFooter, display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button 
                onClick={() => setShowResultModal(false)}
                style={styles.cancelBtn}
              >
                关闭
              </button>
              <button 
                onClick={() => {
                  // 导出为JSON文件
                  const dataStr = JSON.stringify(fullPipelineResult, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `partition_result_api_${fullPipelineResult.api_id}_${new Date().getTime()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                style={{...styles.confirmBtn, backgroundColor: '#10b981'}}
              >
                导出JSON
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

