"""Random games. Whatever happens, the books balance, a refused call changes nothing and every pool ends up paid out.

Most operations are aimed at something that can plausibly work (a claim in an open round, a judge on a waiting claim,
a contest on a fresh judgement, an audit on a contest ...), the rest are aimed at random so that refusals get their share."""

import random

import pytest

from conftest import *

RND = random.Random(7)
ACTORS = [P.a, P.b, P.c, P.d, P.stranger, P.organizer, P.referee]
MEMBERS = [P.a, P.b, P.c, P.d]
COUNT = {}


def check_books(c, ledger):
    b = books(c)
    s = stats(c)
    assert b["balanced"], b
    assert int(s["paid"]) == ledger.total(), (s, ledger.total())
    assert int(s["deposited"]) - int(s["paid"]) == int(b["held"])
    assert int(s["bonds"]) == int(b["bonds"])
    for i in range(s["pools"]):
        row = prow(c, i)
        assert int(row["balance"]) >= int(row["bonds"]) >= 0
        if row["state"] in (CANCELLED, SETTLED):
            assert row["balance"] == "0" and row["bonds"] == "0"
        standing(c, i)  # must never fail


def neglected(seed, pid, who_hex, r):
    """About a quarter of the claims are never sent to the judge by anybody: they have to lapse as a miss."""
    return (seed + pid + r + int(who_hex[4:6], 16)) % 4 == 0


def check_no_credit_without_a_decision(c, pid):
    """No round ever counts unless somebody decided it (the judge, the audit or the referee): a claim that only waited,
    whether it is still waiting or its review time is over, is worth nothing. Returns how many claims lapsed unjudged."""
    row = prow(c, pid)
    lapsed = 0
    for m in row["members"]:
        if m["left"]:
            continue
        for r in range(row["rounds"]):
            rr = rrow(c, pid, m["who"], r)
            assert rr["state"] != "PASSED" or rr["decided_by"] != BY_NONE, rr
            assert not rr["credited"] or rr["decided_by"] != BY_NONE, rr
            if rr["claimed"] and rr["decided_by"] == BY_NONE and rr["final"]:
                assert rr["state"] == "MISSED" and not rr["credited"], rr
                lapsed += 1
    return lapsed


def attempt(c, vm, fn, *args, who, value=0, strict=None):
    """Run a call. If it is refused, the contract must be exactly as before."""
    if strict is None:
        strict = RND.random() < 0.1  # the full comparison is slow, so a tenth of the refusals get it
    before = fingerprint(c) if strict else None  # reading views resets the sender and value, so act after it
    act(vm, who, value)
    try:
        fn(*args)
        ok = True
    except Exception as e:  # noqa: BLE001 - any refusal counts
        ok = False
        msg = str(e)
        assert "UserError" in type(e).__name__ or "UserError" in msg or "LLM_ERROR" in msg or "not a valid" in msg, msg
        if strict:
            assert fingerprint(c) == before, f"a refused call changed the contract: {fn.__name__} {msg}"
    vm.value = 0
    COUNT[(fn.__name__, ok)] = COUNT.get((fn.__name__, ok), 0) + 1
    return ok


def candidates(row, now, kind):
    """(member, round, mark) of the rounds where `kind` of operation can plausibly work right now."""
    start, length, grace = row["start_at"] - T0, row["round_len"], row["grace"]
    out = []
    for m in row["members"]:
        if m["left"]:
            continue
        for r, mark in enumerate(m["marks"]):
            opens, closes = start + r * length, start + (r + 1) * length
            ok = {
                "claim": mark == "." and opens <= now < closes + grace,
                "judge": mark == "c" and now >= closes,
                "contest": mark in "pm", "audit": mark in "pm", "overrule": mark in "cpm", "lapse": mark in "pm",
            }.get(kind, True)
            if ok:
                out.append((m["who"], r, mark))
    return out


def as_addr(hexstr):
    return bytes.fromhex(hexstr[2:])


