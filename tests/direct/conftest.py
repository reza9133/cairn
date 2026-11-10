"""Shared helpers for the direct-mode suite (genlayer-test fixtures)."""

import json
import sys
from datetime import datetime, timezone

import pytest

CONTRACT = "contracts/cairn.py"
MODULE = "_contract_cairn"
GEN = 10**18
MILLI = 10**15  # 0.001 GEN

# pool states, round states, deciders, bond states (the numbers the contract reports)
OPEN, CANCELLED, SETTLED = range(3)
CLAIMED, PASSED, MISSED = range(3)
BY_NONE, BY_AI, BY_DEFAULT, BY_AUDIT, BY_REFEREE = range(5)
BOND_NONE, BOND_HELD, BOND_REFUNDED, BOND_FORFEITED, BOND_REWARDED = range(5)

T0 = int(datetime(2026, 11, 2, 12, 0, 0, tzinfo=timezone.utc).timestamp())

TITLE = "Write every day"
RULES = (
    "Every round each member publishes at least one new dated entry on their own public log page. "
    "An entry counts only when it is dated inside the round and is about the member's own writing practice."
)
NOTE = "I published a new dated entry about my writing practice."
PAGE = (
    "<html><body><h1>Writing log</h1><p>Entry of this round: wrote 500 words about the morning routine. "
    "Another entry follows tomorrow.</p></body></html>"
)

STAKE = 6 * MILLI  # with 3 rounds a slice is 2 milli
ROUNDS = 3
ROUND_LEN = 600
STARTS_IN = 300


def hx(a) -> str:
    """Lower-case 0x form of an address object, raw bytes or a hex string."""
    if isinstance(a, str):
        return a.lower()
    if hasattr(a, "as_hex"):
        return str(a.as_hex).lower()
    return "0x" + bytes(a).hex()


