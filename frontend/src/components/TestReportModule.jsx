import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = 'http://localhost:8080';

function formatDuration(seconds) {
  const s = Number(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m ${r}s`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

export default function TestReportModule({ projects, apis, styles, selectedProjectId, focusTaskId }) {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [detailError, setDetailError] = useState('');

  const selectedTask = taskDetail?.task || null;
  const isTaskInProgress = (status) => status === 'pending' || status === 'running';
  const hasRunningTasks = useMemo(() => (tasks || []).some((t) => isTaskInProgress(t.status)), [tasks]);
  const shouldPoll = hasRunningTasks || isTaskInProgress(selectedTask?.status);

  const projectNameById = useMemo(() => {
    const map = {};
    (projects || []).forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  const apiNameById = useMemo(() => {
    const map = {};
    (apis || []).forEach((a) => {
      map[a.id] = `${a.method} ${a.url}`;
    });
    return map;
  }, [apis]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const query = selectedProjectId ? `?project_id=${selectedProjectId}` : '';
      const response = await fetch(`${API_BASE_URL}/test-run-tasks${query}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || '获取任务列表失败');
      }
      const list = data.tasks || [];
      setTasks(list);
      setTasksError('');

      if (focusTaskId) {
        setSelectedTaskId(focusTaskId);
      } else if (!selectedTaskId && list.length > 0) {
        setSelectedTaskId(list[0].id);
      } else if (selectedTaskId && !list.find((t) => t.id === selectedTaskId)) {
        setSelectedTaskId(list.length > 0 ? list[0].id : null);
      }
    } catch (error) {
      setTasksError(`获取任务列表失败: ${error.message}`);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchTaskDetail = async (taskId) => {
    if (!taskId) {
      setTaskDetail(null);
      setDetailError('');
      return;
    }

    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/test-run-tasks/${taskId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || '获取任务详情失败');
      }
      setTaskDetail(data);
      setDetailError('');
    } catch (error) {
      setDetailError(`获取任务详情失败: ${error.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId]);

  useEffect(() => {
    if (focusTaskId) {
      setSelectedTaskId(focusTaskId);
    }
  }, [focusTaskId]);

  useEffect(() => {
    fetchTaskDetail(selectedTaskId);
  }, [selectedTaskId]);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const timer = setInterval(() => {
      fetchTasks();
      if (selectedTaskId) {
        fetchTaskDetail(selectedTaskId);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [selectedTaskId, selectedProjectId, shouldPoll]);

  return (
    <div style={styles.apiWorkspace}>
      <div style={styles.innerSidebar}>
        <div style={styles.innerSidebarHeader}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>测试任务</h3>
        </div>

        <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
          {loadingTasks ? '加载中...' : `共 ${tasks.length} 个任务`}
        </div>

        {tasksError && (
          <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2' }}>
            {tasksError}
          </div>
        )}

        <ul style={styles.projectList}>
          {tasks.length === 0 && (
            <li style={{ padding: '14px', color: '#94a3b8', fontSize: '13px' }}>暂无测试任务</li>
          )}
          {tasks.map((task) => (
            <li key={task.id} style={styles.projectItem}>
              <div
                style={{
                  ...styles.projectName,
                  ...(selectedTaskId === task.id ? styles.projectNameActive : {}),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>任务 #{task.id}</span>
                  <span style={{ fontSize: '12px', color: task.status === 'completed' ? '#16a34a' : task.status === 'failed' ? '#dc2626' : '#2563eb' }}>
                    {task.status === 'completed' ? '通过' : task.status === 'failed' ? '失败' : '执行中'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                  {projectNameById[task.project_id] || `项目${task.project_id}`}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                  {apiNameById[task.api_id] || `API ${task.api_id}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.apiDetailArea}>
        {!selectedTaskId ? (
          <div style={styles.emptyState}>
            <p>请选择左侧测试任务</p>
          </div>
        ) : detailError && !taskDetail ? (
          <div style={styles.emptyState}>
            <p>{detailError}</p>
          </div>
        ) : loadingDetail && !taskDetail ? (
          <div style={styles.emptyState}>
            <p>任务详情加载中...</p>
          </div>
        ) : selectedTask ? (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: 0, marginBottom: '10px', color: '#1e293b' }}>
                任务 #{selectedTask.id} - {selectedTask.status === 'completed' ? '通过' : selectedTask.status === 'failed' ? '失败' : '执行中'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: '10px' }}>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>总用例数</div>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{selectedTask.total_cases}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>执行数</div>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{selectedTask.executed_cases}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>通过率</div>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{(selectedTask.pass_rate * 100).toFixed(1)}%</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>通过数</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>{selectedTask.passed_cases}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>失败数</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>{selectedTask.failed_cases}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>已执行时间</div>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatDuration(selectedTask.elapsed_seconds)}</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'auto' }}>
              <table style={styles.paramsTable}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.tableCell}>用例</th>
                    <th style={styles.tableCell}>描述</th>
                    <th style={styles.tableCell}>类型</th>
                    <th style={styles.tableCell}>状态</th>
                    <th style={styles.tableCell}>预期码</th>
                    <th style={styles.tableCell}>实际码</th>
                    <th style={styles.tableCell}>耗时(ms)</th>
                    <th style={styles.tableCell}>错误</th>
                  </tr>
                </thead>
                <tbody>
                  {(taskDetail?.details || []).length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ ...styles.tableCell, textAlign: 'center', color: '#94a3b8' }}>
                        暂无执行明细
                      </td>
                    </tr>
                  )}
                  {(taskDetail?.details || []).map((item) => (
                    <tr key={item.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{item.test_case_name}</td>
                      <td style={{ ...styles.tableCell, maxWidth: '280px', whiteSpace: 'pre-wrap' }}>{item.test_case_description || '-'}</td>
                      <td style={styles.tableCell}>{item.case_type || '-'}</td>
                      <td style={styles.tableCell}>
                        <span style={{ color: item.status === 'passed' ? '#16a34a' : item.status === 'failed' ? '#dc2626' : '#2563eb' }}>
                          {item.status === 'passed' ? '通过' : item.status === 'failed' ? '失败' : '执行中'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>{item.expected_status || '-'}</td>
                      <td style={styles.tableCell}>{item.actual_status || '-'}</td>
                      <td style={styles.tableCell}>{item.duration_ms ?? '-'}</td>
                      <td style={{ ...styles.tableCell, maxWidth: '360px', whiteSpace: 'pre-wrap', color: '#dc2626' }}>{item.error_message || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <p>任务详情获取失败</p>
          </div>
        )}
      </div>
    </div>
  );
}
