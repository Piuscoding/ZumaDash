import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import api from '../../services/api';

const CORRIDORS = ['Kubwa', 'Dutse', 'Ushafa', 'Bwari'];

const defaultGrouping = {
  saveMoneyMode: 'user_choice',
  assignmentMode: 'offer',
  perAdditionalPickupFee: 400,
  perAdditionalDropoffFee: 300,
  saveMoneyDiscountPercent: 45,
  groupedDiscountPercent: 45,
  multiStopDiscountPercent: 0,
  enrouteDiscountPercent: 25,
  enrouteEnabled: true,
  requireProofPerStop: true,
  maxWaitMinutesCustomerCanChoose: 30,
  automaticPoolWindowMinutes: 12,
  maxStopsPerPrivateTrip: 5,
  textModeFloor: 1500,
  maxRidersToConsider: 5,
  offerTimeoutSeconds: 90,
  corridorFallbackOrder: [...CORRIDORS],
  operatingWindows: [],
};

const defaultAiWorker = {
  openRouterApiKey: '',
  modelId: 'google/gemini-flash-1.5',
  modelName: 'Gemini Flash 1.5',
  temperature: 0.2,
  maxTokens: 2048,
  fallbackModelId: 'meta-llama/llama-3.1-8b-instruct',
  enabled: true,
  hasApiKey: false,
  provider: 'openrouter',
  useGroqAsDefault: false,
  groqModelId: 'qwen/qwen3.8-27b',
  hasGroqKey: false,
};

