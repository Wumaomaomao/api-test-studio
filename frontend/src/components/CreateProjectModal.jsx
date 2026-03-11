import { useState } from 'react';

export default function CreateProjectModal({ 
  showModal, 
  onClose, 
  projectName, 
  setProjectName,
  projectBaseUrl,
  setProjectBaseUrl,
  openApiFile,
  setOpenApiFile,
  sending,
  onCreateProject,
  styles
}) {
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setOpenApiFile(e.target.files[0]);
    }
  };

  if (!showModal) return null;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose}></div>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h4 style={styles.modalHeader}>新建项目</h4>
        
        <input
          type="text"
          placeholder="请输入项目名称"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={styles.input}
        />
        
        <input
          type="text"
          placeholder="请输入 Base URL (如: https://api.example.com)"
          value={projectBaseUrl}
          onChange={(e) => setProjectBaseUrl(e.target.value)}
          style={styles.input}
        />
        
        <input
          type="file"
          accept=".json,.yaml,.yml"
          onChange={handleFileChange}
          style={styles.input}
        />
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
          (可选) 上传OpenAPI文件导入接口
        </div>

        <div style={styles.modalFooter}>
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            disabled={sending}
          >
            取消
          </button>
          <button
            style={{ ...styles.confirmBtn, opacity: sending ? 0.7 : 1 }}
            onClick={onCreateProject}
            disabled={!projectName || !projectBaseUrl || sending}
          >
            {sending ? '创建中...' : '创建项目'}
          </button>
        </div>
      </div>
    </>
  );
}
