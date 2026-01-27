import { useState, useEffect } from 'react';
import {
  SecurityAuditResponse,
  getSecurityAudit,
  clearOldAttempts,
} from '../../api/admin';

export default function Security() {
  const [audit, setAudit] = useState<SecurityAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    try {
      const data = await getSecurityAudit();
      setAudit(data);
    } catch (err) {
      console.error('Failed to fetch security audit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearOld = async () => {
    if (!confirm('Clear login attempts older than 30 days?')) return;
    setClearing(true);
    try {
      const result = await clearOldAttempts();
      alert(`Cleared ${result.deleted} old records`);
      fetchAudit();
    } catch (err) {
      console.error('Failed to clear old attempts:', err);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const truncateUserAgent = (ua: string) => {
    if (!ua) return '-';
    if (ua.length > 50) return ua.substring(0, 50) + '...';
    return ua;
  };

  if (loading) {
    return <div className="loading">Loading security data...</div>;
  }

  if (!audit) {
    return <div className="no-data">Failed to load security data</div>;
  }

  return (
    <div className="security-container">
      {/* Security Stats */}
      <div className="security-stats">
        <div className="security-stat">
          <span className="stat-value">{audit.stats.total_attempts}</span>
          <span className="stat-label">Total Attempts</span>
        </div>
        <div className="security-stat">
          <span className="stat-value failed">{audit.stats.failed_attempts}</span>
          <span className="stat-label">Failed</span>
        </div>
        <div className="security-stat">
          <span className="stat-value success">{audit.stats.success_attempts}</span>
          <span className="stat-label">Successful</span>
        </div>
        <div className="security-stat">
          <span className="stat-value">{audit.stats.unique_ips}</span>
          <span className="stat-label">Unique IPs</span>
        </div>
        <div className="security-stat">
          <span className="stat-value">{audit.stats.last_24_hours}</span>
          <span className="stat-label">Last 24h</span>
        </div>
      </div>

      {/* Suspicious IPs */}
      {audit.suspicious_ips.length > 0 && (
        <div className="security-section">
          <h4>Suspicious IPs (3+ failed attempts)</h4>
          <div className="suspicious-ips">
            {audit.suspicious_ips.map((ip, idx) => (
              <div key={idx} className="suspicious-ip-card">
                <div className="ip-address">{ip.ip_address}</div>
                <div className="ip-stats">
                  <span className="failed-count">{ip.failed_attempts} failed</span>
                  <span className="total-count">/ {ip.total_attempts} total</span>
                </div>
                <div className="last-attempt">Last: {formatDate(ip.last_attempt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attempts */}
      <div className="security-section">
        <div className="section-header">
          <h4>Recent Login Attempts</h4>
          <button onClick={handleClearOld} disabled={clearing} className="clear-btn">
            {clearing ? 'Clearing...' : 'Clear Old (30d+)'}
          </button>
        </div>
        {audit.recent_attempts.length === 0 ? (
          <p className="no-data">No login attempts recorded yet</p>
        ) : (
          <div className="attempts-table-wrapper">
            <table className="attempts-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>IP Address</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {audit.recent_attempts.map((attempt) => (
                  <tr key={attempt.id} className={attempt.success ? 'success-row' : 'failed-row'}>
                    <td>{formatDate(attempt.created_at)}</td>
                    <td className="ip-cell">{attempt.ip_address}</td>
                    <td>{attempt.username || '-'}</td>
                    <td>
                      <span className={`status-badge ${attempt.success ? 'status-success' : 'status-failed'}`}>
                        {attempt.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="ua-cell" title={attempt.user_agent}>
                      {truncateUserAgent(attempt.user_agent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rate Limit Info */}
      <div className="security-section info-section">
        <h4>Rate Limiting</h4>
        <p>Login endpoint is rate-limited to 5 attempts per IP. After exceeding the limit, the IP is blocked for ~15 minutes (HTTP 429).</p>
      </div>
    </div>
  );
}