@pytest.mark.parametrize("seed", range(15))
def test_random_games_keep_the_books_and_end_paid_out(direct_vm, direct_deploy, ledger, seed):
    rnd = random.Random(seed)
    c = deploy(direct_deploy, direct_vm)
    vm = direct_vm
    pids = []
    for _ in range(rnd.choice([1, 2])):
        at(vm, 0)
        stake = rnd.choice([STAKE, STAKE + 1, 9 * MILLI, 15 * MILLI + 3])
        rounds = rnd.choice([2, 3, 4])
        lo = rnd.choice([2, 3])
        pid = create(
            c, vm, stake=stake, rounds=rounds, round_len=rnd.choice([120, 180]), starts_in=rnd.choice([60, 120]),
            min_entrants=lo, max_entrants=4, referee=hx(P.referee) if rnd.random() < 0.6 else "",
        )
        terms(c, vm, pid, grace=rnd.choice([0, 60, 120]), review_span=rnd.choice([600, 900]), dispute_span=rnd.choice([120, 300]), doubt_limit=rnd.choice([20, 35, 60]))
        at(vm, 10)
        for who in rnd.sample(MEMBERS, rnd.choice([lo, 4])):
            join(c, vm, who, pid, stake=stake)
        pids.append(pid)
    horizon = max(prow(c, p)["end_at"] - T0 for p in pids) + 2 * 86400
    t = 10
    for step in range(170):
        t += rnd.choice([3, 5, 8, 12, 20, 30])
        if t > horizon:
            break
        at(vm, t)
        for _ in range(4):
            pid = rnd.choice(pids)
            row = prow(c, pid)
            world(vm, rnd.choice(["MET", "MET", "UNCLEAR", "NOT_MET"]), rnd.choice([0, 10, 25, 40, 90]), status=rnd.choice([200, 200, 200, 200, 500]))
            mock_auditor(vm, rnd.choice(["MET", "UNCLEAR", "NOT_MET"]), rnd.choice([0, 10, 25, 40, 90]))
            stake, bond = int(row["stake"]), int(row["bond_due"])
            kind = rnd.choice(["claim"] * 4 + ["judge"] * 4 + ["contest"] * 3 + ["audit"] * 3 + ["overrule", "lapse", "join", "leave", "cancel", "settle", "terms"])
            aimed = rnd.random() < 0.8
            pool_cand = candidates(row, t, kind if aimed else "any")
            who_hex, r, _ = rnd.choice(pool_cand) if pool_cand else (hx(rnd.choice(MEMBERS)), rnd.randrange(-1, row["rounds"] + 1), "")
            target = as_addr(who_hex)
            member_who = rnd.choice(MEMBERS)
            if kind == "claim":
                attempt(c, vm, c.claim, pid, r, NOTE, who=target if aimed else member_who)
            elif kind == "judge":
                if not neglected(seed, pid, who_hex, r):
                    attempt(c, vm, c.judge, pid, who_hex, r, who=rnd.choice(ACTORS))
            elif kind == "contest":
                rival = rnd.choice([m for m in MEMBERS if m != target] or MEMBERS)
                attempt(c, vm, c.contest, pid, who_hex, r, "The log does not show an entry from this round.", who=target if rnd.random() < 0.4 else rival, value=bond if rnd.random() < 0.95 else 1)
            elif kind == "audit":
                attempt(c, vm, c.audit, pid, who_hex, r, who=rnd.choice(ACTORS))
            elif kind == "overrule":
                attempt(c, vm, c.overrule, pid, who_hex, r, rnd.random() < 0.5, "decided by hand", who=P.referee if rnd.random() < 0.9 else rnd.choice(ACTORS))
            elif kind == "lapse":
                attempt(c, vm, c.lapse_contest, pid, who_hex, r, who=rnd.choice(ACTORS))
            elif kind == "join":
                who = rnd.choice(ACTORS)
                attempt(c, vm, c.join, pid, url_of(who) if rnd.random() < 0.9 else "not a url", who=who, value=stake if rnd.random() < 0.9 else stake - 1)
            elif kind == "leave":
                attempt(c, vm, c.leave, pid, who=rnd.choice(ACTORS))
            elif kind == "cancel":
                if rnd.random() < 0.1:
                    attempt(c, vm, c.cancel_pool, pid, who=rnd.choice(ACTORS))
            elif kind == "settle":
                if rnd.random() < 0.05:
                    attempt(c, vm, c.settle, pid, who=rnd.choice(ACTORS))
            else:
                attempt(c, vm, c.set_terms, pid, 300, 3600, 900, 35, who=rnd.choice(ACTORS))
            check_books(c, ledger)
        if step % 20 == 0:
            for pid in pids:
                check_no_credit_without_a_decision(c, pid)
    # let everything run out, then make sure every pool can be closed and paid
    for pid in pids:
        row = prow(c, pid)
        if row["state"] != OPEN:
            continue
        at(vm, finished_at(c, pid) + 3 * 86400)
        COUNT[("unattended", True)] = COUNT.get(("unattended", True), 0) + check_no_credit_without_a_decision(c, pid)
        if int(row["active"]) < row["min_entrants"]:
            assert attempt(c, vm, c.cancel_pool, pid, who=P.stranger, strict=False)
        else:
            assert attempt(c, vm, c.settle, pid, who=P.stranger, strict=False), "a finished pool must always be settleable"
        assert prow(c, pid)["state"] in (CANCELLED, SETTLED)
        check_no_credit_without_a_decision(c, pid)
        check_books(c, ledger)
    assert books(c)["held"] == "0" and stats(c)["bonds"] == "0"
    assert int(stats(c)["deposited"]) == ledger.total() == int(stats(c)["paid"])


def test_zz_the_fuzz_really_played():
    """The random games must have reached every stage, otherwise they prove little."""
    needed = ["claim", "judge", "contest", "audit", "settle", "overrule", "join", "leave", "unattended"]
    if not COUNT:
        pytest.skip("the games did not run in this process")
    missing = [n for n in needed if COUNT.get((n, True), 0) == 0]
    assert not missing, (missing, COUNT)
