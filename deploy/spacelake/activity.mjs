import fs from 'node:fs/promises';

export async function createActivity({ file, now = Date.now } = {}) {
  let days = {};
  const seen = new Map();
  let writes = Promise.resolve();
  if (file) {
    try { days = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return {
    accept(data) {
      if (!data || !/^[a-f0-9-]{36}$/i.test(data.session ?? '') ||
          !Number.isSafeInteger(data.sequence) || data.sequence < 1 ||
          !Number.isSafeInteger(data.activeMs) || data.activeMs < 0 || data.activeMs > 120000 ||
          typeof data.visible !== 'boolean') return false;
      const time = now();
      for (const [id, value] of seen) if (time - value.at > 3600000) seen.delete(id);
      const previous = seen.get(data.session);
      if (previous?.sequence >= data.sequence) return true;
      if (seen.size >= 10000 && !previous) seen.delete(seen.keys().next().value);
      seen.set(data.session, { sequence: data.sequence, at: time, visible: data.visible });
      const day = new Date(time).toISOString().slice(0, 10);
      const row = days[day] ??= { visits: 0, activeMs: 0 };
      // Sequence 1 is the page-open event; a reporter/app restart cannot recount a heartbeat.
      if (data.sequence === 1) row.visits += 1;
      row.activeMs += data.activeMs;
      for (const key of Object.keys(days).sort().slice(0, -90)) delete days[key];
      return true;
    },
    snapshot() {
      const row = days[new Date(now()).toISOString().slice(0, 10)];
      return { visits_today: row?.visits ?? 0, active_minutes_today: (row?.activeMs ?? 0) / 60000,
        active_visits: [...seen.values()].filter(value => value.visible && now() - value.at < 45000).length };
    },
    async flush() {
      if (!file) return;
      const value = JSON.stringify(days);
      const write = writes.catch(() => {}).then(async () => {
        await fs.writeFile(file + '.tmp', value, { mode: 0o600 });
        await fs.rename(file + '.tmp', file);
      });
      writes = write;
      await write;
    },
  };
}
