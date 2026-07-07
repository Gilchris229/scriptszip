import express from 'express';
import pg from 'pg';
import crypto from 'crypto';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function hashPin(telephone: string, pin: string): string {
  return crypto.createHash('sha256').update(`${telephone}:${pin}`).digest('hex');
}

app.get(['/backup-api/', '/backup-api'], (_req, res) => {
  res.json({ status: 'ok', service: 'Gestion Chaussures Backup API' });
});

app.get(['/backup-api/api/healthz', '/api/healthz'], (_req, res) => {
  res.json({ status: 'ok' });
});

app.post(['/backup-api/api/backup', '/api/backup'], async (req, res) => {
  try {
    const { telephone, pin, data } = req.body as { telephone?: string; pin?: string; data?: unknown };

    if (!telephone || !pin || !data) {
      res.status(400).json({ error: 'telephone, pin et data sont requis' });
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      res.status(400).json({ error: 'Le PIN doit être exactement 4 chiffres' });
      return;
    }

    const existing = await pool.query<{ pin_hash: string }>(
      'SELECT pin_hash FROM backups WHERE telephone = $1',
      [telephone]
    );

    if (existing.rows.length > 0) {
      const pinHash = hashPin(telephone, pin);
      if (existing.rows[0].pin_hash !== pinHash) {
        res.status(401).json({ error: 'PIN incorrect pour ce numéro de téléphone' });
        return;
      }
      await pool.query(
        'UPDATE backups SET data = $1, updated_at = NOW() WHERE telephone = $2',
        [JSON.stringify(data), telephone]
      );
    } else {
      const pinHash = hashPin(telephone, pin);
      await pool.query(
        'INSERT INTO backups (telephone, pin_hash, data) VALUES ($1, $2, $3)',
        [telephone, pinHash, JSON.stringify(data)]
      );
    }

    res.json({ success: true, message: 'Sauvegarde effectuée avec succès' });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post(['/backup-api/api/restore', '/api/restore'], async (req, res) => {
  try {
    const { telephone, pin } = req.body as { telephone?: string; pin?: string };

    if (!telephone || !pin) {
      res.status(400).json({ error: 'telephone et pin sont requis' });
      return;
    }

    const pinHash = hashPin(telephone, pin);
    const result = await pool.query<{ data: unknown; updated_at: string }>(
      'SELECT data, updated_at FROM backups WHERE telephone = $1 AND pin_hash = $2',
      [telephone, pinHash]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Aucune sauvegarde trouvée ou PIN incorrect' });
      return;
    }

    res.json({ success: true, data: result.rows[0].data, updatedAt: result.rows[0].updated_at });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const port = parseInt(process.env.PORT ?? '26259', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`Backup API server running on port ${port}`);
});
