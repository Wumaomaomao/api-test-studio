export default function CreateApiModal({ 
  showModal, 
  onClose, 
  apiName, 
  setApiName,
  apiMethod,
  setApiMethod,
  apiUrl,
  setApiUrl,
  adding,
  onCreateApi,
  styles 
}) {
  if (!showModal) return null;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose}></div>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h4 style={styles.modalHeader}>添加新接口</h4>
        
        <input
          type="text"
          placeholder="请输入接口名称"
          value={apiName}
          onChange={(e) => setApiName(e.target.value)}
          style={styles.input}
        />
        
        <select
          value={apiMethod}
          onChange={(e) => setApiMethod(e.target.value)}
          style={styles.input}
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
          <option>PATCH</option>
        </select>
        
        <input
          type="text"
          placeholder="请输入接口 URL (如: /api/users)"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          style={styles.input}
        />

        <div style={styles.modalFooter}>
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            disabled={adding}
          >
            取消
          </button>
          <button
            style={{ ...styles.confirmBtn, opacity: adding ? 0.7 : 1 }}
            onClick={onCreateApi}
            disabled={!apiName || !apiUrl || adding}
          >
            {adding ? '添加中...' : '添加接口'}
          </button>
        </div>
      </div>
    </>
  );
}
