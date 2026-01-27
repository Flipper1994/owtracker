import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SendInvitation from './SendInvitation';
import CheckInvitations from './CheckInvitations';
import Security from './Security';
import Network from './Network';
import { InvitationStats, getInvitationStats } from '../../api/admin';

type Tab = 'create' | 'list' | 'security' | 'network';

export default function Dashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<InvitationStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      const statsData = await getInvitationStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleInvitationCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('list'); // Switch to list after creating
  };

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <div className="top-bar">
        <h1>Wedding Invitations</h1>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <div className="dashboard-content">
        {/* Stats - Always visible */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total</h3>
            <div className="value">{stats?.total || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <div className="value pending">{stats?.pending || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Accepted</h3>
            <div className="value accepted">{stats?.accepted || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Declined</h3>
            <div className="value declined">{stats?.declined || 0}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <div
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              New Invitation
            </div>
            <div
              className={`tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              All Invitations
            </div>
            <div
              className={`tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </div>
            <div
              className={`tab ${activeTab === 'network' ? 'active' : ''}`}
              onClick={() => setActiveTab('network')}
            >
              Network
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'list' && (
              <CheckInvitations refreshTrigger={refreshTrigger} onStatsChange={fetchStats} />
            )}
            {activeTab === 'create' && (
              <SendInvitation onInvitationCreated={handleInvitationCreated} />
            )}
            {activeTab === 'security' && (
              <Security />
            )}
            {activeTab === 'network' && (
              <Network />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
