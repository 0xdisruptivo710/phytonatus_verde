function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

export function createGithub({ token, repo, branch, fetchImpl = fetch }) {
  const base = `https://api.github.com/repos/${repo}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'phytonatus-cms',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  async function getFile(path) {
    const res = await fetchImpl(`${base}/contents/${encodePath(path)}?ref=${branch}`, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub getFile ${path} -> ${res.status}`);
    const j = await res.json();
    return { sha: j.sha, content: Buffer.from(j.content, 'base64') };
  }

  async function putFile(path, contentBuffer, sha, message) {
    const body = { message, content: Buffer.from(contentBuffer).toString('base64'), branch };
    if (sha) body.sha = sha;
    const res = await fetchImpl(`${base}/contents/${encodePath(path)}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub putFile ${path} -> ${res.status} ${await res.text()}`);
    return res.json();
  }

  async function listContentCommits(limit = 20) {
    const res = await fetchImpl(`${base}/commits?sha=${branch}&per_page=${limit}`, { headers });
    if (!res.ok) throw new Error(`GitHub commits -> ${res.status}`);
    const arr = await res.json();
    return arr
      .filter((c) => c.commit.message.startsWith('content:'))
      .map((c) => ({ sha: c.sha, message: c.commit.message, date: c.commit.committer.date }));
  }

  // Desfaz: restaura cada arquivo MODIFICADO no commit para a versão do pai.
  // Arquivos ADICIONADOS no commit são deixados como estão (limitação v1).
  async function revertCommit(sha) {
    const res = await fetchImpl(`${base}/commits/${sha}`, { headers });
    if (!res.ok) throw new Error(`GitHub getCommit -> ${res.status}`);
    const commit = await res.json();
    const parent = commit.parents && commit.parents[0] && commit.parents[0].sha;
    if (!parent) throw new Error('commit sem pai — não revertível');
    const results = [];
    for (const file of commit.files || []) {
      if (file.status !== 'modified') continue;
      const prev = await fetchImpl(`${base}/contents/${encodePath(file.filename)}?ref=${parent}`, { headers });
      if (!prev.ok) continue;
      const pj = await prev.json();
      const prevBuf = Buffer.from(pj.content, 'base64');
      const current = await getFile(file.filename);
      results.push(await putFile(file.filename, prevBuf, current && current.sha, `content: desfaz ${file.filename} (revert ${sha.slice(0, 7)})`));
    }
    if (results.length === 0) throw new Error('nada para desfazer neste commit');
    return { reverted: results.length };
  }

  return { getFile, putFile, listContentCommits, revertCommit };
}
