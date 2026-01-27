import { useState } from 'react';
import { createInvitation, CreateInvitationRequest } from '../../api/admin';

interface Props {
  onInvitationCreated: () => void;
}

export default function SendInvitation({ onInvitationCreated }: Props) {
  const [formData, setFormData] = useState<CreateInvitationRequest>({
    guest_name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [multiCopied, setMultiCopied] = useState(false);

  const generateId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [multiInviteId, setMultiInviteId] = useState(() => {
    const saved = localStorage.getItem('multi_invite_id');
    if (saved) return saved;
    const newId = generateId();
    localStorage.setItem('multi_invite_id', newId);
    return newId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCreatedUrl(null);

    try {
      const response = await createInvitation(formData);
      setCreatedUrl(response.invitation_url);
      onInvitationCreated();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (createdUrl) {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setFormData({
      guest_name: '',
      email: '',
      phone: '',
      notes: '',
    });
    setCreatedUrl(null);
    setCopied(false);
  };

  if (createdUrl) {
    return (
      <div className="invitation-success">
        <h3>Invitation Created</h3>
        <p>Share this link with {formData.guest_name}:</p>
        <div className="url-box">
          <input type="text" value={createdUrl} readOnly />
          <button onClick={handleCopy} className="copy-btn">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button onClick={handleReset} className="new-btn">
          Create Another
        </button>
      </div>
    );
  }

  return (
    <div className="invitation-form-container">
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="invitation-form">
        <div className="form-group">
          <label htmlFor="guest_name">Guest Name *</label>
          <input
            type="text"
            id="guest_name"
            value={formData.guest_name}
            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
            placeholder="Enter guest name"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="guest@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1234567890"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#374151' }}>Multi-Invite Link</h3>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1rem' }}>
          Share this link with guests for self-registration:
        </p>
        <div className="url-box">
          <input 
            type="text" 
            value={`${window.location.origin}/register/${multiInviteId}`} 
            readOnly 
          />
          <button onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/register/${multiInviteId}`);
            setMultiCopied(true);
            setTimeout(() => setMultiCopied(false), 2000);
          }} className="copy-btn">
            {multiCopied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={() => {
            const newId = generateId();
            setMultiInviteId(newId);
            localStorage.setItem('multi_invite_id', newId);
          }} className="copy-btn" style={{ marginLeft: '10px', backgroundColor: '#6b7280' }}>
            New
          </button>
        </div>
      </div>
    </div>
  );
}