def at(vm, offset: int) -> None:
    """Move the chain clock to T0 + offset seconds."""
    vm.warp(datetime.fromtimestamp(T0 + offset, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


def act(vm, who, value: int = 0):
    """The next call is made by `who` and carries `value`."""
    try:
        vm.deal(who, 1000 * GEN)
    except Exception:
        pass
    vm.sender = who
    vm.value = value


class Wire:
    """Stands in for the chain-level transfer so that payouts can be inspected."""

    sent = []

    def __init__(self, who):
        self.who = who

    def emit_transfer(self, **kw):
        Wire.sent.append((hx(self.who), int(kw["value"])))


class Ledger:
    def __init__(self):
        Wire.sent = []

    @property
    def sent(self):
        return Wire.sent

    def to(self, who) -> int:
        key = hx(who)
        return sum(v for a, v in Wire.sent if a == key)

    def total(self) -> int:
        return sum(v for _, v in Wire.sent)

    def count(self) -> int:
        return len(Wire.sent)


@pytest.fixture
def ledger():
    return Ledger()


def _forget_contract_class() -> None:
    """The SDK keeps one contract class per process; drop it so every test can deploy afresh."""
    for name in ("genlayer.gl.genvm_contracts", "genlayer.genvm_contracts"):
        registry = sys.modules.get(name)
        if registry is not None and hasattr(registry, "__known_contract__"):
            registry.__known_contract__ = None


def deploy(direct_deploy, direct_vm):
    at(direct_vm, 0)
    direct_vm.check_pickling = True  # the closures handed to the VM must be serializable
    _forget_contract_class()
    c = direct_deploy(CONTRACT)
    mod = sys.modules[MODULE]
    mod._Wire = Wire
    Wire.sent = []
    return c


def mod():
    """The loaded contract module (for the pure helper functions)."""
    return sys.modules[MODULE]


def stats(c) -> dict:
    return json.loads(c.stats())


def books(c) -> dict:
    return json.loads(c.solvency())


def _lowered(row):
    if isinstance(row, dict):
        for k, v in row.items():
            if k in ("organizer", "referee", "who", "member", "contester") and isinstance(v, str):
                row[k] = v.lower()
            elif k == "members":
                for d in v:
                    _lowered(d)
    return row


def prow(c, pool_id: int) -> dict:
    return _lowered(json.loads(c.get_pool(pool_id)))


def rrow(c, pool_id: int, who, r: int) -> dict:
    return _lowered(json.loads(c.get_round(pool_id, hx(who), r)))


def standing(c, pool_id: int) -> dict:
    return json.loads(c.standing(pool_id))


def member(c, pool_id: int, who) -> dict:
    for m in prow(c, pool_id)["members"]:
        if m["who"] == hx(who):
            return m
    raise AssertionError("no such member")


def _actor(n: int) -> bytes:
    return bytes([0xC0, n]) + bytes(18)


class P:
    """Fixed actors, as raw 20-byte addresses."""

    organizer = _actor(1)
    referee = _actor(2)
    a = _actor(3)
    b = _actor(4)
    c = _actor(5)
    d = _actor(6)
    stranger = _actor(8)
    extra = [_actor(20 + i) for i in range(30)]


ZERO_ADDRESS = "0x" + "0" * 40


def url_of(who) -> str:
    return f"https://log-{bytes(who)[1]}.writers.org/journal"


# ---- pool setup -----------------------------------------------------------------------------------------------------


def create(
    c, vm, organizer=P.organizer, stake=STAKE, rounds=ROUNDS, round_len=ROUND_LEN, starts_in=STARTS_IN,
    min_entrants=2, max_entrants=4, referee="", title=TITLE, rules=RULES,
) -> int:
    act(vm, organizer)
    return c.create_pool(title, rules, stake, rounds, round_len, starts_in, min_entrants, max_entrants, referee)


def terms(c, vm, pid, organizer=P.organizer, grace=300, review_span=3600, dispute_span=900, doubt_limit=35):
    act(vm, organizer)
    c.set_terms(pid, grace, review_span, dispute_span, doubt_limit)


def join(c, vm, who, pid, url=None, stake=STAKE):
    act(vm, who, stake)
    c.join(pid, url if url is not None else url_of(who))
    vm.value = 0


def pool_with(c, vm, members=(P.a, P.b, P.c), referee="", **kw) -> int:
    """A pool with the given members; the clock stands at 10 s, before the start."""
    at(vm, 0)
    pid = create(c, vm, referee=referee, **kw)
    terms(c, vm, pid)
    at(vm, 10)
    for who in members:
        join(c, vm, who, pid, stake=kw.get("stake", STAKE))
    return pid


def start_of(c, pid) -> int:
    return prow(c, pid)["start_at"] - T0


def open_of(c, pid, r) -> int:
    return start_of(c, pid) + r * ROUND_LEN


def close_of(c, pid, r) -> int:
    return start_of(c, pid) + (r + 1) * ROUND_LEN


def claim(c, vm, who, pid, r, note=NOTE, offset=None):
    if offset is not None:
        at(vm, offset)
    act(vm, who)
    c.claim(pid, r, note)


def mock_page(vm, body=PAGE, pattern=r"writers\.org", status=200):
    vm.mock_web(pattern, {"status": status, "body": body})


def judge_reply(verdict="MET", doubt=10, flags=(), reason="The log shows a dated entry in the round."):
    return {"verdict": verdict, "doubt": doubt, "flags": list(flags), "reason": reason}


def mock_judge(vm, verdict="MET", doubt=10, flags=(), reason="The log shows a dated entry in the round.", raw=None):
    vm.mock_llm(r"round judge", raw if raw is not None else json.dumps(judge_reply(verdict, doubt, flags, reason)))


def mock_auditor(vm, verdict="MET", doubt=10, flags=(), reason="The evidence holds.", raw=None):
    vm.mock_llm(r"second-opinion auditor", raw if raw is not None else json.dumps(judge_reply(verdict, doubt, flags, reason)))


def world(vm, verdict="MET", doubt=10, page=PAGE, status=200, **kw):
    """Fresh mocks: the evidence pages and the judge's answer."""
    vm.clear_mocks()
    mock_page(vm, body=page, status=status)
    mock_judge(vm, verdict, doubt, **kw)


def judge(c, vm, caller, pid, who, r, verdict="MET", doubt=10, offset=None, **kw):
    """Ask for the judgement at `offset` (or now) with the given judge answer."""
    world(vm, verdict, doubt, **kw)
    if offset is not None:
        at(vm, offset)
    act(vm, caller)
    c.judge(pid, hx(who), r)


def audit(c, vm, caller, pid, who, r, verdict="MET", doubt=10, offset=None, page=PAGE, **kw):
    vm.clear_mocks()
    mock_page(vm, body=page)
    mock_auditor(vm, verdict, doubt, **kw)
    if offset is not None:
        at(vm, offset)
    act(vm, caller)
    c.audit(pid, hx(who), r)


def bond_of(c, pid) -> int:
    return int(prow(c, pid)["bond_due"])


def contest(c, vm, caller, pid, who, r, reason="The log does not show an entry from this round.", offset=None):
    if offset is not None:
        at(vm, offset)
    bond = bond_of(c, pid)
    act(vm, caller, bond)
    c.contest(pid, hx(who), r, reason)
    vm.value = 0
    return bond


def settle(c, vm, pid, offset=None, caller=P.stranger):
    if offset is not None:
        at(vm, offset)
    act(vm, caller)
    c.settle(pid)


def finished_at(c, pid) -> int:
    """A moment after which every round, claim window, review time and dispute time of the pool is over."""
    p = prow(c, pid)
    return p["end_at"] - T0 + p["grace"] + p["review_span"] + p["dispute_span"] + 10


def played(c, vm, pid, plan, judged=True):
    """Everybody claims and gets judged. `plan` maps a member to a list of verdicts, one per round ("-" = no claim).
    Returns the clock offset after the last judgement."""
    t = 0
    for r in range(ROUNDS):
        for who, marks in plan.items():
            if marks[r] != "-":
                claim(c, vm, who, pid, r, offset=open_of(c, pid, r) + 1)
        t = close_of(c, pid, r) + 1
        if judged:
            for who, marks in plan.items():
                if marks[r] != "-":
                    judge(c, vm, P.stranger, pid, who, r, verdict=marks[r], doubt=10 if marks[r] == "MET" else 90, offset=t)
    return t


def fingerprint(c) -> str:
    """Everything observable about the contract, so that a refused call can be shown to change nothing."""
    s = stats(c)
    rows = []
    for i in range(s["pools"]):
        row = prow(c, i)
        rows.append(row)
        for m in row["members"]:
            if not m["left"]:
                for r in range(row["rounds"]):
                    if m["marks"][r] not in ".":
                        rows.append(rrow(c, i, m["who"], r))
    return json.dumps([s, books(c), rows, list(Wire.sent)], sort_keys=True)


def refuse(c, vm, msg, fn, *args, who=None, value=0):
    """The call must be refused with `msg` in the error, and it must leave the contract exactly as it was."""
    before = fingerprint(c)  # reading views resets the sender and value, so act only after it
    if who is not None:
        act(vm, who, value)
    with vm.expect_revert(msg):
        fn(*args)
    vm.value = 0
    assert fingerprint(c) == before, "a refused call changed the contract"


def fresh(direct_deploy, direct_vm):
    return deploy(direct_deploy, direct_vm)
