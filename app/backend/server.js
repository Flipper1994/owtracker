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

db.exec(`
  CREATE TABLE IF NOT EXISTS improvements (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completedAt TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS archive_links (
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

const normalizeImprovement = (ticket) => ({
  ...ticket,
  createdAt: ticket.createdAt ?? new Date().toISOString(),
  completed: Boolean(ticket.completed),
  completedAt: ticket.completed
    ? ticket.completedAt ?? new Date().toISOString()
    : null,
});

const normalizeArchiveLink = (link) => ({
  ...link,
  createdAt: link.createdAt ?? new Date().toISOString(),
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
  const improvementRows = db
    .prepare(
      'SELECT payload FROM improvements ORDER BY completed ASC, datetime(createdAt) DESC',
    )
    .all();
  const improvements = improvementRows.map((row) => JSON.parse(row.payload));
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="matches-export.json"');
  res.json({ exportedAt: new Date().toISOString(), matches, improvements });
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
    const matches = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.matches)
        ? payload.matches
        : [];
    const improvements = Array.isArray(payload?.improvements)
      ? payload.improvements
      : [];
    if (!Array.isArray(matches) || !Array.isArray(improvements)) {
      return res.status(400).json({ error: 'Ungültige Import-Datei' });
    }
    if (matches.length === 0 && improvements.length === 0) {
      return res.status(400).json({ error: 'Import-Datei enthält keine Daten' });
    }
    const insert = db.prepare(
      `INSERT INTO matches (id, payload, createdAt)
       VALUES (@id, @payload, @createdAt)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, createdAt = excluded.createdAt`
    );
    const insertImprovement = db.prepare(
      `INSERT INTO improvements (id, payload, createdAt, completed, completedAt)
       VALUES (@id, @payload, @createdAt, @completed, @completedAt)
       ON CONFLICT(id) DO UPDATE SET
         payload = excluded.payload,
         createdAt = excluded.createdAt,
         completed = excluded.completed,
         completedAt = excluded.completedAt`,
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
    const insertImprovements = db.transaction((items) => {
      items.forEach((ticket) => {
        if (!ticket?.id || !ticket?.title) return;
        const normalized = normalizeImprovement(ticket);
        insertImprovement.run({
          id: normalized.id,
          payload: JSON.stringify(normalized),
          createdAt: normalized.createdAt,
          completed: normalized.completed ? 1 : 0,
          completedAt: normalized.completedAt,
        });
      });
    });
    if (matches.length > 0) {
      insertMany(matches);
    }
    if (improvements.length > 0) {
      insertImprovements(improvements);
    }
    return res.json({ imported: matches.length, improvements: improvements.length });
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

app.get('/api/improvements', (_req, res) => {
  const rows = db
    .prepare(
      'SELECT payload FROM improvements ORDER BY completed ASC, datetime(createdAt) DESC',
    )
    .all();
  const tickets = rows.map((row) => JSON.parse(row.payload));
  res.json(tickets);
});

app.post('/api/improvements', (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Ticket payload fehlt' });
    }
    const ticket = normalizeImprovement(req.body);
    if (!ticket?.id) {
      return res.status(400).json({ error: 'Ticket id fehlt' });
    }
    if (!ticket?.title) {
      return res.status(400).json({ error: 'Ticket Titel fehlt' });
    }
    const payload = JSON.stringify(ticket);
    const createdAt = ticket.createdAt;
    const completed = ticket.completed ? 1 : 0;
    const completedAt = ticket.completedAt;
    db.prepare(
      `INSERT INTO improvements (id, payload, createdAt, completed, completedAt)
       VALUES (@id, @payload, @createdAt, @completed, @completedAt)
       ON CONFLICT(id) DO UPDATE SET
         payload = excluded.payload,
         createdAt = excluded.createdAt,
         completed = excluded.completed,
         completedAt = excluded.completedAt`,
    ).run({ id: ticket.id, payload, createdAt, completed, completedAt });
    return res.status(201).json(ticket);
  } catch (error) {
    console.error('POST /api/improvements failed', error);
    return res.status(500).json({ error: 'Ticket konnte nicht gespeichert werden' });
  }
});

app.patch('/api/improvements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row = db
      .prepare('SELECT payload FROM improvements WHERE id = ?')
      .get(id);
    if (!row) {
      return res.status(404).json({ error: 'Ticket nicht gefunden' });
    }
    const current = JSON.parse(row.payload);
    const completed = Boolean(req.body?.completed);
    const updated = normalizeImprovement({
      ...current,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    });
    db.prepare(
      `UPDATE improvements
       SET payload = @payload,
           completed = @completed,
           completedAt = @completedAt
       WHERE id = @id`,
    ).run({
      id,
      payload: JSON.stringify(updated),
      completed: updated.completed ? 1 : 0,
      completedAt: updated.completedAt,
    });
    return res.json(updated);
  } catch (error) {
    console.error('PATCH /api/improvements failed', error);
    return res.status(500).json({ error: 'Ticket konnte nicht aktualisiert werden' });
  }
});

app.delete('/api/improvements', (_req, res) => {
  const result = db.prepare('DELETE FROM improvements').run();
  res.json({ deleted: result.changes });
});

app.get('/api/archive-links', (_req, res) => {
  const rows = db
    .prepare('SELECT payload FROM archive_links ORDER BY datetime(createdAt) DESC')
    .all();
  const links = rows.map((row) => JSON.parse(row.payload));
  res.json(links);
});

app.post('/api/archive-links', (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Link payload fehlt' });
    }
    const link = normalizeArchiveLink(req.body);
    if (!link?.id) {
      return res.status(400).json({ error: 'Link id fehlt' });
    }
    if (!link?.title) {
      return res.status(400).json({ error: 'Link Titel fehlt' });
    }
    if (!link?.url) {
      return res.status(400).json({ error: 'Link URL fehlt' });
    }
    const payload = JSON.stringify(link);
    const createdAt = link.createdAt;
    db.prepare(
      `INSERT INTO archive_links (id, payload, createdAt)
       VALUES (@id, @payload, @createdAt)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, createdAt = excluded.createdAt`,
    ).run({ id: link.id, payload, createdAt });
    return res.status(201).json(link);
  } catch (error) {
    console.error('POST /api/archive-links failed', error);
    return res.status(500).json({ error: 'Link konnte nicht gespeichert werden' });
  }
});

app.delete('/api/archive-links', (_req, res) => {
  const result = db.prepare('DELETE FROM archive_links').run();
  res.json({ deleted: result.changes });
});

app.delete('/api/archive-links/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM archive_links WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Link nicht gefunden' });
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