const GroupingAI = () => {
  const [grouping, setGrouping] = useState({ ...defaultGrouping });
  const [aiWorker, setAiWorker] = useState({ ...defaultAiWorker });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/settings');
      const s = res.data.settings || {};
      const g = s.grouping || {};
      setGrouping({
        saveMoneyMode: g.saveMoneyMode || 'user_choice',
        assignmentMode: g.assignmentMode || 'offer',
        perAdditionalPickupFee: Number(g.perAdditionalPickupFee) || 400,
        perAdditionalDropoffFee: Number(g.perAdditionalDropoffFee) || 300,
        saveMoneyDiscountPercent: Number(g.saveMoneyDiscountPercent) ?? 45,
        groupedDiscountPercent: Number(g.groupedDiscountPercent != null ? g.groupedDiscountPercent : g.saveMoneyDiscountPercent) ?? 45,
        multiStopDiscountPercent: Number(g.multiStopDiscountPercent) || 0,
        enrouteDiscountPercent:
          g.enrouteDiscountPercent != null && g.enrouteDiscountPercent !== ''
            ? Number(g.enrouteDiscountPercent)
            : 25,
        enrouteEnabled: g.enrouteEnabled !== false,
        requireProofPerStop: g.requireProofPerStop !== false,
        maxWaitMinutesCustomerCanChoose: Number(g.maxWaitMinutesCustomerCanChoose) || 30,
        automaticPoolWindowMinutes: Number(g.automaticPoolWindowMinutes) || 12,
        maxStopsPerPrivateTrip: Number(g.maxStopsPerPrivateTrip) || 5,
        textModeFloor: Number(g.textModeFloor) || 1500,
        maxRidersToConsider: Number(g.maxRidersToConsider) || 5,
        offerTimeoutSeconds: Number(g.offerTimeoutSeconds) || 90,
        corridorFallbackOrder:
          Array.isArray(g.corridorFallbackOrder) && g.corridorFallbackOrder.length
            ? g.corridorFallbackOrder
            : [...CORRIDORS],
        operatingWindows: Array.isArray(g.operatingWindows) ? g.operatingWindows : [],
      });
      const a = s.aiWorker || {};
      setAiWorker({
        openRouterApiKey: a.openRouterApiKey || '',
        modelId: a.modelId || 'google/gemini-flash-1.5',
        modelName: a.modelName || 'Gemini Flash 1.5',
        temperature: a.temperature != null ? Number(a.temperature) : 0.2,
        maxTokens: Number(a.maxTokens) || 2048,
        fallbackModelId: a.fallbackModelId || 'meta-llama/llama-3.1-8b-instruct',
        enabled: a.enabled !== false,
        hasApiKey: !!a.hasApiKey || !!(a.openRouterApiKey && !String(a.openRouterApiKey).includes('•')),
        provider: a.provider === 'groq' || a.useGroqAsDefault ? 'groq' : 'openrouter',
        useGroqAsDefault: a.provider === 'groq' || a.useGroqAsDefault === true,
        groqModelId: a.groqModelId || 'qwen/qwen3.8-27b',
        hasGroqKey: !!a.hasGroqKey || !!a.hasEnvGroqKey,
      });
      // hasApiKey from server is preferred
      if (a.hasApiKey != null) {
        setAiWorker((prev) => ({ ...prev, hasApiKey: !!a.hasApiKey }));
      }
      setApiKeyInput('');
      setClearApiKey(false);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setG = (key, value) => setGrouping((prev) => ({ ...prev, [key]: value }));
  const setA = (key, value) => setAiWorker((prev) => ({ ...prev, [key]: value }));

  const moveCorridor = (index, direction) => {
    setGrouping((prev) => {
      const order = [...(prev.corridorFallbackOrder || CORRIDORS)];
      const next = index + direction;
      if (next < 0 || next >= order.length) return prev;
      const tmp = order[index];
      order[index] = order[next];
      order[next] = tmp;
      return { ...prev, corridorFallbackOrder: order };
    });
  };

  const addWindow = () => {
    setGrouping((prev) => ({
      ...prev,
      operatingWindows: [...(prev.operatingWindows || []), { start: '08:00', end: '20:00' }],
    }));
  };

  const updateWindow = (idx, field, value) => {
    setGrouping((prev) => {
      const windows = [...(prev.operatingWindows || [])];
      windows[idx] = { ...windows[idx], [field]: value };
      return { ...prev, operatingWindows: windows };
    });
  };

  const removeWindow = (idx) => {
    setGrouping((prev) => ({
      ...prev,
      operatingWindows: (prev.operatingWindows || []).filter((_, i) => i !== idx),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        grouping: {
          saveMoneyMode: grouping.saveMoneyMode,
          assignmentMode: grouping.assignmentMode,
          perAdditionalPickupFee: Number(grouping.perAdditionalPickupFee),
          perAdditionalDropoffFee: Number(grouping.perAdditionalDropoffFee),
          saveMoneyDiscountPercent: Number(
            grouping.groupedDiscountPercent != null
              ? grouping.groupedDiscountPercent
              : grouping.saveMoneyDiscountPercent
          ),
          groupedDiscountPercent: Number(
            grouping.groupedDiscountPercent != null
              ? grouping.groupedDiscountPercent
              : grouping.saveMoneyDiscountPercent
          ),
          multiStopDiscountPercent: Number(grouping.multiStopDiscountPercent) || 0,
          enrouteDiscountPercent: Math.min(
            90,
            Math.max(0, Number(grouping.enrouteDiscountPercent) || 0)
          ),
          enrouteEnabled: !!grouping.enrouteEnabled,
          requireProofPerStop: !!grouping.requireProofPerStop,
          maxWaitMinutesCustomerCanChoose: Number(grouping.maxWaitMinutesCustomerCanChoose),
          automaticPoolWindowMinutes: Number(grouping.automaticPoolWindowMinutes),
          maxStopsPerPrivateTrip: Number(grouping.maxStopsPerPrivateTrip),
          textModeFloor: Number(grouping.textModeFloor),
          maxRidersToConsider: Number(grouping.maxRidersToConsider),
          offerTimeoutSeconds: Number(grouping.offerTimeoutSeconds),
          corridorFallbackOrder: grouping.corridorFallbackOrder,
          operatingWindows: grouping.operatingWindows,
        },
        aiWorker: {
          modelId: aiWorker.modelId,
          modelName: aiWorker.modelName,
          temperature: Number(aiWorker.temperature),
          maxTokens: Number(aiWorker.maxTokens),
          fallbackModelId: aiWorker.fallbackModelId,
          enabled: !!aiWorker.enabled,
          provider: aiWorker.useGroqAsDefault || aiWorker.provider === 'groq' ? 'groq' : 'openrouter',
          useGroqAsDefault: !!aiWorker.useGroqAsDefault,
          groqModelId: aiWorker.groqModelId || 'qwen/qwen3.8-27b',
        },
      };
      if (clearApiKey) {
        payload.aiWorker.clearApiKey = true;
        payload.aiWorker.openRouterApiKey = '';
      } else if (apiKeyInput && apiKeyInput.trim() && !apiKeyInput.includes('•')) {
        payload.aiWorker.openRouterApiKey = apiKeyInput.trim();
      }

      const res = await api.put('/api/settings', payload);
      setMessage(res.data.message || 'Grouping & AI Worker settings saved. Changes apply immediately.');
      // Refresh masked key status
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
        <AdminNavbar />
        <div className="container" style={{ padding: 40, textAlign: 'center' }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <AdminNavbar />
      <div className="container" style={{ maxWidth: 720, padding: '24px 16px' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Link to="/admin" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
              ← Dashboard
            </Link>
            <h1 style={{ fontSize: 22, margin: '8px 0 0' }}>Grouping & AI Worker</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4 }}>
              Changes take effect immediately for new jobs and the next worker run. No redeploy required.
            </p>
          </div>
        </div>

        {message && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={save}>
          {/* Feature switches */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Feature switches</h2>
            <div className="form-group">
              <label>Save Money mode</label>
              <select
                value={grouping.saveMoneyMode}
                onChange={(e) => setG('saveMoneyMode', e.target.value)}
              >
                <option value="off">Off — feature disabled</option>
                <option value="user_choice">User choice — customer sees toggle</option>
                <option value="automatic">Automatic — silent for every eligible solo job</option>
              </select>
              <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                Automatic: customer never sees Save Money UI or discounted price at checkout.
              </small>
            </div>
            <div className="form-group">
              <label>Assignment mode (grouped trips)</label>
              <select
                value={grouping.assignmentMode}
                onChange={(e) => setG('assignmentMode', e.target.value)}
              >
                <option value="offer">Offer — send to top N closest riders</option>
                <option value="automatic">Automatic — assign closest eligible</option>
                <option value="automatic_prefer_good_riders">Automatic prefer good riders</option>
              </select>
            </div>
          </div>

          {/* Fees */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Fees (private multi-stop)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Per additional pickup (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={grouping.perAdditionalPickupFee}
                  onChange={(e) => setG('perAdditionalPickupFee', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Per additional drop-off (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={grouping.perAdditionalDropoffFee}
                  onChange={(e) => setG('perAdditionalDropoffFee', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pool & discount */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Pool & discount</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Save Money / grouped discount %</label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={grouping.groupedDiscountPercent != null ? grouping.groupedDiscountPercent : grouping.saveMoneyDiscountPercent}
                  onChange={(e) => {
                    setG('groupedDiscountPercent', e.target.value);
                    setG('saveMoneyDiscountPercent', e.target.value);
                  }}
                />
              </div>
              <div className="form-group">
                <label>Private multi-stop discount %</label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={grouping.multiStopDiscountPercent}
                  onChange={(e) => setG('multiStopDiscountPercent', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>En-route discount %</label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={grouping.enrouteDiscountPercent}
                  onChange={(e) => {
                    const v = e.target.value;
                    setG('enrouteDiscountPercent', v === '' ? '' : Number(v));
                  }}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>En-route matching</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!grouping.enrouteEnabled}
                  onClick={() => setG('enrouteEnabled', !grouping.enrouteEnabled)}
                  style={{
                    width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: grouping.enrouteEnabled ? 'var(--primary)' : '#cbd5e1', position: 'relative',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: grouping.enrouteEnabled ? 22 : 3,
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Proof photo each stop</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!grouping.requireProofPerStop}
                  onClick={() => setG('requireProofPerStop', !grouping.requireProofPerStop)}
                  style={{
                    width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: grouping.requireProofPerStop ? 'var(--primary)' : '#cbd5e1', position: 'relative',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: grouping.requireProofPerStop ? 22 : 3,
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
              <div className="form-group">
                <label>Text-mode floor (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={grouping.textModeFloor}
                  onChange={(e) => setG('textModeFloor', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Max wait minutes (user choice)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={grouping.maxWaitMinutesCustomerCanChoose}
                  onChange={(e) => setG('maxWaitMinutesCustomerCanChoose', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Automatic pool window (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={grouping.automaticPoolWindowMinutes}
                  onChange={(e) => setG('automaticPoolWindowMinutes', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Max stops per private trip</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={grouping.maxStopsPerPrivateTrip}
                  onChange={(e) => setG('maxStopsPerPrivateTrip', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Assignment</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Max riders to consider</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={grouping.maxRidersToConsider}
                  onChange={(e) => setG('maxRidersToConsider', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Offer timeout (seconds)</label>
                <input
                  type="number"
                  min={15}
                  max={600}
                  value={grouping.offerTimeoutSeconds}
                  onChange={(e) => setG('offerTimeoutSeconds', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Corridor fallback order</label>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                When no eligible rider is in the primary corridor, the system walks this list in order.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(grouping.corridorFallbackOrder || CORRIDORS).map((c, idx) => (
                  <li
                    key={`${c}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: 'var(--gray-50)',
                      borderRadius: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700, width: 24 }}>{idx + 1}.</span>
                    <span style={{ flex: 1 }}>{c}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={idx === 0}
                      onClick={() => moveCorridor(idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={idx === (grouping.corridorFallbackOrder || []).length - 1}
                      onClick={() => moveCorridor(idx, 1)}
                    >
                      ↓
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Operating windows */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Operating windows</h2>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
              Optional daily windows (HH:MM). Leave empty for no restriction.
            </p>
            {(grouping.operatingWindows || []).map((w, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input
                  type="time"
                  value={w.start || ''}
                  onChange={(e) => updateWindow(idx, 'start', e.target.value)}
                  style={{ flex: 1 }}
                />
                <span style={{ color: 'var(--gray-500)' }}>to</span>
                <input
                  type="time"
                  value={w.end || ''}
                  onChange={(e) => updateWindow(idx, 'end', e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => removeWindow(idx)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={addWindow}>
              + Add window
            </button>
          </div>

          {/* AI Worker */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>AI Worker (OpenRouter)</h2>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!aiWorker.enabled}
                  onChange={(e) => setA('enabled', e.target.checked)}
                />
                AI worker enabled
              </label>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Use Groq as default AI worker</span>
              <button
                type="button"
                role="switch"
                aria-checked={!!aiWorker.useGroqAsDefault}
                onClick={() =>
                  setAiWorker((prev) => ({
                    ...prev,
                    useGroqAsDefault: !prev.useGroqAsDefault,
                    provider: !prev.useGroqAsDefault ? 'groq' : 'openrouter',
                  }))
                }
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: aiWorker.useGroqAsDefault ? 'var(--primary)' : '#cbd5e1', position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: aiWorker.useGroqAsDefault ? 22 : 3,
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: -8, marginBottom: 12 }}>
              {aiWorker.hasGroqKey
                ? 'Groq key available. Default model qwen/qwen3.8-27b (free). Change below and Save.'
                : 'Set GROQ_API_KEY in backend .env. Free models: qwen/qwen3.8-27b, openai/gpt-oss-20b.'}
            </p>
            <div className="form-group">
              <label>Groq model (editable)</label>
              <select
                value={
                  ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(aiWorker.groqModelId)
                    ? aiWorker.groqModelId
                    : '__custom__'
                }
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setA('groqModelId', aiWorker.groqModelId || 'qwen/qwen3.8-27b');
                  } else {
                    setA('groqModelId', e.target.value);
                  }
                }}
                style={{ marginBottom: 8 }}
              >
                <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (recommended free)</option>
                <option value="openai/gpt-oss-20b">openai/gpt-oss-20b</option>
                <option value="openai/gpt-oss-120b">openai/gpt-oss-120b</option>
                <option value="__custom__">Custom model id…</option>
              </select>
              <input
                type="text"
                value={aiWorker.groqModelId || ''}
                onChange={(e) => setA('groqModelId', e.target.value)}
                placeholder="e.g. qwen/qwen3.8-27b"
                style={{ width: '100%' }}
              />
              <small style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                Your dashboard shows qwen returns 200; gpt-oss often returns json_validate_failed on free tier.
              </small>
            </div>
            <div className="form-group">
              <label>OpenRouter API key (write-only)</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder={
                  aiWorker.hasApiKey || (aiWorker.openRouterApiKey && aiWorker.openRouterApiKey.includes('•'))
                    ? 'Key is set — enter a new key to replace'
                    : 'sk-or-…'
                }
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setClearApiKey(false);
                }}
              />
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {(aiWorker.hasApiKey || (aiWorker.openRouterApiKey && String(aiWorker.openRouterApiKey).includes('•'))) && (
                  <span style={{ fontSize: 12, color: '#166534' }}>
                    Key on file: {aiWorker.openRouterApiKey || '••••••••'}
                  </span>
                )}
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={clearApiKey}
                    onChange={(e) => {
                      setClearApiKey(e.target.checked);
                      if (e.target.checked) setApiKeyInput('');
                    }}
                  />
                  Clear stored key
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Model ID (OpenRouter)</label>
              <input
                type="text"
                value={aiWorker.modelId}
                onChange={(e) => setA('modelId', e.target.value)}
                placeholder="google/gemini-flash-1.5"
              />
              <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                Any free or paid model identifier on OpenRouter
              </small>
            </div>
            <div className="form-group">
              <label>Model name (label)</label>
              <input
                type="text"
                value={aiWorker.modelName}
                onChange={(e) => setA('modelName', e.target.value)}
                placeholder="Gemini Flash 1.5"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Temperature</label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={aiWorker.temperature}
                  onChange={(e) => setA('temperature', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Max tokens</label>
                <input
                  type="number"
                  min={128}
                  max={8192}
                  value={aiWorker.maxTokens}
                  onChange={(e) => setA('maxTokens', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Fallback model ID</label>
              <input
                type="text"
                value={aiWorker.fallbackModelId}
                onChange={(e) => setA('fallbackModelId', e.target.value)}
                placeholder="meta-llama/llama-3.1-8b-instruct"
              />
              <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                Used once if the primary model fails
              </small>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ marginBottom: 32 }}>
            {saving ? 'Saving…' : 'Save Grouping & AI settings'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupingAI;
