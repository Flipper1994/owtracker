const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

const dbPath = path.join(__dirname, 'matches.sqlite');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const normalizeMatch = (match) => ({
  ...match,
  createdAt: match.createdAt ?? new Date().toISOString(),
});

app.get('/api/matches', (_req, res) => {
  const rows = db
    .prepare('SELECT payload FROM matches ORDER BY datetime(createdAt) DESC')
    .all();
  const matches = rows.map((row) => JSON.parse(row.payload));
  res.json(matches);
});

app.get('/api/matches/export', (_req, res) => {
  const rows = db
    .prepare('SELECT payload FROM matches ORDER BY datetime(createdAt) DESC')
    .all();
  const matches = rows.map((row) => JSON.parse(row.payload));
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="matches-export.json"');
  res.json({ exportedAt: new Date().toISOString(), matches });
});

app.post('/api/matches', (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Match payload fehlt' });
    }
    const match = normalizeMatch(req.body);
    if (!match?.id) {
      return res.status(400).json({ error: 'Match id fehlt' });
    }
    const payload = JSON.stringify(match);
    const createdAt = match.createdAt;
    db.prepare(
      `INSERT INTO matches (id, payload, createdAt)
       VALUES (@id, @payload, @createdAt)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, createdAt = excluded.createdAt`
    ).run({ id: match.id, payload, createdAt });
    return res.status(201).json(match);
  } catch (error) {
    console.error('POST /api/matches failed', error);
    return res.status(500).json({ error: 'Match konnte nicht gespeichert werden' });
  }
});

app.post('/api/matches/import', (req, res) => {
  try {
    const payload = req.body;
    const matches = Array.isArray(payload) ? payload : payload?.matches;
    if (!Array.isArray(matches)) {
      return res.status(400).json({ error: 'Ungültige Import-Datei' });
    }
    const insert = db.prepare(
      `INSERT INTO matches (id, payload, createdAt)
       VALUES (@id, @payload, @createdAt)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, createdAt = excluded.createdAt`
    );
    const insertMany = db.transaction((items) => {
      items.forEach((match) => {
        if (!match?.id) return;
        const normalized = normalizeMatch(match);
        insert.run({
          id: normalized.id,
          payload: JSON.stringify(normalized),
          createdAt: normalized.createdAt,
        });
      });
    });
    insertMany(matches);
    return res.json({ imported: matches.length });
  } catch (error) {
    console.error('POST /api/matches/import failed', error);
    return res.status(500).json({ error: 'Import fehlgeschlagen' });
  }
});

app.delete('/api/matches', (_req, res) => {
  const result = db.prepare('DELETE FROM matches').run();
  res.json({ deleted: result.changes });
});

app.delete('/api/matches/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM matches WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Match nicht gefunden' });
  }
  res.status(204).send();
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const frontendIndex = path.join(frontendDist, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndex);

if (hasFrontendBuild) {
  app.use('/owtracker', express.static(frontendDist));

  app.get(/^\/owtracker(\/.*)?$/, (_req, res) => {
    res.sendFile(frontendIndex);
  });

  app.get('/', (_req, res) => {
    res.redirect('/owtracker');
  });
} else {
  console.warn('⚠️  Frontend build not found. Skipping static /owtracker serving.');
}

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`OW Tracker backend running on http://0.0.0.0:${PORT}`);
  console.log(`Access from: http://localhost:${PORT} or http://<your-ip>:${PORT}`);
});