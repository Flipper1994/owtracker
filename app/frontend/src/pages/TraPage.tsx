import React, { useEffect, useRef, useState } from 'react';

type TraResponse = {
  content: string;
  updated_at: string;
};

type FileTransfer = {
  id: number;
  filename: string;
  relative_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export default function TraPage() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [files, setFiles] = useState<FileTransfer[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch('/api/tra');
        if (!response.ok) {
          throw new Error('Konnte Text nicht laden.');
        }
        const data = (await response.json()) as TraResponse;
        setContent(data.content ?? '');
      } catch (err) {
        console.error(err);
        setError('Laden fehlgeschlagen.');
      }
    };

    const loadFiles = async () => {
      try {
        const response = await fetch('/api/files');
        if (!response.ok) {
          throw new Error('Konnte Dateien nicht laden.');
        }
        const data = (await response.json()) as FileTransfer[];
        setFiles(data);
      } catch (err) {
        console.error(err);
        setUploadError('Dateiliste konnte nicht geladen werden.');
      }
    };

    loadContent();
    loadFiles();
  }, []);

  useEffect(() => {
    const handler = setInterval(async () => {
      try {
        const response = await fetch('/api/tra');
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as TraResponse;
        if (data.content !== content) {
          setContent(data.content ?? '');
        }
      } catch (err) {
        console.warn('Polling failed', err);
      }
    }, 2000);

    return () => clearInterval(handler);
  }, [content]);

  useEffect(() => {
    const handler = setInterval(async () => {
      try {
        const response = await fetch('/api/files');
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as FileTransfer[];
        setFiles(data);
      } catch (err) {
        console.warn('File polling failed', err);
      }
    }, 4000);

    return () => clearInterval(handler);
  }, []);

  const saveContent = async (nextValue: string) => {
    setStatus('saving');
    setError('');
    try {
      const response = await fetch('/api/tra', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nextValue }),
      });

      if (!response.ok) {
        throw new Error('Speichern fehlgeschlagen');
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1200);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Speichern fehlgeschlagen.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    setContent(nextValue);
    saveContent(nextValue);
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    Array.from(fileList).forEach((file) => {
      formData.append('files', file);
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      formData.append('relative_path', relativePath ?? file.name);
    });

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const refreshed = await fetch('/api/files');
      if (refreshed.ok) {
        const data = (await refreshed.json()) as FileTransfer[];
        setFiles(data);
      }
    } catch (err) {
      console.error(err);
      setUploadError('Upload fehlgeschlagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    uploadFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(event.target.files);
    event.target.value = '';
  };

  const deleteFile = async (id: number) => {
    try {
      const response = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      setFiles((prev: FileTransfer[]) => prev.filter((file: FileTransfer) => file.id !== id));
    } catch (err) {
      console.error(err);
      setUploadError('Datei konnte nicht gelöscht werden.');
    }
  };

  const deleteAllFiles = async () => {
    const confirmDelete = window.confirm('Alle Dateien wirklich löschen?');
    if (!confirmDelete) return;

    try {
      const response = await fetch('/api/files', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete all failed');
      }
      setFiles([]);
    } catch (err) {
      console.error(err);
      setUploadError('Alle Dateien konnten nicht gelöscht werden.');
    }
  };

  return (
    <div className="tra-page">
      <div className="tra-card">
        <div className="tra-header">
          <h1>Text-Schnipsel Austausch</h1>
          <p>Alle offenen Clients sehen denselben Text in Echtzeit.</p>
        </div>

        <textarea
          className="tra-textarea"
          value={content}
          onChange={handleChange}
          placeholder="Tippe hier deinen Text..."
        />

        <div className="tra-footer">
          <span className={`tra-status ${status}`}>
            {status === 'saving' && 'Speichert...'}
            {status === 'saved' && 'Gespeichert'}
            {status === 'error' && 'Fehler'}
            {status === 'idle' && 'Bereit'}
          </span>
          {error && <span className="tra-error">{error}</span>}
        </div>

        <div className="tra-files">
          <div
            className="tra-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <p>Dateien hierher ziehen & ablegen</p>
            <span>oder</span>
            <label className="tra-upload-button">
              Datei auswählen
              <input
                type="file"
                multiple
                onChange={handleFileInput}
              />
            </label>
            <label className="tra-upload-button secondary">
              Ordner auswählen
              <input
                type="file"
                multiple
                onChange={handleFileInput}
                ref={folderInputRef}
              />
            </label>
          </div>

          {uploading && <p className="tra-uploading">Upload läuft...</p>}
          {uploadError && <p className="tra-error">{uploadError}</p>}

          <div className="tra-file-list">
            <div className="tra-file-header">
              <h3>Aktuelle Dateien</h3>
              <div className="tra-file-header-actions">
                <a className="tra-download-all" href="/api/files-download">
                  Download All
                </a>
                <button type="button" className="tra-delete-all" onClick={deleteAllFiles}>
                  Delete All
                </button>
              </div>
            </div>
            {files.length === 0 ? (
              <p className="tra-empty">Noch keine Dateien hochgeladen.</p>
            ) : (
              <ul>
                {files.map((file) => (
                  <li key={file.id}>
                    <div>
                      <strong>{file.relative_path || file.filename}</strong>
                      <span>{(file.size_bytes / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="tra-file-actions">
                      <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer">
                        Download
                      </a>
                      <button type="button" onClick={() => deleteFile(file.id)}>
                        Löschen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}