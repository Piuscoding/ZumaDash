import React, { useMemo } from 'react';

export function BarChart({ title, data, valueKey = 'value', labelKey = 'label', color = '#0d6b3a', height = 160 }) {
  const max = useMemo(() => {
    const m = Math.max(1, ...((data || []).map((d) => Number(d[valueKey]) || 0)));
    return m;
  }, [data, valueKey]);

  if (!data?.length) {
    return (
      <div className="card" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 14, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No data</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <h4 style={{ fontSize: 14, marginBottom: 12 }}>{title}</h4>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height,
          borderBottom: '1px solid var(--gray-200)',
          paddingBottom: 4,
        }}
      >
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0;
          const h = Math.max(2, Math.round((v / max) * (height - 24)));
          return (
            <div
              key={i}
              title={`${d[labelKey]}: ${v.toLocaleString()}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
              }}
            >
              <span style={{ fontSize: 9, color: 'var(--gray-500)', marginBottom: 2 }}>
                {v > 0 ? (v >= 1000 ? `${Math.round(v / 1000)}k` : v) : ''}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: h,
                  background: color,
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.85,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 9,
              color: 'var(--gray-500)',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d[labelKey]}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBars({ title, entries, color = '#2563eb' }) {
  const list = Object.entries(entries || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...list.map(([, v]) => v));
  if (!list.length) {
    return (
      <div className="card" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 14, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No data</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 14 }}>
      <h4 style={{ fontSize: 14, marginBottom: 12 }}>{title}</h4>
      {list.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <span style={{ textTransform: 'capitalize' }}>{String(k).replace(/_/g, ' ')}</span>
            <strong>{v}</strong>
          </div>
          <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round((v / max) * 100)}%`,
                height: '100%',
                background: color,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChangeBadge({ pct }) {
  if (pct == null || Number.isNaN(pct)) return null;
  const up = pct >= 0;
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: up ? '#166534' : '#991b1b',
        background: up ? '#f0fdf4' : '#fee2e2',
        padding: '2px 8px',
        borderRadius: 999,
        marginLeft: 6,
      }}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

export default BarChart;
