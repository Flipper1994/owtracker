import { useState, useEffect } from 'react';
import {
  NetworkAuditResponse,
  getNetworkAudit,
  clearOldAccessLogs,
} from '../../api/admin';

export default function Network() {
  const [audit, setAudit] = useState<NetworkAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    try {
      const data = await getNetworkAudit();
      setAudit(data);
    } catch (err) {
      console.error('Failed to fetch network audit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearOld = async () => {
    if (!confirm('Clear access logs older than 7 days?')) return;
    setClearing(true);
    try {
      const result = await clearOldAccessLogs();
      alert(`Cleared ${result.deleted} old records`);
      fetchAudit();
    } catch (err) {
      console.error('Failed to clear old logs:', err);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const truncateUserAgent = (ua: string) => {
    if (!ua) return '-';
    if (ua.length > 40) return ua.substring(0, 40) + '...';
    return ua;
  };

  const getMethodClass = (method: string) => {
    switch (method) {
      case 'GET': return 'method-get';
      case 'POST': return 'method-post';
      case 'DELETE': return 'method-delete';
      default: return '';
    }
  };

  const getStatusClass = (status: number) => {
    if (status < 300) return 'status-success';
    if (status < 400) return 'status-redirect';
    if (status < 500) return 'status-client-error';
    return 'status-server-error';
  };

  if (loading) {
    return <div className="loading">Loading network data...</div>;
  }

  if (!audit) {
    return <div className="no-data">Failed to load network data</div>;
  }

  return (
    <div className="network-container">
      {/* Network Stats */}
      <div className="network-stats">
        <div className="network-stat">
          <span className="stat-value">{audit.stats.total_requests}</span>
          <span className="stat-label">Total Requests</span>
        </div>
        <div className="network-stat">
          <span className="stat-value">{audit.stats.unique_ips}</span>
          <span className="stat-label">Unique IPs</span>
        </div>
        <div className="network-stat">
          <span className="stat-value">{audit.stats.last_24_hours}</span>
          <span className="stat-label">Last 24h</span>
        </div>
        <div className="network-stat">
          <span className="stat-value success">{audit.stats.success_requests}</span>
          <span className="stat-label">Success (2xx/3xx)</span>
        </div>
        <div className="network-stat">
          <span className="stat-value failed">{audit.stats.error_requests}</span>
          <span className="stat-label">Errors (4xx/5xx)</span>
        </div>
      </div>

      {/* Two column layout for top paths and top IPs */}
      <div className="network-grid">
        {/* Top Paths */}
        <div className="network-section">
          <h4>Top Endpoints</h4>
          {audit.top_paths.length === 0 ? (
            <p className="no-data">No data yet</p>
          ) : (
            <div className="top-list">
              {audit.top_paths.map((path, idx) => (
                <div key={idx} className="top-item">
                  <div className="top-item-main">
                    <span className="path-name">{path.path}</span>
                    <span className="request-count">{path.request_count} reqs</span>
                  </div>
                  <div className="top-item-details">
                    <span className="latency">~{path.avg_latency_ms}ms</span>
                    {path.error_count > 0 && (
                      <span className="error-count">{path.error_count} errors</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top IPs */}
        <div className="network-section">
          <h4>Top IPs</h4>
          {audit.top_ips.length === 0 ? (
            <p className="no-data">No data yet</p>
          ) : (
            <div className="top-list">
              {audit.top_ips.map((ip, idx) => (
                <div key={idx} className="top-item">
                  <div className="top-item-main">
                    <span className="ip-name">{ip.ip_address}</span>
                    <span className="request-count">{ip.request_count} reqs</span>
                  </div>
                  <div className="top-item-details">
                    <span className="last-seen">Last: {formatDate(ip.last_request)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Access Logs */}
      <div className="network-section">
        <div className="section-header">
          <h4>Recent Access Logs</h4>
          <button onClick={handleClearOld} disabled={clearing} className="clear-btn">
            {clearing ? 'Clearing...' : 'Clear Old (7d+)'}
          </button>
        </div>
        {audit.recent_logs.length === 0 ? (
          <p className="no-data">No access logs recorded yet</p>
        ) : (
          <div className="access-table-wrapper">
            <table className="access-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>IP</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {audit.recent_logs.map((log) => (
                  <tr key={log.id} className={log.status_code >= 400 ? 'error-row' : ''}>
                    <td>{formatDate(log.created_at)}</td>
                    <td className="ip-cell">{log.ip_address}</td>
                    <td><span className={`method-badge ${getMethodClass(log.method)}`}>{log.method}</span></td>
                    <td className="path-cell">{log.path}</td>
                    <td><span className={`status-code ${getStatusClass(log.status_code)}`}>{log.status_code}</span></td>
                    <td className="latency-cell">{log.latency_ms}ms</td>
                    <td className="ua-cell" title={log.user_agent}>{truncateUserAgent(log.user_agent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TTL Info */}
      <div className="network-section info-section">
        <h4>Log Retention</h4>
        <p>Access logs are automatically deleted after 7 days. Security logs follow the same retention policy.</p>
      </div>
    </div>
  );
}
