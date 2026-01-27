import { useState, useEffect } from 'react';
import {
  Invitation,
  getInvitations,
  getInvitation,
  deleteInvitation,
} from '../../api/admin';

interface Props {
  refreshTrigger: number;
  onStatsChange: () => void;
}

export default function CheckInvitations({ refreshTrigger, onStatsChange }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState<{
    invitation: Invitation;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      const invData = await getInvitations();
      setInvitations(Array.isArray(invData) ? invData : []);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (id: number) => {
    try {
      const response = await getInvitation(id);
      setSelectedInvitation({
        invitation: response.invitation,
        url: response.invitation_url,
      });
    } catch (err) {
      console.error('Failed to fetch invitation details:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this invitation?')) return;

    try {
      await deleteInvitation(id);
      setInvitations(invitations.filter((inv) => inv.id !== id));
      if (selectedInvitation?.invitation.id === id) {
        setSelectedInvitation(null);
      }
      onStatsChange(); // Notify parent to refresh stats
    } catch (err) {
      console.error('Failed to delete invitation:', err);
    }
  };

  const handleCopy = async () => {
    if (selectedInvitation?.url) {
      await navigator.clipboard.writeText(selectedInvitation.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedInvitations = [...invitations].sort((a, b) => {
    if (!sortConfig) return 0;

    const aVal = (a as any)[sortConfig.key] || '';
    const bVal = (b as any)[sortConfig.key] || '';

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'status-badge status-pending',
      accepted: 'status-badge status-accepted',
      declined: 'status-badge status-declined',
    };
    return <span className={classes[status] || 'status-badge'}>{status}</span>;
  };

  const getFoodLabel = (food?: string) => {
    if (!food || food === 'none') return '-';
    const labels: Record<string, string> = {
      meat: 'Meat',
      vegetarian: 'Vegetarian',
      both: 'Both',
    };
    return labels[food] || food;
  };

  if (loading) {
    return <div className="loading">Loading invitations...</div>;
  }

  return (
    <div className="invitations-container">
      {/* Modal for selected invitation */}
      {selectedInvitation && (
        <div className="modal-overlay" onClick={() => setSelectedInvitation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Invitation Details</h3>
            <div className="modal-details">
              <p><strong>Guest:</strong> {selectedInvitation.invitation.guest_name}</p>
              {selectedInvitation.invitation.email && (
                <p><strong>Email:</strong> {selectedInvitation.invitation.email}</p>
              )}
              {selectedInvitation.invitation.phone && (
                <p><strong>Phone:</strong> {selectedInvitation.invitation.phone}</p>
              )}
              <p><strong>Status:</strong> {getStatusBadge(selectedInvitation.invitation.status)}</p>
              {selectedInvitation.invitation.confirmed_name && (
                <p><strong>Confirmed Name:</strong> {selectedInvitation.invitation.confirmed_name}</p>
              )}
              {selectedInvitation.invitation.food_preference && selectedInvitation.invitation.food_preference !== 'none' && (
                <p><strong>Food:</strong> {getFoodLabel(selectedInvitation.invitation.food_preference)}</p>
              )}
              {selectedInvitation.invitation.notes && (
                <p><strong>Notes:</strong> {selectedInvitation.invitation.notes}</p>
              )}
            </div>
            <div className="url-box">
              <input type="text" value={selectedInvitation.url} readOnly />
              <button onClick={handleCopy} className="copy-btn">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={() => setSelectedInvitation(null)} className="close-btn">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invitations Table */}
      <div className="invitations-table-container">
        {invitations.length === 0 ? (
          <p className="no-data">No invitations yet. Click "New Invitation" to create one.</p>
        ) : (
          <table className="invitations-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Food</th>
                <th onClick={() => handleSort('creator_ip')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  IP {sortConfig?.key === 'creator_ip' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Time</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvitations.map((inv) => (
                <tr key={inv.id} onClick={() => handleRowClick(inv.id)} className="clickable-row">
                  <td>{inv.guest_name}</td>
                  <td>{inv.email || '-'}</td>
                  <td>{inv.phone || '-'}</td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td>{getFoodLabel(inv.food_preference)}</td>
                  <td>{(inv as any).creator_ip || '-'}</td>
                  <td>{new Date(inv.created_at).toLocaleTimeString()}</td>
                  <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(inv.id, e)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
