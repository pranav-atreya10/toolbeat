// Light, honest public health checks on company-owned remote MCP servers.
import fs from 'node:fs';
const UA = 'mcp-health-scan/0.1 (one-time public check; contact atreyapranav@gmail.com)';
const servers = JSON.parse(fs.readFileSync('registry_remote.json', 'utf8'));
// Company filter: domain-verified reverse-DNS namespace (not io.github.* individual accounts)
const company = servers.filter(s => !/^io\.github\./i.test(s.name) && /^[a-z0-9-]+\.[a-z0-9.-]+\//i.test(s.name));
console.log('company remote servers', company.length);
const T = 12000;
async function req(url, opts = {}) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), T);
  try { const r = await fetch(url, { ...opts, signal: c.signal, redirect: 'follow', headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
    const text = (await r.text()).slice(0, 20000); return { status: r.status, headers: Object.fromEntries(r.headers), text };
  } catch (e) { return { error: (e.cause?.code || e.name || 'error') + ': ' + (e.cause?.message || e.message || '') }; } finally { clearTimeout(t); }
}
function parseBody(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/^data:\s*(\{.*\})\s*$/m); if (m) { try { return JSON.parse(m[1]); } catch {} }
  return null;
}
const rpcHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
async function probe(s) {
  const out = { name: s.name, title: s.title, websiteUrl: s.websiteUrl, repository: s.repository, remotes: s.remotes, findings: [], details: {} };
  const types = s.remotes.map(r => r.type);
  if (types.length && types.every(t => t === 'sse')) out.findings.push('SSE_ONLY');
  const remote = s.remotes.find(r => r.type === 'streamable-http') || s.remotes[0];
  if (!remote?.url || remote.url.includes('{')) { out.details.skipped = 'templated or missing URL'; return out; }
  out.url = remote.url;
  if (remote.type === 'sse') {
    const r = await req(remote.url, { headers: { Accept: 'text/event-stream' } });
    out.details.sse = r.error || r.status;
    if (r.error) out.findings.push('UNREACHABLE'); else if (r.status >= 500) out.findings.push('SERVER_ERROR_' + r.status);
    else if (r.status === 404) out.findings.push('NOT_FOUND_404');
    return out;
  }
  const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'mcp-health-scan', version: '0.1' } } };
  const r = await req(remote.url, { method: 'POST', headers: rpcHeaders, body: JSON.stringify(init) });
  out.details.initStatus = r.error || r.status;
  if (r.error) { out.findings.push('UNREACHABLE'); out.details.error = r.error; return out; }
  if (r.status >= 500) { out.findings.push('SERVER_ERROR_' + r.status); return out; }
  if (r.status === 404) { out.findings.push('NOT_FOUND_404'); return out; }
  if (r.status === 401 || r.status === 403) {
    const wa = r.headers['www-authenticate'] || '';
    out.details.wwwAuthenticate = wa.slice(0, 300);
    let prmUrl = (wa.match(/resource_metadata="([^"]+)"/) || [])[1];
    if (!prmUrl) { const u = new URL(remote.url); prmUrl = u.origin + '/.well-known/oauth-protected-resource' + (u.pathname !== '/' ? u.pathname : ''); }
    let prm = await req(prmUrl);
    if (prm.status !== 200) { const u = new URL(remote.url); prm = await req(u.origin + '/.well-known/oauth-protected-resource'); }
    const pj = prm.status === 200 ? parseBody(prm.text) : null;
    out.details.prm = prm.error || prm.status;
    if (r.status === 401 && !wa) out.findings.push('AUTH_NO_WWW_AUTHENTICATE');
    if (!pj || !pj.authorization_servers) out.findings.push('AUTH_NO_PROTECTED_RESOURCE_METADATA');
    else out.details.authServers = pj.authorization_servers;
    return out;
  }
  const j = parseBody(r.text);
  if (!j) { out.findings.push('NON_JSONRPC_RESPONSE_' + r.status); out.details.body = r.text.slice(0, 200); return out; }
  if (j.error) { out.details.initError = j.error; if (r.status >= 400) out.findings.push('INIT_ERROR'); }
  if (j.result) {
    out.details.protocolVersion = j.result.protocolVersion; out.details.serverInfo = j.result.serverInfo;
    const sid = r.headers['mcp-session-id'];
    const h = { ...rpcHeaders, 'MCP-Protocol-Version': j.result.protocolVersion || '2025-06-18', ...(sid ? { 'Mcp-Session-Id': sid } : {}) };
    await req(remote.url, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
    const tl = await req(remote.url, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) });
    const tj = tl.text ? parseBody(tl.text) : null;
    if (tj?.result?.tools) {
      const tools = tj.result.tools; out.details.toolCount = tools.length;
      const bad = tools.filter(t => !t.inputSchema || t.inputSchema.type !== 'object').map(t => t.name);
      const noDesc = tools.filter(t => !t.description || t.description.trim().length < 10).map(t => t.name);
      if (bad.length) { out.findings.push('INVALID_TOOL_SCHEMA'); out.details.badTools = bad.slice(0, 5); }
      if (noDesc.length) { out.findings.push('MISSING_TOOL_DESCRIPTIONS'); out.details.noDescTools = noDesc.slice(0, 5); out.details.noDescCount = noDesc.length; }
      if (tools.length === 0) out.findings.push('ZERO_TOOLS');
    } else { out.details.toolsList = tl.error || tl.status; if (tj?.error) out.details.toolsError = tj.error; }
  }
  return out;
}
const results = []; let i = 0; const CONC = 30;
await Promise.all(Array.from({ length: CONC }, async () => { while (i < company.length) { const s = company[i++]; try { results.push(await probe(s)); } catch (e) { results.push({ name: s.name, err: String(e) }); } if (results.length % 200 === 0) console.log('probed', results.length); } }));
fs.writeFileSync('probe_results.json', JSON.stringify(results));
const counts = {}; for (const r of results) for (const f of (r.findings || [])) counts[f] = (counts[f] || 0) + 1;
console.log('DONE probed', results.length, JSON.stringify(counts));
