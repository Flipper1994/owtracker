import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type ToastMessage = {
  id: string;
  message: string;
};

type ArchiveLink = {
  id: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
};

type ArchiveDraft = {
  title: string;
  url: string;
  description: string;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function ArchivePage() {
  const [archiveLinks, setArchiveLinks] = useState<ArchiveLink[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [archiveDraft, setArchiveDraft] = useState<ArchiveDraft>({
    title: '',
    url: '',
    description: '',
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const loadArchiveLinks = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await fetch('/api/archive-links');
      if (!response.ok) {
        throw new Error('Failed to load archive links');
      }
      const data = (await response.json()) as ArchiveLink[];
      setArchiveLinks(Array.isArray(data) ? data : []);
    } catch {
      setArchiveLinks([]);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArchiveLinks();
  }, [loadArchiveLinks]);

  const submitArchiveLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = archiveDraft.title.trim();
    const url = archiveDraft.url.trim();
    const description = archiveDraft.description.trim();
    if (!title || !url) {
      addToast('Titel und Link sind Pflichtfelder');
      return;
    }
    if (archiveSubmitting) return;
    setArchiveSubmitting(true);
    const link: ArchiveLink = {
      id: generateId(),
      title,
      url,
      description,
      createdAt: new Date().toISOString(),
    };
    try {
      const response = await fetch('/api/archive-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      });
      if (!response.ok) {
        throw new Error('Failed to save archive link');
      }
      const saved = (await response.json()) as ArchiveLink;
      setArchiveLinks((prev) => [saved, ...prev]);
      setArchiveDraft({ title: '', url: '', description: '' });
      addToast('Archiv-Eintrag gespeichert');
    } catch {
      addToast('Archiv-Eintrag konnte nicht gespeichert werden');
    } finally {
      setArchiveSubmitting(false);
    }
  };

  const handleDeleteArchiveLink = async (id: string) => {
    const confirmed = window.confirm('Diesen Archiv-Eintrag löschen?');
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/archive-links/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      setArchiveLinks((prev) => prev.filter((link) => link.id !== id));
      addToast('Archiv-Eintrag gelöscht');
    } catch {
      addToast('Archiv-Eintrag konnte nicht gelöscht werden');
    }
  };

  const handleDeleteAllArchiveLinks = async () => {
    const confirmed = window.confirm('Willst du wirklich alle Archiv-Einträge löschen?');
    if (!confirmed) return;
    try {
      const response = await fetch('/api/archive-links', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      await loadArchiveLinks();
      addToast('Archiv geleert');
    } catch {
      addToast('Archiv konnte nicht gelöscht werden');
    }
  };

  return (
    <div className="ow-page">
        <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
      <section className="ow-banner">
        <div className="ow-banner-content">
          <h1>Archiv &amp; Favoriten</h1>
          <p className="banner-subtitle">
            Hilfreiche Links und Ressourcen für dein Team.
          </p>
          <Link to="/" className="button-style">Zurück zum Dashboard</Link>
        </div>
      </section>
      <main className="ow-grid archive-grid">
        <section className="ow-card">
          <div className="archive-body">
            <p className="muted">
              Speichere hilfreiche Links mit kurzer Erklärung für dein Team.
            </p>
            <form className="archive-form" onSubmit={submitArchiveLink}>
              <label>
                Titel
                <input
                  type="text"
                  placeholder="z.B. Coaching Guide"
                  value={archiveDraft.title}
                  onChange={(event) =>
                    setArchiveDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Link
                <input
                  type="url"
                  placeholder="https://"
                  value={archiveDraft.url}
                  onChange={(event) =>
                    setArchiveDraft((prev) => ({ ...prev, url: event.target.value }))
                  }
                />
              </label>
              <label>
                Kurzbeschreibung (optional)
                <textarea
                  rows={3}
                  placeholder="Warum ist der Link hilfreich?"
                  value={archiveDraft.description}
                  onChange={(event) =>
                    setArchiveDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="primary" disabled={archiveSubmitting}>
                  {archiveSubmitting ? 'Speichern...' : 'Link speichern'}
                </button>
              </div>
            </form>
            <div className="archive-list-wrapper">
              <h3>Gespeicherte Links</h3>
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteAllArchiveLinks}
              >
                Archiv leeren
              </button>
              {archiveLoading ? (
                <p className="muted">Lade Archiv...</p>
              ) : archiveLinks.length === 0 ? (
                <p className="empty">Noch keine Links gespeichert.</p>
              ) : (
                <ul className="archive-list">
                  {archiveLinks.map((link) => (
                    <li key={link.id} className="archive-item">
                      <div>
                        <div className="archive-title">{link.title}</div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="archive-link"
                        >
                          {link.url}
                        </a>
                        {link.description && (
                          <p className="archive-description">{link.description}</p>
                        )}
                        <span className="muted">
                          {new Date(link.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="archive-actions">
                        <button
                          type="button"
                          className="danger-button small"
                          onClick={() => handleDeleteArchiveLink(link.id)}
                        >
                          Entfernen
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
