(() => {
  const styles = `
    .runtime-toggle-wrap {
      position: static;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.86);
      color: #fff;
      padding: 10px 12px;
      border-radius: 14px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.22);
      backdrop-filter: blur(4px);
      font-family: Inter, Segoe UI, Arial, sans-serif;
      font-size: 12px;
      margin: 12px 14px 0 14px;
      width: fit-content;
    }
    .runtime-toggle-btn {
      border: 0;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      color: #0f172a;
      background: #f8fafc;
    }
    .runtime-toggle-btn[data-mode='mock'] { background: #fef3c7; color: #92400e; }
    .runtime-toggle-btn[data-mode='live'] { background: #dcfce7; color: #166534; }
    .runtime-toggle-status { opacity: 0.9; }
  `;

  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);

  const wrap = document.createElement('div');
  wrap.className = 'runtime-toggle-wrap';
  wrap.innerHTML = `
    <span class='runtime-toggle-status' id='runtimeModeStatus'>Mode: ...</span>
    <button type='button' class='runtime-toggle-btn' id='runtimeModeButton'>Switch</button>
  `;
  document.body.appendChild(wrap);

  const status = document.getElementById('runtimeModeStatus');
  const button = document.getElementById('runtimeModeButton');

  let currentMode = 'live';

  const token = () => localStorage.getItem('admin_access_token') || '';

  const setUi = (mode) => {
    currentMode = mode === 'mock' ? 'mock' : 'live';
    status.textContent = `Mode: ${currentMode.toUpperCase()}`;
    button.dataset.mode = currentMode;
    button.textContent = currentMode === 'live' ? 'Switch to Mock' : 'Switch to Live';
  };

  const loadMode = async () => {
    try {
      const response = await fetch('/api/runtime/mode', { credentials: 'include' });
      const payload = await response.json();
      setUi(payload?.data?.mode || 'live');
    } catch {
      setUi('live');
    }
  };

  const toggleMode = async () => {
    const nextMode = currentMode === 'live' ? 'mock' : 'live';
    button.disabled = true;
    try {
      const response = await fetch('/api/admin/runtime/mode', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
        body: JSON.stringify({ mode: nextMode }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Unable to update mode');
      }
      setUi(payload?.data?.mode || nextMode);
    } catch (error) {
      alert(String(error).replace('Error: ', ''));
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener('click', toggleMode);
  loadMode();
})();
