import { useState, useEffect } from 'react';
import ApiManagement from './components/ApiManagement';
import CreateProjectModal from './components/CreateProjectModal';
import CreateApiModal from './components/CreateApiModal';

function App() {
  // --- 🌟 核心状态 ---
  const [activeTab, setActiveTab] = useState('api');

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
  
  // 💥 新增：记录当前点选了哪个项目、哪个接口
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedApi, setSelectedApi] = useState(null);
  const [selectedApiData, setSelectedApiData] = useState(null);
  const [showProjectOverview, setShowProjectOverview] = useState(false);

  useEffect(() => {
    if (selectedApi && apis.length > 0) {
      const apiData = apis.find(a => a.id === selectedApi);
      setSelectedApiData(apiData || null);
      // 清除参数
      setHeaders([]);
      setQueryParams([]);
      setPathParams([]);
      setBodyType('json');
      setBodyData('');
      setBodyFormData([]);
      setResponseData('');
      setParamsTab('headers');
    } else {
      setSelectedApiData(null);
    }
  }, [selectedApi, apis]);

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

  const handleSendRequest = async () => {
    if (!selectedApiData) {
      setStatusMsg('🔴 请先选择一个接口');
      return;
    }

    try {
      setStatusMsg('🟡 正在发送请求...');

      let url = selectedApiData.url;
      const requestInit = {
        method: selectedApiData.method,
        headers: {},
      };

      // 解析并添加 Headers（从表格数据）
      const activeHeaders = headers.filter(h => h.key && h.value);
      if (activeHeaders.length > 0) {
        activeHeaders.forEach(h => {
          requestInit.headers[h.key] = h.value;
        });
      }

      // 添加 Query 参数（从表格数据）
      const activeQueryParams = queryParams.filter(p => p.name && p.value);
      if (activeQueryParams.length > 0) {
        const searchParams = new URLSearchParams();
        activeQueryParams.forEach(p => {
          searchParams.append(p.name, p.value);
        });
        url = `${url}?${searchParams.toString()}`;
      }

      // 添加 Body
      if (['POST', 'PUT', 'PATCH'].includes(selectedApiData.method)) {
        if (bodyType === 'json') {
          if (bodyData.trim()) {
            try {
              const body = JSON.parse(bodyData);
              requestInit.body = JSON.stringify(body);
              requestInit.headers['Content-Type'] = 'application/json';
            } catch (e) {
              setStatusMsg('🔴 Body JSON 格式错误');
              return;
            }
          }
        } else if (bodyType === 'form') {
          const activeFormData = bodyFormData.filter(f => f.key && f.value);
          if (activeFormData.length > 0) {
            const formEncoded = activeFormData
              .map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
              .join('&');
            requestInit.body = formEncoded;
            requestInit.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        }
      }

      // 发送请求（这里使用 mock，实际应该调用真实的 API）
      const res = await fetch(url, requestInit);
      const data = await res.json();

      setResponseData(JSON.stringify(data, null, 2));
      setStatusMsg(`🟢 请求成功 (${res.status})`);
    } catch (error) {
      setResponseData(error.message);
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
            setSelectedProjectId={setSelectedProjectId}
            setSelectedApi={setSelectedApi}
            styles={styles}
          />
        )}

        {/* 自动化测试 与 测试报告 占位 */}
        {activeTab === 'auto' && <h2>自动化测试引擎 (开发中...)</h2>}
        {activeTab === 'report' && <h2>测试报告看板 (开发中...)</h2>}

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
  logo: { padding: '20px', fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #334155' },
  nav: { flex: 1, padding: '15px 10px' },
  navItem: { display: 'block', width: '100%', padding: '10px 15px', marginBottom: '5px', textAlign: 'left', backgroundColor: 'transparent', color: '#cbd5e1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' },
  navItemActive: { backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold' },
  statusFooter: { padding: '15px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #334155' },
  
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', overflow: 'hidden' },
  
  // 接口管理工作区核心布局
  apiWorkspace: { display: 'flex', flex: 1, height: '100%' },
  
  // 中间项目树状菜单
  innerSidebar: { width: '260px', backgroundColor: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' },
  innerSidebarHeader: { padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  createProjectBtn: { border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '999px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 },
  // Modal 样式（简单卡片）
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '420px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)', zIndex: 1001 },
  modalHeader: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' },
  closeBtn: { display: 'none' },
  modalContent: { marginBottom: '12px' },
  formGroup: { marginBottom: '10px' },
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', marginBottom: '8px' },
  fileInputWrapper: { display: 'none' },
  fileInput: { display: 'none' },
  fileInputLabel: { display: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' },
  cancelBtn: { padding: '6px 12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  confirmBtn: { padding: '6px 12px', border: 'none', backgroundColor: '#2563eb', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 },
  
  // 旧 Modal 样式（兼容）
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modalCard: { width: '100%', maxWidth: '460px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)' },
  createCardTitle: { margin: '0 0 10px 0', fontSize: '14px', color: '#1e3a8a' },
  cardInput: { width: '100%', boxSizing: 'border-box', marginBottom: '8px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' },
  cardFileInput: { width: '100%', marginBottom: '10px', fontSize: '12px' },
  fileHint: { fontSize: '12px', color: '#64748b', marginBottom: '10px' },
  cardActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  cardCancelBtn: { padding: '6px 10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '6px', cursor: 'pointer' },
  cardCreateBtn: { padding: '6px 10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', cursor: 'pointer', opacity: 1 },
  cardCreateBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' },
  
  projectList: { listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto' },
  projectItem: { borderBottom: '1px solid #f1f5f9' },
  projectName: { padding: '12px 15px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#334155' },
  projectNameActive: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
  
  // 接口列表
  apiList: { listStyle: 'none', padding: '5px 0', margin: 0, backgroundColor: '#f8fafc' },
  apiItem: { padding: '8px 15px 8px 30px', fontSize: '13px', display: 'flex', alignItems: 'center', color: '#475569', borderBottom: '1px solid #f1f5f9' },
  deleteApiBtn: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px', padding: '0 5px', marginLeft: 'auto', opacity: 0.6 },
  methodGet: { color: '#10b981', fontWeight: 'bold', marginRight: '8px', fontSize: '12px' },
  methodPost: { color: '#f59e0b', fontWeight: 'bold', marginRight: '8px', fontSize: '12px' },
  methodOther: { color: '#8b5cf6', fontWeight: 'bold', marginRight: '8px', fontSize: '12px' },
  
  // 右侧详情区
  apiDetailArea: { flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f9fafb' },
  emptyState: { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' },
  projectOverview: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  overviewSection: { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' },
  overviewValue: { color: '#1e293b', fontSize: '14px', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '4px', margin: '8px 0' },
  overviewApiList: { listStyle: 'none', padding: 0, margin: '10px 0' },
  overviewApiItem: { padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  overviewUrl: { marginLeft: 'auto', fontSize: '12px', color: '#64748b', backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' },
  
  // 接口编辑面板
  apiEditor: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' },
  urlBar: { display: 'flex', marginBottom: '20px' },
  methodSelect: { padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px', backgroundColor: '#f8fafc', fontWeight: 'bold' },
  urlInput: { flex: 1, padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderLeft: 'none', borderRight: 'none', outline: 'none' },
  sendBtn: { padding: '10px 20px', fontSize: '14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontWeight: 'bold' },
  
  paramsSection: { flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' },
  paramsTabs: { display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid #e2e8f0' },
  paramsTab: { padding: '8px 12px', border: 'none', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: 500, borderBottom: '2px solid transparent' },
  paramsTabActive: { color: '#2563eb', borderBottom: '2px solid #2563eb' },
  paramsTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '12px' },
  tableHeader: { backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  tableCell: { padding: '10px', textAlign: 'left' },
  paramInput: { width: '100%', boxSizing: 'border-box', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' },
  paramSelect: { width: '100%', boxSizing: 'border-box', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' },
  addParamBtn: { padding: '6px 12px', border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },
  deleteParamBtn: { padding: '4px 8px', border: '1px solid #fecaca', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  textarea: { width: '100%', height: '150px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', fontSize: '12px' },
  
  responseArea: { flex: 1, display: 'flex', flexDirection: 'column' },
  responseBox: { flex: 1, backgroundColor: '#1e293b', color: '#a7f3d0', padding: '15px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
};

export default App;