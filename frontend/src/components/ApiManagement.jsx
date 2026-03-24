import { useState } from 'react';

export default function ApiManagement({ 
  projects, apis, selectedProjectId, selectedApi, selectedApiData,
  queryParams, setQueryParams, pathParams, setPathParams,
  headers, setHeaders, bodyType, setBodyType, bodyData, setBodyData,
  bodyFormData, setBodyFormData, paramsTab, setParamsTab, responseData, setResponseData,
  statusMsg, setStatusMsg, showCreateCard, setShowCreateCard, showAddApiCard, setShowAddApiCard,
  newApiName, setNewApiName, newApiMethod, setNewApiMethod, newApiUrl, setNewApiUrl,
  addingApi, fetchApis, handleCreateApi, handleDeleteApi, handleSendRequest, handleSaveParameters,
  setSelectedProjectId, setSelectedApi,
  editingProjectId, setEditingProjectId, tempBaseUrl, setTempBaseUrl, handleUpdateBaseUrl,
  constraintsTab, setConstraintsTab, singleConstraints, setSingleConstraints, dependencies, setDependencies,
  showAiGenerateModal, setShowAiGenerateModal, aiPrompt, setAiPrompt, aiGenerateType, setAiGenerateType, 
  isConstraintGenerating, setIsConstraintGenerating, handleAiGenerateConstraints,
  availableRequestBodies,
  styles
}) {
  return (
    <div style={styles.apiWorkspace}>
      {/* 左侧：项目与接口树 */}
      <div style={styles.innerSidebar}>
        <div style={styles.innerSidebarHeader}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>项目目录</h3>
          <button
            style={styles.createProjectBtn}
            onClick={() => setShowCreateCard(true)}
          >
            + 新建项目
          </button>
        </div>
        
        <ul style={styles.projectList}>
          {projects.map(p => (
            <li key={p.id} style={styles.projectItem}>
              <div 
                style={{ 
                  ...styles.projectName, 
                  ...(selectedProjectId === p.id ? styles.projectNameActive : {}) 
                }}
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setSelectedApi(null);
                }}
              >
                📁 {p.name}
              </div>
              
              {selectedProjectId === p.id && (
                <ul style={styles.apiList}>
                  {apis.map(api => (
                    <li 
                      key={api.id} 
                      style={{
                        ...styles.apiItem,
                        ...(selectedApi === api.id ? { backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 'bold' } : {})
                      }}
                    >
                      <div 
                        style={{flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer'}}
                        onClick={() => setSelectedApi(api.id)}
                      >
                        <span style={api.method === 'GET' ? styles.methodGet : styles.methodPost}>{api.method}</span> {api.name}
                      </div>
                      <button
                        style={styles.deleteApiBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteApi(api.id);
                        }}
                        title="删除接口"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                  <li 
                    style={{...styles.apiItem, color: '#3b82f6', justifyContent: 'center', cursor: 'pointer'}}
                    onClick={() => setShowAddApiCard(true)}
                  >
                    + 添加新接口
                  </li>
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* 右侧：项目概览或接口测试 */}
      <div style={styles.apiDetailArea}>
        {!selectedApi ? (
          selectedProjectId && projects.find(p => p.id === selectedProjectId) ? (
            <div style={styles.projectOverview}>
              <h2>{projects.find(p => p.id === selectedProjectId)?.name}</h2>
              <div style={styles.overviewSection}>
                <h4>Base URL</h4>
                {editingProjectId === selectedProjectId ? (
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <input
                      type="text"
                      value={tempBaseUrl}
                      onChange={(e) => setTempBaseUrl(e.target.value)}
                      placeholder="输入 Base URL"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #94a3b8',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      onClick={() => handleUpdateBaseUrl(selectedProjectId)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingProjectId(null);
                        setTempBaseUrl('');
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <p style={styles.overviewValue}>{projects.find(p => p.id === selectedProjectId)?.base_url || '未设置'}</p>
                    <button
                      onClick={() => {
                        setEditingProjectId(selectedProjectId);
                        setTempBaseUrl(projects.find(p => p.id === selectedProjectId)?.base_url || '');
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      编辑
                    </button>
                  </div>
                )}
              </div>
              <div style={styles.overviewSection}>
                <h4>接口列表 ({apis.length})</h4>
                {apis.length > 0 ? (
                  <ul style={styles.overviewApiList}>
                    {apis.map(api => (
                      <li key={api.id} style={styles.overviewApiItem}>
                        <span style={api.method === 'GET' ? styles.methodGet : api.method === 'POST' ? styles.methodPost : styles.methodOther}>
                          {api.method}
                        </span>
                        <span style={{marginLeft: '10px'}}>{api.name}</span>
                        <code style={styles.overviewUrl}>{api.url}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{color: '#94a3b8'}}>暂无接口，点击左侧 "+ 添加新接口" 开始</p>
                )}
              </div>
              {/* 参数依赖展示 */}
              <div style={styles.overviewSection}>
                <h4>参数依赖关系</h4>
                {dependencies && dependencies.length > 0 ? (
                  <ul style={styles.overviewApiList}>
                    {dependencies.map((dep, index) => (
                      <li key={index} style={styles.overviewApiItem}>
                        <strong>{dep.name}</strong>: {dep.parameters && dep.parameters.map(p => p.name).join(', ')}
                        <p style={{margin: 0, color: '#6b7280'}}>{dep.constraint}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{color: '#94a3b8'}}>暂无依赖关系</p>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={{fontSize: '40px', marginBottom: '10px'}}>👈</div>
              <h3>请在左侧选择一个项目</h3>
              <p>或者点击 "+ 新建项目" 创建新项目</p>
            </div>
          )
        ) : (
          <div style={styles.apiEditor}>
            <h2 style={{marginTop: 0}}>接口测试</h2>
            <div style={styles.urlBar}>
              <select style={styles.methodSelect} value={selectedApiData?.method || 'GET'} disabled>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>PATCH</option>
              </select>
              <input 
                type="text" 
                placeholder="https://api.example.com/users" 
                value={selectedApiData?.url || ''}
                readOnly
                style={styles.urlInput} 
              />
              <button style={styles.sendBtn} onClick={handleSendRequest}>发送</button>
            </div>

            {/* 参数编辑区 */}
            <div style={styles.paramsSection}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <div style={styles.paramsTabs}>
                  <button 
                    style={{...styles.paramsTab, ...(paramsTab === 'headers' ? styles.paramsTabActive : {})}}
                    onClick={() => setParamsTab('headers')}
                  >
                    Headers
                  </button>
                  <button 
                    style={{...styles.paramsTab, ...(paramsTab === 'query' ? styles.paramsTabActive : {})}}
                    onClick={() => setParamsTab('query')}
                  >
                    Query
                  </button>
                  <button 
                    style={{...styles.paramsTab, ...(paramsTab === 'path' ? styles.paramsTabActive : {})}}
                    onClick={() => setParamsTab('path')}
                  >
                    Path
                  </button>
                  <button 
                    style={{...styles.paramsTab, ...(paramsTab === 'body' ? styles.paramsTabActive : {})}}
                    onClick={() => setParamsTab('body')}
                  >
                    Body
                  </button>
                  <button 
                    style={{...styles.paramsTab, ...(paramsTab === 'constraints' ? styles.paramsTabActive : {})}}
                    onClick={() => setParamsTab('constraints')}
                  >
                    参数约束
                  </button>
                </div>
                <button 
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                  onClick={handleSaveParameters}
                >
                  保存
                </button>
              </div>

              {paramsTab === 'headers' && (
                <div>
                  <h4>Headers</h4>
                  <table style={styles.paramsTable}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.tableCell}>Header 名称</th>
                        <th style={styles.tableCell}>Header 值</th>
                        <th style={styles.tableCell}>描述</th>
                        <th style={styles.tableCell}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headers.map((header, idx) => (
                        <tr key={idx} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <div style={{fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                              <input 
                                type="text" 
                                value={header.key || header.name || ''}
                                onChange={(e) => {
                                  const newHeaders = [...headers];
                                  newHeaders[idx].key = e.target.value;
                                  setHeaders(newHeaders);
                                }}
                                placeholder="如: Content-Type"
                                style={styles.paramInput}
                              />
                              {header.required && <span style={{color: '#ef4444', fontWeight: 'bold', flexShrink: 0}}>*</span>}
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <input 
                              type="text" 
                              value={header.value}
                              onChange={(e) => {
                                const newHeaders = [...headers];
                                newHeaders[idx].value = e.target.value;
                                setHeaders(newHeaders);
                              }}
                              placeholder="如: application/json"
                              style={styles.paramInput}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input 
                              type="text" 
                              value={header.description || ''}
                              onChange={(e) => {
                                const newHeaders = [...headers];
                                newHeaders[idx].description = e.target.value;
                                setHeaders(newHeaders);
                              }}
                              placeholder="描述"
                              style={styles.paramInput}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <button
                              style={styles.deleteParamBtn}
                              onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button 
                    style={styles.addParamBtn}
                    onClick={() => setHeaders([...headers, {key: '', value: '', description: ''}])}
                  >
                    + 添加 Header
                  </button>
                </div>
              )}

              {paramsTab === 'query' && (
                <div>
                  <h4>Query Parameters</h4>
                  <table style={styles.paramsTable}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.tableCell}>参数名</th>
                        <th style={styles.tableCell}>参数值</th>
                        <th style={styles.tableCell}>参数类型</th>
                        <th style={styles.tableCell}>描述</th>
                        <th style={styles.tableCell}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queryParams.map((param, idx) => (
                        <tr key={idx} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <div style={{fontSize: '12px'}}>
                              <input 
                                type="text" 
                                value={param.name}
                                onChange={(e) => {
                                  const newParams = [...queryParams];
                                  newParams[idx].name = e.target.value;
                                  setQueryParams(newParams);
                                }}
                                placeholder="参数名"
                                style={styles.paramInput}
                              />
                              {param.required && <span style={{color: '#ef4444', marginLeft: '4px', fontWeight: 'bold'}}>*</span>}
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <input 
                              type="text" 
                              value={param.value}
                              onChange={(e) => {
                                const newParams = [...queryParams];
                                newParams[idx].value = e.target.value;
                                setQueryParams(newParams);
                              }}
                              placeholder="参数值"
                              style={styles.paramInput}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <select 
                              value={param.type || 'string'}
                              onChange={(e) => {
                                const newParams = [...queryParams];
                                newParams[idx].type = e.target.value;
                                setQueryParams(newParams);
                              }}
                              style={styles.paramSelect}
                            >
                              <option>string</option>
                              <option>number</option>
                              <option>boolean</option>
                              <option>integer</option>
                            </select>
                          </td>
                          <td style={styles.tableCell}>
                            <input 
                              type="text" 
                              value={param.description || ''}
                              onChange={(e) => {
                                const newParams = [...queryParams];
                                newParams[idx].description = e.target.value;
                                setQueryParams(newParams);
                              }}
                              placeholder="描述"
                              style={styles.paramInput}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <button
                              style={styles.deleteParamBtn}
                              onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button 
                    style={styles.addParamBtn}
                    onClick={() => setQueryParams([...queryParams, {name: '', value: '', type: 'string', description: ''}])}
                  >
                    + 添加参数
                  </button>
                </div>
              )}

              {paramsTab === 'path' && (
                <div>
                  <h4>Path Parameters</h4>
                  <table style={styles.paramsTable}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.tableCell}>参数名</th>
                        <th style={styles.tableCell}>参数值</th>
                        <th style={styles.tableCell}>参数类型</th>
                        <th style={styles.tableCell}>描述</th>
                        <th style={styles.tableCell}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pathParams.map((param, idx) => (
                        <tr key={idx} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <div style={{fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                              <input 
                                type="text" 
                                value={param.name}
                                onChange={(e) => {
                                  const newParams = [...pathParams];
                                  newParams[idx].name = e.target.value;
                                  setPathParams(newParams);
                                }}
                                placeholder="参数名"
                                style={styles.paramInput}
                              />
                              {param.required && <span style={{color: '#ef4444', fontWeight: 'bold', flexShrink: 0}}>*</span>}
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <input 
                              type="text" 
                              value={param.value}
                              onChange={(e) => {
                                const newParams = [...pathParams];
                                newParams[idx].value = e.target.value;
                                setPathParams(newParams);
                              }}
                              placeholder="参数值"
                              style={styles.paramInput}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <select 
                              value={param.type || 'string'}
                              onChange={(e) => {
                                const newParams = [...pathParams];
                                newParams[idx].type = e.target.value;
                                setPathParams(newParams);
                              }}
                              style={styles.paramSelect}
                            >
                              <option>string</option>
                              <option>number</option>
                              <option>boolean</option>
                              <option>integer</option>
                            </select>
                          </td>
                          <td style={styles.tableCell}>
                            <input 
                              type="text" 
                              value={param.description || ''}
                              onChange={(e) => {
                                const newParams = [...pathParams];
                                newParams[idx].description = e.target.value;
                                setPathParams(newParams);
                              }}
                              placeholder="描述"
                              style={styles.paramInput}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <button
                              style={styles.deleteParamBtn}
                              onClick={() => setPathParams(pathParams.filter((_, i) => i !== idx))}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button 
                    style={styles.addParamBtn}
                    onClick={() => setPathParams([...pathParams, {name: '', value: '', type: 'string', description: ''}])}
                  >
                    + 添加参数
                  </button>
                </div>
              )}

              {paramsTab === 'body' && (
                <div>
                  <div style={{marginBottom: '12px'}}>
                    {/* 总是显示三种固定的 body 类型 */}
                    <label style={{marginRight: '20px'}}>
                      <input 
                        type="radio" 
                        name="bodyType" 
                        value="json" 
                        checked={bodyType === 'json'}
                        onChange={(e) => setBodyType(e.target.value)}
                      /> JSON
                    </label>
                    <label style={{marginRight: '20px'}}>
                      <input 
                        type="radio" 
                        name="bodyType" 
                        value="xml" 
                        checked={bodyType === 'xml'}
                        onChange={(e) => setBodyType(e.target.value)}
                      /> XML
                    </label>
                    <label>
                      <input 
                        type="radio" 
                        name="bodyType" 
                        value="form" 
                        checked={bodyType === 'form'}
                        onChange={(e) => setBodyType(e.target.value)}
                      /> Form
                    </label>
                  </div>

                  {bodyType === 'json' && (
                    <div>
                      <h4>Request Body (JSON 格式)</h4>
                      <textarea 
                        placeholder='{"name": "John", "email": "john@example.com"}'
                        value={bodyData}
                        onChange={(e) => setBodyData(e.target.value)}
                        style={styles.textarea}
                      ></textarea>
                    </div>
                  )}

                  {bodyType === 'xml' && (
                    <div>
                      <h4>Request Body (XML 格式)</h4>
                      <textarea 
                        placeholder='<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <name>John</name>\n</root>'
                        value={bodyData}
                        onChange={(e) => setBodyData(e.target.value)}
                        style={styles.textarea}
                      ></textarea>
                    </div>
                  )}

                  {bodyType === 'form' && (
                    <div>
                      <h4>Form Data</h4>
                      <table style={styles.paramsTable}>
                        <thead>
                          <tr style={styles.tableHeader}>
                            <th style={styles.tableCell}>参数名</th>
                            <th style={styles.tableCell}>参数值</th>
                            <th style={styles.tableCell}>参数类型</th>
                            <th style={styles.tableCell}>描述</th>
                            <th style={styles.tableCell}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bodyFormData.map((item, idx) => (
                            <tr key={idx} style={styles.tableRow}>
                              <td style={styles.tableCell}>
                                <div style={{fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                  <input 
                                    type="text" 
                                    value={item.key}
                                    onChange={(e) => {
                                      const newData = [...bodyFormData];
                                      newData[idx].key = e.target.value;
                                      setBodyFormData(newData);
                                    }}
                                    placeholder="参数名"
                                    style={styles.paramInput}
                                  />
                                  {item.required && <span style={{color: '#ef4444', fontWeight: 'bold', flexShrink: 0}}>*</span>}
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="text" 
                                  value={item.value}
                                  onChange={(e) => {
                                    const newData = [...bodyFormData];
                                    newData[idx].value = e.target.value;
                                    setBodyFormData(newData);
                                  }}
                                  placeholder="参数值"
                                  style={styles.paramInput}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <select 
                                  value={item.type || 'string'}
                                  onChange={(e) => {
                                    const newData = [...bodyFormData];
                                    newData[idx].type = e.target.value;
                                    setBodyFormData(newData);
                                  }}
                                  style={styles.paramSelect}
                                >
                                  <option>string</option>
                                  <option>number</option>
                                  <option>boolean</option>
                                  <option>integer</option>
                                </select>
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="text" 
                                  value={item.description || ''}
                                  onChange={(e) => {
                                    const newData = [...bodyFormData];
                                    newData[idx].description = e.target.value;
                                    setBodyFormData(newData);
                                  }}
                                  placeholder="描述"
                                  style={styles.paramInput}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <button
                                  style={styles.deleteParamBtn}
                                  onClick={() => setBodyFormData(bodyFormData.filter((_, i) => i !== idx))}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button 
                        style={styles.addParamBtn}
                        onClick={() => setBodyFormData([...bodyFormData, {key: '', value: '', type: 'string', description: ''}])}
                      >
                        + 添加参数
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paramsTab === 'constraints' && (
                <div>
                  <div style={{display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button 
                        style={{
                          padding: '6px 12px',
                          backgroundColor: constraintsTab === 'single' ? '#2563eb' : '#f1f5f9',
                          color: constraintsTab === 'single' ? 'white' : '#64748b',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                        onClick={() => setConstraintsTab('single')}
                      >
                        单参数约束
                      </button>
                      <button 
                        style={{
                          padding: '6px 12px',
                          backgroundColor: constraintsTab === 'dependencies' ? '#2563eb' : '#f1f5f9',
                          color: constraintsTab === 'dependencies' ? 'white' : '#64748b',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                        onClick={() => setConstraintsTab('dependencies')}
                      >
                        参数间依赖
                      </button>
                    </div>
                    <button
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffffff',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                      onClick={() => setShowAiGenerateModal(true)}
                    >
                      ✨ AI 生成约束
                    </button>
                  </div>

                  {constraintsTab === 'single' && (
                    <div>
                      <h4>单参数约束</h4>
                      <table style={styles.paramsTable}>
                        <thead>
                          <tr style={styles.tableHeader}>
                            <th style={{...styles.tableCell, width: '80px'}}>约束ID</th>
                            <th style={styles.tableCell}>参数名</th>
                            <th style={{...styles.tableCell, width: '80px'}}>参数位置</th>
                            <th style={styles.tableCell}>约束描述</th>
                            <th style={{...styles.tableCell, width: '60px'}}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(singleConstraints).map(([key, constraint]) => (
                            <tr key={key} style={styles.tableRow}>
                              <td style={{...styles.tableCell, width: '80px'}}>
                                <input 
                                  type="text" 
                                  value={key}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    const newConstraints = {...singleConstraints};
                                    if (newValue !== key && newValue.trim()) {
                                      newConstraints[newValue] = newConstraints[key];
                                      delete newConstraints[key];
                                      setSingleConstraints(newConstraints);
                                    }
                                  }}
                                  placeholder="约束ID"
                                  style={{...styles.paramInput, fontSize: '11px'}}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="text" 
                                  value={constraint.parameter?.name || ''}
                                  onChange={(e) => {
                                    const newConstraints = {...singleConstraints};
                                    newConstraints[key].parameter = {
                                      ...newConstraints[key].parameter,
                                      name: e.target.value
                                    };
                                    setSingleConstraints(newConstraints);
                                  }}
                                  placeholder="参数名"
                                  style={styles.paramInput}
                                />
                              </td>
                              <td style={{...styles.tableCell, width: '80px'}}>
                                <select 
                                  value={constraint.parameter?.location || 'query'}
                                  onChange={(e) => {
                                    const newConstraints = {...singleConstraints};
                                    newConstraints[key].parameter = {
                                      ...newConstraints[key].parameter,
                                      location: e.target.value
                                    };
                                    setSingleConstraints(newConstraints);
                                  }}
                                  style={styles.paramSelect}
                                >
                                  <option value="query">query</option>
                                  <option value="path">path</option>
                                  <option value="header">header</option>
                                  <option value="body">body</option>
                                </select>
                              </td>
                              <td style={{...styles.tableCell, minWidth: '250px'}}>
                                <textarea 
                                  value={constraint.constraint || ''}
                                  onChange={(e) => {
                                    const newConstraints = {...singleConstraints};
                                    newConstraints[key].constraint = e.target.value;
                                    setSingleConstraints(newConstraints);
                                  }}
                                  placeholder="约束描述（自然语言）"
                                  style={{
                                    ...styles.textarea, 
                                    minHeight: '20px',
                                    padding: '6px',
                                    fontSize: '12px',
                                    lineHeight: '1.4'
                                  }}
                                />
                              </td>
                              <td style={{...styles.tableCell, width: '60px'}}>
                                <button
                                  style={styles.deleteParamBtn}
                                  onClick={() => {
                                    const newConstraints = {...singleConstraints};
                                    delete newConstraints[key];
                                    setSingleConstraints(newConstraints);
                                  }}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <button 
                        style={styles.addParamBtn}
                        onClick={() => {
                          const newId = `constraint_${Date.now()}`;
                          const newConstraints = {...singleConstraints};
                          newConstraints[newId] = {
                            parameter: {name: '', location: 'query'},
                            constraint: ''
                          };
                          setSingleConstraints(newConstraints);
                        }}
                      >
                        + 添加约束
                      </button>
                    </div>
                  )}

                  {constraintsTab === 'dependencies' && (
                    <div>
                      <h4>参数间依赖</h4>
                      <table style={styles.paramsTable}>
                        <thead>
                          <tr style={styles.tableHeader}>
                            <th style={{...styles.tableCell, width: '80px'}}>依赖ID</th>
                            <th style={{...styles.tableCell, width: '120px'}}>依赖名称</th>
                            <th style={{...styles.tableCell, width: '120px'}}>涉及参数</th>
                            <th style={styles.tableCell}>约束描述</th>
                            <th style={{...styles.tableCell, width: '60px'}}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(dependencies).map(([key, dep]) => (
                            <tr key={key} style={styles.tableRow}>
                              <td style={{...styles.tableCell, width: '80px'}}>
                                <input 
                                  type="text" 
                                  value={key}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    const newDeps = {...dependencies};
                                    if (newValue !== key && newValue.trim()) {
                                      newDeps[newValue] = newDeps[key];
                                      delete newDeps[key];
                                      setDependencies(newDeps);
                                    }
                                  }}
                                  placeholder="依赖ID"
                                  style={{...styles.paramInput, fontSize: '11px'}}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="text" 
                                  value={dep.name || ''}
                                  onChange={(e) => {
                                    const newDeps = {...dependencies};
                                    newDeps[key].name = e.target.value;
                                    setDependencies(newDeps);
                                  }}
                                  placeholder="依赖名称"
                                  style={styles.paramInput}
                                />
                              </td>
                              <td style={{...styles.tableCell, width: '180px'}}>
                                <div style={{fontSize: '12px'}}>
                                  {dep.parameters && dep.parameters.length > 0 ? (
                                    <div>
                                      {dep.parameters.map((param, idx) => (
                                        <div key={idx} style={{display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center'}}>
                                          <input 
                                            type="text" 
                                            value={param.name || ''}
                                            onChange={(e) => {
                                              const newDeps = {...dependencies};
                                              newDeps[key].parameters[idx].name = e.target.value;
                                              setDependencies(newDeps);
                                            }}
                                            placeholder="参数名"
                                            style={{...styles.paramInput, flex: 1, padding: '4px'}}
                                          />
                                          <select 
                                            value={param.location || 'query'}
                                            onChange={(e) => {
                                              const newDeps = {...dependencies};
                                              newDeps[key].parameters[idx].location = e.target.value;
                                              setDependencies(newDeps);
                                            }}
                                            style={{...styles.paramSelect, padding: '4px', width: '70px'}}
                                          >
                                            <option value="query">query</option>
                                            <option value="path">path</option>
                                            <option value="header">header</option>
                                            <option value="body">body</option>
                                          </select>
                                          <button
                                            style={{...styles.deleteParamBtn, padding: '2px 4px'}}
                                            onClick={() => {
                                              const newDeps = {...dependencies};
                                              newDeps[key].parameters.splice(idx, 1);
                                              setDependencies(newDeps);
                                            }}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{color: '#94a3b8'}}>无参数</span>
                                  )}
                                  <button 
                                    style={{...styles.addParamBtn, fontSize: '11px', padding: '3px 6px', marginTop: '4px'}}
                                    onClick={() => {
                                      const newDeps = {...dependencies};
                                      if (!newDeps[key].parameters) {
                                        newDeps[key].parameters = [];
                                      }
                                      newDeps[key].parameters.push({name: '', location: 'query'});
                                      setDependencies(newDeps);
                                    }}
                                  >
                                    + 参数
                                  </button>
                                </div>
                              </td>
                              <td style={{...styles.tableCell, minWidth: '250px'}}>
                                <textarea 
                                  value={dep.constraint || ''}
                                  onChange={(e) => {
                                    const newDeps = {...dependencies};
                                    newDeps[key].constraint = e.target.value;
                                    setDependencies(newDeps);
                                  }}
                                  placeholder="约束描述（自然语言）"
                                  style={{
                                    ...styles.textarea, 
                                    minHeight: '30px',
                                    padding: '6px',
                                    fontSize: '12px',
                                    lineHeight: '1.4'
                                  }}
                                />
                              </td>
                              <td style={{...styles.tableCell, width: '60px'}}>
                                <button
                                  style={styles.deleteParamBtn}
                                  onClick={() => {
                                    const newDeps = {...dependencies};
                                    delete newDeps[key];
                                    setDependencies(newDeps);
                                  }}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <button 
                        style={styles.addParamBtn}
                        onClick={() => {
                          const newId = `dependency_${Date.now()}`;
                          const newDeps = {...dependencies};
                          newDeps[newId] = {
                            name: '',
                            parameters: [],
                            constraint: ''
                          };
                          setDependencies(newDeps);
                        }}
                      >
                        + 添加依赖
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 响应区 */}
            <div style={styles.responseArea}>
              <h4>响应结果 (Response)</h4>
              <div style={styles.responseBox}>{responseData || '点击上方"发送"后，这里将显示返回的数据...'}</div>
            </div>
          </div>
        )}
      </div>

      {/* AI 生成约束模态框 */}
      {showAiGenerateModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h3 style={styles.createCardTitle}>✨ AI 智能生成约束</h3>
            
            {/* 约束类型选择 */}
            <div style={{marginBottom: '15px'}}>
              <label style={{fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '8px', display: 'block'}}>
                选择提取类型
              </label>
              <div style={{display: 'flex', gap: '10px'}}>
                <button
                  onClick={() => setAiGenerateType('single')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: aiGenerateType === 'single' ? '#3b82f6' : '#e2e8f0',
                    color: aiGenerateType === 'single' ? 'white' : '#334155',
                    border: '1px solid ' + (aiGenerateType === 'single' ? '#3b82f6' : '#cbd5e1'),
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  📋 单参数约束
                </button>
                <button
                  onClick={() => setAiGenerateType('dependency')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: aiGenerateType === 'dependency' ? '#3b82f6' : '#e2e8f0',
                    color: aiGenerateType === 'dependency' ? 'white' : '#334155',
                    border: '1px solid ' + (aiGenerateType === 'dependency' ? '#3b82f6' : '#cbd5e1'),
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  🔗 参数依赖关系
                </button>
              </div>
            </div>
            
            {selectedProjectId && projects.find(p => p.id === selectedProjectId) && projects.find(p => p.id === selectedProjectId).openapi_content ? (
              // 如果有 OpenAPI 文档，显示简化提示
              <div>
                <div style={{padding: '15px', backgroundColor: '#dbeafe', borderRadius: '6px', marginBottom: '12px', color: '#1e40af', fontSize: '13px'}}>
                  ✅ 检测到 OpenAPI 文档，将基于文档自动提取
                  {aiGenerateType === 'single' ? '参数约束' : '参数依赖关系'}
                </div>
                <p style={{fontSize: '13px', color: '#64748b', marginBottom: '12px'}}>
                  {aiGenerateType === 'single' 
                    ? '系统将分析 API 的所有参数定义，并逐一提取参数约束（是否必填、数据类型、范围、格式等）。'
                    : '系统将分析参数之间的依赖关系，如：某参数依赖于其他参数、参数组的关联性等。'}
                </p>
              </div>
            ) : (
              // 如果没有 OpenAPI 文档，显示完整的输入界面
              <div>
                <div style={{padding: '15px', backgroundColor: '#fef3c7', borderRadius: '6px', marginBottom: '12px', color: '#92400e', fontSize: '13px'}}>
                  ⚠️ 未检测到 OpenAPI 文档，请描述你想要的约束
                </div>
                <div style={{marginBottom: '12px'}}>
                  <label style={{fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px', display: 'block'}}>
                    {aiGenerateType === 'single' ? '描述单参数约束' : '描述参数依赖关系'}（自然语言）
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={
                      aiGenerateType === 'single'
                        ? '例：用户年龄必须在 18-65 岁之间，且不能为空'
                        : '例：如果提供了 startDate，则必须也提供 endDate'
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minHeight: '100px',
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}
            
            <p style={{fontSize: '12px', color: '#94a3b8', marginBottom: '12px'}}>
              💡 说明：{aiGenerateType === 'single' 
                ? '系统将逐一提取参数约束，提取结果不理想可以手动编辑。'
                : '系统将提取参数间的依赖关系，包括 Requires、AllOrNone 等类型。'}
            </p>

            <div style={styles.cardActions}>
              <button
                style={styles.cardCancelBtn}
                onClick={() => {
                  setShowAiGenerateModal(false);
                  setAiPrompt('');
                }}
                disabled={isConstraintGenerating}
              >
                取消
              </button>
              <button
                style={{...styles.cardCreateBtn, opacity: isConstraintGenerating ? 0.6 : 1, cursor: isConstraintGenerating ? 'not-allowed' : 'pointer'}}
                onClick={handleAiGenerateConstraints}
                disabled={isConstraintGenerating}
              >
                {isConstraintGenerating ? '⏳ 生成中...' : '生成约束'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
