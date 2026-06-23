// Fake fetch: routes é uma lista de { match(url, init) => bool, respond(url, init) => {status, json?, text?} }
export function fakeFetch(routes) {
  const calls = [];
  async function f(url, init = {}) {
    calls.push({ url, init });
    for (const r of routes) {
      if (r.match(url, init)) {
        const out = r.respond(url, init);
        return {
          ok: (out.status || 200) >= 200 && (out.status || 200) < 300,
          status: out.status || 200,
          async json() { return out.json; },
          async text() { return out.text || JSON.stringify(out.json || {}); },
        };
      }
    }
    throw new Error(`fakeFetch: rota não encontrada para ${url}`);
  }
  f.calls = calls;
  return f;
}

export function mockReq({ method = 'GET', body = {}, cookie = '' } = {}) {
  return { method, body, headers: { cookie } };
}

export function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    setHeader(k, v) { this.headers[k] = v; return this; },
  };
}
