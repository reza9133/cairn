// Preloaded with `node --import`. Makes the clock virtual so that the long waits of the live script cost nothing,
// and sends every HTTP call of the script to the rehearsal server.
const realFetch = globalThis.fetch;
globalThis.__realFetch = realFetch;
let skew = 0; // virtual milliseconds added to the real clock
const realNow = Date.now.bind(Date);
Date.now = () => realNow() + skew;
globalThis.__advance = (seconds) => {
  skew += seconds * 1000;
};
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms = 0, ...args) => {
  // Time only moves for the script's own waits (the long ones); the runtime's short internal timers are left alone.
  if (Number(ms) >= 500) skew += Number(ms);
  return realSetTimeout(fn, Number(ms) >= 500 ? 0 : ms, ...args);
};
globalThis.fetch = async (url, opts = {}) => {
  const body = JSON.parse(opts.body ?? "{}");
  const res = await realFetch(process.env.REHEARSAL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "rpc", method: body.method, params: body.params, now: Math.floor(Date.now() / 1000), raw: opts.body }),
  });
  const out = await res.json();
  return new Response(JSON.stringify(out.body), { status: 200, headers: { "content-type": "application/json", date: new Date(Date.now()).toUTCString() } });
};
