"""A rehearsal of the live script (scripts/e2e.mjs) without a network.

The script runs in Node with a virtual clock and a stand-in for genlayer-js. Every call it makes is answered here by
the real contract code in the direct runner, with the web and the model mocked. This proves that the live script walks
the contract through the right steps in the right order, that its checks agree with the contract, and that it finishes.
It cannot prove how the real model or the real validators behave: that is what the live run is for.

The script also walks the review timeout: in the `unattended` scenario one member's claim is never sent to the judge, and
the rehearsal checks that it ends as a miss with no credited slice and a zero payout while the judged rival is credited.

Three modes change what the mocked judge and auditor say, so that every branch of the arena is walked at least once:
  dismiss  the rival's contest of a credited round is dismissed (the auditor confirms the round)
  uphold   the rival's contest is upheld (the auditor refuses the round) and the rival earns the reward
  owner    the judge refuses alice's round and alice's own contest is upheld
"""

import http.server
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone

import pytest

from conftest import *

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ARTICLES = {
    "Moon": "The Moon is Earth's only natural satellite. It orbits the Earth about every 27 days and has no breathable atmosphere. " * 4,
    "Mars": "Mars is the fourth planet from the Sun and the second smallest planet in the Solar System, a cold desert world with thin air. " * 4,
    "Earth": "Earth is the third planet from the Sun and the only astronomical object known to harbour life, with oceans and an atmosphere. " * 4,
    "Sun": "The Sun is the star at the centre of the Solar System, a nearly perfect ball of hot plasma heated by nuclear fusion in its core. " * 4,
}


class Chain:
    def __init__(self, c, vm, mode):
        self.c, self.vm, self.mode = c, vm, mode
        self.balances = {}
        self.txs = {}
        self.deployed = None
        self.calls = []

    def warp(self, now):
        self.vm.warp(datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))

    def credit(self, who, wei):
        self.balances[who] = self.balances.get(who, 0) + wei

    def addr(self, text):
        return bytes.fromhex(text[2:])

    def decode(self, v):
        if isinstance(v, dict) and "$big" in v:
            return int(v["$big"])
        if isinstance(v, list):
            return [self.decode(x) for x in v]
        return v

    def rpc(self, method, params):
        if method == "eth_chainId":
            return "0x1"
        if method == "eth_getBalance":
            return hex(self.balances.get(params[0].lower(), 0))
        if method == "sim_fundAccount":
            self.credit(params[0].lower(), int(params[1]))
            return True
        raise RuntimeError(f"unknown rpc {method}")

    def handle(self, req):
        op = req["op"]
        if op == "rpc":
            raw = json.loads(req["raw"]) if req.get("raw") else {}
            params = raw.get("params") or req.get("params") or []
            # sim_fundAccount carries a number that JSON would round: read it from the raw text
            if req["method"] == "sim_fundAccount":
                import re

                m = re.search(r'"params":\["(0x[0-9a-fA-F]{40})",(\d+)\]', req["raw"])
                params = [m.group(1), m.group(2)]
            return {"body": {"jsonrpc": "2.0", "id": 1, "result": self.rpc(req["method"], params)}}
        self.warp(req["now"])
        args = self.decode(req.get("args", []))
        if op == "deploy":
            self.deployed = "0x" + bytes(20).hex()[:0] + "ca" * 20
            self.txs["deploy"] = {"ok": True, "deployed": self.deployed}
            return {"hash": "deploy"}
        if op == "read":
            try:
                return {"result": getattr(self.c, req["fn"])(*args)}
            except Exception as e:  # noqa: BLE001
                return {"error": str(e)}
        if op == "write":
            who = req["sender"].lower()
            value = int(self.decode(req.get("value", 0)) if not isinstance(req.get("value"), (int, str)) else req.get("value") or 0)
            h = f"0x{len(self.txs):064x}"
            self.calls.append((who, req["fn"], args, value))
            if value > self.balances.get(who, 0):
                self.txs[h] = {"ok": False, "why": "insufficient funds"}
                return {"error": "insufficient funds for the transfer"}
            act(self.vm, self.addr(who), value)
            try:
                getattr(self.c, req["fn"])(*args)
                self.vm.value = 0
                self.balances[who] = self.balances.get(who, 0) - value
                self.txs[h] = {"ok": True}
            except Exception as e:  # noqa: BLE001
                self.vm.value = 0
                self.txs[h] = {"ok": False, "why": str(e)[:200]}
            return {"hash": h}
        if op == "receipt":
            tx = self.txs[req["hash"]]
            if req["hash"] == "deploy":
                return {"receipt": {"statusName": "ACCEPTED", "txExecutionResultName": "FINISHED_WITH_RETURN", "txDataDecoded": {"contractAddress": tx["deployed"]}}}
            return {"receipt": {"statusName": "ACCEPTED", "txExecutionResultName": "FINISHED_WITH_RETURN" if tx["ok"] else "FINISHED_WITH_ERROR"}}
        raise RuntimeError(f"unknown op {op}")


