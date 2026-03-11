import { useState } from 'react';

export default function ApiManagement({ 
  projects, apis, selectedProjectId, selectedApi, selectedApiData,
  queryParams, setQueryParams, pathParams, setPathParams,
  headers, setHeaders, bodyType, setBodyType, bodyData, setBodyData,
  bodyFormData, setBodyFormData, paramsTab, setParamsTab, responseData, setResponseData,
  statusMsg, setStatusMsg, showCreateCard, setShowCreateCard, showAddApiCard, setShowAddApiCard,
  newApiName, setNewApiName, newApiMethod, setNewApiMethod, newApiUrl, setNewApiUrl,
  addingApi, fetchApis, handleCreateApi, handleDeleteApi, handleSendRequest,
  setSelectedProjectId, setSelectedApi,
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
                    <li key={api.id} style={styles.apiItem}>
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
                <p style={styles.overviewValue}>{projects.find(p => p.id === selectedProjectId)?.base_url || '未设置'}</p>
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
              <select style={styles.methodSelect} defaultValue={selectedApiData?.method || 'GET'}>
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
                            <input 
                              type="text" 
                              value={header.key}
                              onChange={(e) => {
                                const newHeaders = [...headers];
                                newHeaders[idx].key = e.target.value;
                                setHeaders(newHeaders);
                              }}
                              placeholder="如: Content-Type"
                              style={styles.paramInput}
                            />
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
                    <label style={{marginRight: '20px'}}>
                      <input 
                        type="radio" 
                        name="bodyType" 
                        value="json" 
                        checked={bodyType === 'json'}
                        onChange={(e) => setBodyType(e.target.value)}
                      /> JSON
                    </label>
                    <label>
                      <input 
                        type="radio" 
                        name="bodyType" 
                        value="form" 
                        checked={bodyType === 'form'}
                        onChange={(e) => setBodyType(e.target.value)}
                      /> application/x-www-form-urlencoded
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

                  {bodyType === 'form' && (
                    <div>
                      <h4>Form Data</h4>
                      <table style={styles.paramsTable}>
                        <thead>
                          <tr style={styles.tableHeader}>
                            <th style={styles.tableCell}>参数名</th>
                            <th style={styles.tableCell}>参数值</th>
                            <th style={styles.tableCell}>描述</th>
                            <th style={styles.tableCell}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bodyFormData.map((item, idx) => (
                            <tr key={idx} style={styles.tableRow}>
                              <td style={styles.tableCell}>
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
                        onClick={() => setBodyFormData([...bodyFormData, {key: '', value: '', description: ''}])}
                      >
                        + 添加参数
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
    </div>
  );
}
