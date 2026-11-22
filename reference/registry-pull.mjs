// Pull all servers from the official MCP registry, keep latest version with remote endpoints.
import fs from 'node:fs';
const base = 'https://registry.modelcontextprotocol.io/v0/servers';
let cursor = null, pages = 0; const byName = new Map();
while (true) {
  const u = new URL(base); u.searchParams.set('limit', '100'); if (cursor) u.searchParams.set('cursor', cursor);
  let r, j;
  for (let a = 0; a < 4; a++) { try { r = await fetch(u, { headers: { 'User-Agent': 'mcp-health-scan/0.1 (research; contact atreyapranav@gmail.com)' } }); j = await r.json(); break; } catch (e) { await new Promise(s => setTimeout(s, 2000)); } }
  if (!j) { console.error('fetch failed', u.toString()); break; }
  for (const item of (j.servers || [])) {
    const s = item.server || item; const meta = (item._meta || s._meta || {})['io.modelcontextprotocol.registry/official'] || {};
    if (!s.name) continue;
    const prev = byName.get(s.name);
    const rec = { name: s.name, title: s.title, description: s.description, version: s.version, websiteUrl: s.websiteUrl, repository: s.repository?.url, remotes: s.remotes || [], isLatest: !!meta.isLatest, status: meta.status, publishedAt: meta.publishedAt, updatedAt: meta.updatedAt };
    if (!prev || rec.isLatest || (!prev.isLatest && (rec.publishedAt || '') > (prev.publishedAt || ''))) byName.set(s.name, rec);
  }
  pages++; cursor = j.metadata?.nextCursor || j.metadata?.next_cursor;
  if (pages % 50 === 0) console.log('pages', pages, 'servers', byName.size);
  if (!cursor) break;
}
const all = [...byName.values()];
const remote = all.filter(s => s.remotes.length && s.status !== 'deleted' && s.status !== 'deprecated');
fs.writeFileSync('registry_all.json', JSON.stringify(all));
fs.writeFileSync('registry_remote.json', JSON.stringify(remote));
console.log('DONE pages', pages, 'unique', all.length, 'remote', remote.length);