def install_world(chain):
    """The web pages and the model: an article is on topic when it is about the Moon, as in the live script."""
    vm, m = chain.vm, mod()
    for name, text in ARTICLES.items():
        vm.mock_web(rf"en\.wikipedia\.org/wiki/{name}$", {"status": 200, "body": f"<html><body><h1>{name}</h1><p>{text}</p></body></html>"})

    def fake_ask(prompt):
        evidence = prompt.rsplit("<evidence>", 1)[1].split("</evidence>")[0]
        claim = prompt.rsplit("<claim>", 1)[1].split("</claim>")[0]
        audit = "second-opinion auditor" in prompt
        on_topic = "Moon" in evidence[:200] and "Moon" in claim
        if chain.mode == "owner" and "Moon is Earth's only" in claim and "Moon" in evidence[:200]:
            # the judge is too strict with alice's first claim; the auditor sees it clearly
            if audit:
                return {"verdict": "MET", "doubt": 8, "flags": [], "reason": "The article states exactly this."}
            return {"verdict": "UNCLEAR", "doubt": 55, "flags": ["vague"], "reason": "Not clearly dated."}
        if on_topic:
            if audit and chain.mode == "uphold":
                return {"verdict": "NOT_MET", "doubt": 80, "flags": ["stale"], "reason": "Nothing shows the date."}
            return {"verdict": "MET", "doubt": 15 if audit else 10, "flags": [], "reason": "The article says it."}
        return {"verdict": "NOT_MET", "doubt": 85, "flags": ["off_rules"], "reason": "The page is about another subject."}

    m._ask = fake_ask


def serve(chain, proc, limit=600):
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["content-length"])))
            try:
                out = chain.handle(body)
            except Exception as e:  # noqa: BLE001
                out = {"error": f"rehearsal server: {type(e).__name__}: {e}", "body": {"error": {"message": str(e)}}}
            data = json.dumps(out).encode()
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    server.timeout = 0.2
    return server, Handler


@pytest.mark.parametrize("mode", ["dismiss", "uphold", "owner"])
def test_the_live_script_runs_to_the_end_against_the_contract(direct_vm, direct_deploy, tmp_path, mode):
    if shutil.which("node") is None:
        pytest.skip("node is not installed")
    c = deploy(direct_deploy, direct_vm)
    chain = Chain(c, direct_vm, mode)
    mod()._Wire = type("W", (), {"__init__": lambda s, who: setattr(s, "who", who), "emit_transfer": lambda s, **kw: chain.credit(hx(s.who), int(kw["value"]))})
    install_world(chain)
    # the script runs in its own folder, where `genlayer-js` is the stand-in
    run = tmp_path / "run"
    (run / "node_modules").mkdir(parents=True)
    shutil.copytree(os.path.join(ROOT, "rehearsal", "fake-genlayer-js"), run / "node_modules" / "genlayer-js")
    shutil.copytree(os.path.join(ROOT, "scripts"), run / "scripts")
    (run / "contracts").mkdir()
    shutil.copy(os.path.join(ROOT, "contracts", "cairn.py"), run / "contracts" / "cairn.py")
    (run / "package.json").write_text('{"type": "module"}')
    server, _ = serve(chain, None)
    keys = {k: "0x" + f"{i:02x}" * 32 for i, k in enumerate(["ORGANIZER_KEY", "ALICE_KEY", "BOB_KEY", "CAROL_KEY"], start=1)}
    env = {**os.environ, **keys, "REHEARSAL_URL": f"http://127.0.0.1:{server.server_port}", "REPORT_DIR": str(run / "reports")}
    for k in ("REFEREE_KEY", "OUTSIDER_KEY", "CAIRN_ADDRESS"):
        env.pop(k, None)
    proc = subprocess.Popen(
        ["node", "--import", os.path.join(ROOT, "rehearsal", "fake-time.mjs"), str(run / "scripts" / "e2e.mjs")],
        cwd=run, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    # the script funds accounts through the simulator and deploys: the stand-in chain starts with them funded
    for k, key in keys.items():
        import hashlib

        chain.credit("0x" + hashlib.sha256(key.encode()).hexdigest()[:40], 10**18)
    out = []
    import threading

    reader = threading.Thread(target=lambda: out.extend(proc.stdout), daemon=True)
    reader.start()
    import time

    began = time.time()
    while proc.poll() is None:
        server.handle_request()
        if time.time() - began > 280:
            proc.kill()
            pytest.fail("the live script did not finish in time:\n" + "".join(out)[-3000:])
    reader.join(timeout=5)
    text = "".join(out)
    reports = sorted((run / "reports").glob("cairn-e2e-*.json"))
    assert reports, text[-3000:]
    rep = json.loads(reports[-1].read_text())
    failed = [(sc["name"], ch["name"], ch["detail"]) for sc in rep["scenarios"] for ch in sc["checks"] if not ch["ok"]]
    bad_steps = [(sc["name"], st["label"], st["status"]) for sc in rep["scenarios"] for st in sc["steps"] if not st["ok"] and not st["expectedFail"]]
    statuses = {sc["name"]: sc["status"] for sc in rep["scenarios"]}
    assert not failed and not bad_steps, f"failed checks: {failed}\nfailed steps: {bad_steps}\nstatuses: {statuses}\n" + text[-2500:]
    assert statuses == {"basics": "passed", "nostart": "passed", "unattended": "passed", "arena": "passed", "totals": "passed"}, statuses
    assert proc.returncode == 0, text[-2000:]
    assert books(c)["balanced"] and stats(c)["settled"] == 2 and stats(c)["cancelled"] == 2
    # the review timeout: the unjudged claim lapsed as a miss, and the unattended member was paid nothing (the mocked
    # judge credits the rival in every mode, so the zero-payout check must have run, not been replaced by a note)
    unattended = next(sc for sc in rep["scenarios"] if sc["name"] == "unattended")
    ran = {ch["name"]: ch["ok"] for ch in unattended["checks"]}
    for name in (
        "after the review time alice's unjudged claim is a final MISS",
        "it received no credit and no decision was ever made on it",
        "alice has no credited round at all",
        "alice receives nothing: bob alone takes the credited slice and the whole pot",
        "every member was paid what the independent model says",
    ):
        assert ran.get(name) is True, (name, ran)
    # which branch of the arena was walked
    audits = [v for v in rep["verdicts"] if v["stage"].startswith("audit")]
    stages = " | ".join(f'{v["stage"]}={v["verdict"]}' for v in rep["verdicts"])
    print(f"[{mode}] checks {rep['summary']['passed']}/{rep['summary']['checks']}, transactions {rep['summary']['transactions']}; {stages}")
    if mode == "uphold":
        assert any(v["verdict"] == "NOT_MET" for v in audits if "alice" in v["stage"])
    if mode == "owner":
        assert any(v["verdict"] == "MET" for v in audits if "alice" in v["stage"])
