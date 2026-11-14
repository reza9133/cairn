import random

import pytest

from conftest import *

SLICE = STAKE // ROUNDS


def model(stake, rounds, credits, extra=0):
    """An independent statement of the payout rule. `credits` lists the credited rounds of each member in join order;
    `extra` is the money in the pool beyond the stakes (forfeited bonds minus rewards)."""
    sl = stake // rounds
    n = len(credits)
    balance = n * stake + extra
    total = sum(credits)
    if total == 0:
        base = balance // n
        out = [base] * n
        out[0] += balance - base * n
        return out
    pot = balance - total * sl
    shares = [pot * c // total for c in credits]
    out = [c * sl + s for c, s in zip(credits, shares)]
    top = max(range(n), key=lambda i: (credits[i], -i))
    out[top] += pot - sum(shares)
    return out


def finish(c, vm, pid, caller=P.stranger):
    settle(c, vm, pid, offset=finished_at(c, pid), caller=caller)


def start(direct_deploy, direct_vm, members=(P.a, P.b, P.c), **kw):
    c = deploy(direct_deploy, direct_vm)
    return c, pool_with(c, direct_vm, members=members, **kw)


def paid(ledger, members):
    return [ledger.to(m) for m in members]


# ---- the payout rule --------------------------------------------------------------------------------------------------


def test_a_pot_is_shared_in_proportion_to_credited_rounds(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm)
    played(c, direct_vm, pid, {P.a: ["MET", "MET", "MET"], P.b: ["MET", "NOT_MET", "-"], P.c: ["-", "-", "-"]})
    finish(c, direct_vm, pid)
    # balance 18, credited slices 4 * 2 = 8, pot 10: a gets 6 + 7.5, b gets 2 + 2.5, c gets nothing
    assert paid(ledger, (P.a, P.b, P.c)) == [13 * MILLI + MILLI // 2, 4 * MILLI + MILLI // 2, 0]
    assert paid(ledger, (P.a, P.b, P.c)) == model(STAKE, ROUNDS, [3, 1, 0])
    assert prow(c, pid)["state"] == SETTLED and prow(c, pid)["balance"] == "0" and prow(c, pid)["phase"] == "settled"
    assert books(c)["balanced"] and stats(c)["settled"] == 1 and stats(c)["volume"] == str(3 * STAKE)
    assert [m["credited"] for m in prow(c, pid)["members"]] == [3, 1, 0]
    assert [int(m["payout"]) for m in prow(c, pid)["members"]] == paid(ledger, (P.a, P.b, P.c))


def test_everybody_who_kept_every_round_gets_the_stake_back(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm)
    played(c, direct_vm, pid, {m: ["MET"] * 3 for m in (P.a, P.b, P.c)})
    finish(c, direct_vm, pid)
    assert paid(ledger, (P.a, P.b, P.c)) == [STAKE] * 3 and books(c)["balanced"]


def test_when_nobody_kept_a_round_everything_is_shared_equally(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm, stake=STAKE + 1)
    played(c, direct_vm, pid, {P.a: ["NOT_MET"] * 3, P.b: ["UNCLEAR"] * 3, P.c: ["-"] * 3})
    finish(c, direct_vm, pid)
    out = paid(ledger, (P.a, P.b, P.c))
    assert out == model(STAKE + 1, ROUNDS, [0, 0, 0]) and sum(out) == 3 * (STAKE + 1)
    assert out[0] - out[1] == 0 and out[1] == out[2]  # 3 * (STAKE + 1) divides by 3 exactly


def test_the_remainder_of_an_equal_split_goes_to_the_first_member(direct_vm, direct_deploy, ledger):
    # nobody keeps a round, and one lost contest puts a bond into the pot: 19 milli cannot be split three ways exactly
    c, pid = start(direct_deploy, direct_vm)
    claim(c, direct_vm, P.b, pid, 0, offset=open_of(c, pid, 0) + 1)
    judge(c, direct_vm, P.stranger, pid, P.b, 0, "NOT_MET", 90, offset=close_of(c, pid, 0))
    bond = contest(c, direct_vm, P.b, pid, P.b, 0, offset=close_of(c, pid, 0) + 5)
    audit(c, direct_vm, P.stranger, pid, P.b, 0, "UNCLEAR", 50, offset=close_of(c, pid, 0) + 10)
    finish(c, direct_vm, pid)
    out = paid(ledger, (P.a, P.b, P.c))
    assert out == model(STAKE, ROUNDS, [0, 0, 0], bond) and sum(out) == 3 * STAKE + bond - 0
    assert out[0] == out[1] + 1 and out[1] == out[2]  # the first member to join takes the one wei that is left
    assert books(c)["balanced"]


def test_the_rounding_remainder_goes_to_the_best_member_then_the_earliest(direct_vm, direct_deploy, ledger):
    stake = STAKE + 2  # slice stays 2 milli; two wei of dust enter the pot
    c, pid = start(direct_deploy, direct_vm, stake=stake)
    played(c, direct_vm, pid, {P.a: ["MET", "NOT_MET", "-"], P.b: ["MET", "MET", "-"], P.c: ["MET", "MET", "-"]})
    finish(c, direct_vm, pid)
    out = paid(ledger, (P.a, P.b, P.c))
    assert out == model(stake, ROUNDS, [1, 2, 2]) and sum(out) == 3 * stake
    # b and c tie on two credited rounds: the earlier one (b) takes the remainder
    assert out[1] >= out[2]


@pytest.mark.parametrize("stake", [STAKE, STAKE + 1, STAKE + 2, 7 * MILLI + 5, 10**18, 3 * MILLI, 12345678901234567])
def test_payouts_always_add_up_to_what_was_paid_in(direct_vm, direct_deploy, ledger, stake):
    c, pid = start(direct_deploy, direct_vm, stake=stake)
    played(c, direct_vm, pid, {P.a: ["MET", "MET", "NOT_MET"], P.b: ["MET", "-", "-"], P.c: ["NOT_MET", "MET", "MET"]})
    finish(c, direct_vm, pid)
    out = paid(ledger, (P.a, P.b, P.c))
    assert sum(out) == 3 * stake and out == model(stake, ROUNDS, [2, 1, 2]) and books(c)["balanced"]


@pytest.mark.parametrize("seed", range(25))
def test_random_games_pay_exactly_like_the_model(direct_vm, direct_deploy, ledger, seed):
    rnd = random.Random(seed)
    stake = rnd.choice([STAKE, STAKE + 1, 9 * MILLI + 7, 4 * MILLI + 1])
    rounds = 3
    members = (P.a, P.b, P.c, P.d)[: rnd.choice([2, 3, 4])]
    c, pid = start(direct_deploy, direct_vm, members=members, stake=stake, rounds=rounds)
    plan = {m: [rnd.choice(["MET", "MET", "NOT_MET", "UNCLEAR", "-"]) for _ in range(rounds)] for m in members}
    played(c, direct_vm, pid, plan)
    finish(c, direct_vm, pid)
    credits = [sum(1 for x in plan[m] if x == "MET") for m in members]
    out = paid(ledger, members)
    assert out == model(stake, rounds, credits), (plan, out)
    assert sum(out) == len(members) * stake and books(c)["balanced"] and ledger.total() == sum(out)


# ---- when can a pool be settled ---------------------------------------------------------------------------------------


def test_settle_waits_for_the_last_round(direct_vm, direct_deploy):
    c, pid = start(direct_deploy, direct_vm)
    at(direct_vm, prow(c, pid)["end_at"] - T0 - 1)
    refuse(c, direct_vm, "last round is still running", c.settle, pid, who=P.stranger)


def test_settle_waits_for_the_claim_time_of_the_last_round(direct_vm, direct_deploy):
    c, pid = start(direct_deploy, direct_vm)
    end = prow(c, pid)["end_at"] - T0
    at(direct_vm, end + 299)
    refuse(c, direct_vm, "not final yet", c.settle, pid, who=P.stranger)
    settle(c, direct_vm, pid, offset=end + 300)  # nobody claimed anything: every round is a final miss
    assert prow(c, pid)["state"] == SETTLED


def test_unclaimed_rounds_pay_everybody_equally(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm)
    settle(c, direct_vm, pid, offset=finished_at(c, pid))
    assert paid(ledger, (P.a, P.b, P.c)) == [STAKE] * 3


def test_settle_waits_for_a_claim_nobody_has_judged(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm)
    claim(c, direct_vm, P.a, pid, 0, offset=open_of(c, pid, 0) + 1)
    end = prow(c, pid)["end_at"] - T0 + 300
    at(direct_vm, end)
    refuse(c, direct_vm, "not final yet", c.settle, pid, who=P.stranger)
    by = rrow(c, pid, P.a, 0)["judge_by"] - T0
    settle(c, direct_vm, pid, offset=by)  # never judged: the claim is a final miss, not a credit
    assert rrow(c, pid, P.a, 0)["state"] == "MISSED"
    # nobody has a credited round, so everything is shared equally; the unjudged claim earned no credit
    assert [m["credited"] for m in prow(c, pid)["members"]] == [0, 0, 0]
    assert paid(ledger, (P.a, P.b, P.c)) == [STAKE] * 3


def test_an_unattended_claim_cannot_settle_as_met_or_receive_the_credited_slice(direct_vm, direct_deploy, ledger):
    """a files a claim that nobody ever sends to the judge; b files one and gets a completed judgement (MET).
    When the review time is over a's round is a final miss and a receives nothing: b alone takes the credited slice
    and the pot. Every view and the settlement agree."""
    c, pid = start(direct_deploy, direct_vm)
    claim(c, direct_vm, P.a, pid, 0, offset=open_of(c, pid, 0) + 1)
    claim(c, direct_vm, P.b, pid, 0, offset=open_of(c, pid, 0) + 2)
    judge(c, direct_vm, P.stranger, pid, P.b, 0, "MET", 10, offset=close_of(c, pid, 0) + 1)  # only b is judged
    rb = rrow(c, pid, P.b, 0)
    assert rb["state"] == "PASSED" and rb["credited"] and rb["decided_by"] == BY_AI
    by = rrow(c, pid, P.a, 0)["judge_by"] - T0

    def mine(who):
        return next(m for m in standing(c, pid)["members"] if m["who"] == hx(who))

    # while the review time runs the claim only waits: no credit, no projected payout
    at(direct_vm, by - 1)
    ra = rrow(c, pid, P.a, 0)
    assert ra["state"] == "CLAIMED" and not ra["credited"] and not ra["final"]
    assert (mine(P.a)["credited"], mine(P.a)["pending"], mine(P.a)["projected"]) == (0, 1, "0")

    # once it is over the claim is a final miss, in the round view, the marks and the standing
    at(direct_vm, by)
    ra = rrow(c, pid, P.a, 0)
    assert ra["state"] == "MISSED" and not ra["credited"] and ra["final"] and ra["decided_by"] == BY_NONE
    assert member(c, pid, P.a)["marks"] == "M__"
    assert (mine(P.a)["credited"], mine(P.a)["pending"], mine(P.a)["projected"]) == (0, 0, "0")
    assert (mine(P.b)["credited"], mine(P.b)["projected"]) == (1, str(18 * MILLI))
    assert standing(c, pid)["all_final"]

    settle(c, direct_vm, pid)
    row = prow(c, pid)
    assert row["state"] == SETTLED
    assert [m["credited"] for m in row["members"]] == [0, 1, 0]
    assert member(c, pid, P.a)["payout"] == "0" and member(c, pid, P.a)["credited"] == 0
    # b: the credited slice (2) + the whole pot (18 - 2 = 16); a and c: nothing
    assert paid(ledger, (P.a, P.b, P.c)) == [0, 18 * MILLI, 0] == model(STAKE, ROUNDS, [0, 1, 0])
    assert all(who != hx(P.a) for who, _ in ledger.sent)  # not even a zero transfer
    assert books(c)["balanced"] and ledger.total() == 3 * STAKE


def test_settle_waits_for_a_dispute_time(direct_vm, direct_deploy):
    c, pid = start(direct_deploy, direct_vm)
    played(c, direct_vm, pid, {P.a: ["MET"] * 3, P.b: ["MET"] * 3, P.c: ["-"] * 3})
    t = close_of(c, pid, 2) + 1  # the last judgement
    at(direct_vm, t + 100)
    refuse(c, direct_vm, "not final yet", c.settle, pid, who=P.stranger)
    settle(c, direct_vm, pid, offset=t + 900)
    assert prow(c, pid)["state"] == SETTLED


def test_settle_waits_for_a_contest_and_a_stale_contest_lapses_inside_settle(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm)
    played(c, direct_vm, pid, {P.a: ["MET"] * 3, P.b: ["MET"] * 3, P.c: ["NOT_MET", "-", "-"]})
    t = close_of(c, pid, 2) + 1
    # contest the last judgement of c? c made no later claim, so contest a's last round as a rival instead
    bond = contest(c, direct_vm, P.c, pid, P.a, 2, offset=t + 10)
    at(direct_vm, finished_at(c, pid))
    refuse(c, direct_vm, "not final yet", c.settle, pid, who=P.stranger)
    settle(c, direct_vm, pid, offset=t + 10 + 86400)
    assert rrow(c, pid, P.a, 2)["bond_state"] == BOND_REFUNDED and ledger.to(P.c) == bond + 0
    assert prow(c, pid)["state"] == SETTLED and books(c)["balanced"] and prow(c, pid)["bonds"] == "0"


def test_a_pool_settles_once(direct_vm, direct_deploy):
    c, pid = start(direct_deploy, direct_vm)
    finish(c, direct_vm, pid)
    refuse(c, direct_vm, "already closed", c.settle, pid, who=P.stranger)
    refuse(c, direct_vm, "pool is closed", c.claim, pid, 0, NOTE, who=P.a)
    refuse(c, direct_vm, "already closed", c.cancel_pool, pid, who=P.organizer)
    refuse(c, direct_vm, "No such pool", c.settle, 3, who=P.stranger)


def test_a_pool_that_never_started_cannot_be_settled(direct_vm, direct_deploy):
    c = deploy(direct_deploy, direct_vm)
    at(direct_vm, 0)
    pid = create(c, direct_vm, min_entrants=3)
    join(c, direct_vm, P.a, pid)
    join(c, direct_vm, P.b, pid)
    at(direct_vm, finished_at(c, pid))
    refuse(c, direct_vm, "has not run", c.settle, pid, who=P.stranger)
    refuse(c, direct_vm, "did not get enough", c.judge, pid, hx(P.a), 0, who=P.stranger)


def test_anyone_can_settle_and_members_who_left_get_nothing_more(direct_vm, direct_deploy, ledger):
    c = deploy(direct_deploy, direct_vm)
    at(direct_vm, 0)
    pid = create(c, direct_vm)
    terms(c, direct_vm, pid)
    at(direct_vm, 10)
    for who in (P.a, P.b, P.c):
        join(c, direct_vm, who, pid)
    act(direct_vm, P.c)
    c.leave(pid)
    assert ledger.to(P.c) == STAKE
    played(c, direct_vm, pid, {P.a: ["MET", "MET", "MET"], P.b: ["MET", "-", "-"]})
    finish(c, direct_vm, pid, caller=P.d)
    assert ledger.to(P.c) == STAKE  # only the stake it took back before the start
    # the pool holds two stakes (12): credited slices 4 * 2 = 8, pot 4 -> a gets 6 + 3, b gets 2 + 1
    assert paid(ledger, (P.a, P.b)) == [9 * MILLI, 3 * MILLI]
    assert books(c)["balanced"]


def test_the_standing_view_projects_the_real_payouts(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm, stake=STAKE + 1)
    played(c, direct_vm, pid, {P.a: ["MET", "MET", "NOT_MET"], P.b: ["MET", "-", "MET"], P.c: ["NOT_MET", "MET", "-"]})
    at(direct_vm, finished_at(c, pid))
    st = standing(c, pid)
    assert st["all_final"] is True and st["phase"] == "finishing"
    projected = [int(m["projected"]) for m in st["members"]]
    assert [m["credited"] for m in st["members"]] == [2, 2, 1] and all(m["pending"] == 0 for m in st["members"])
    settle(c, direct_vm, pid)
    assert paid(ledger, (P.a, P.b, P.c)) == projected
    after = standing(c, pid)
    assert [int(m["projected"]) for m in after["members"]] == projected and after["phase"] == "settled"


def test_standing_shows_what_is_still_open(direct_vm, direct_deploy):
    c, pid = start(direct_deploy, direct_vm)
    claim(c, direct_vm, P.a, pid, 0, offset=open_of(c, pid, 0) + 1)
    st = standing(c, pid)
    assert st["all_final"] is False and st["phase"] == "running"
    assert [m["pending"] for m in st["members"]] == [3, 3, 3]


# ---- bonds, rewards and the pot ---------------------------------------------------------------------------------------


def test_rewards_and_forfeits_flow_through_the_pot(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm)
    vm = direct_vm
    for who in (P.a, P.b):
        claim(c, vm, who, pid, 0, offset=open_of(c, pid, 0) + 1)
    t0 = close_of(c, pid, 0) + 1
    judge(c, vm, P.stranger, pid, P.a, 0, "MET", 10, offset=t0)
    judge(c, vm, P.stranger, pid, P.b, 0, "NOT_MET", 90, offset=t0)
    # c (a rival) overturns a's credited round: c earns bond + 25% of a slice
    bond_c = contest(c, vm, P.c, pid, P.a, 0, offset=t0 + 10)
    audit(c, vm, P.stranger, pid, P.a, 0, "NOT_MET", 80, offset=t0 + 20)
    # b contests their own miss and loses: the bond joins the pot
    bond_b = contest(c, vm, P.b, pid, P.b, 0, offset=t0 + 30)
    audit(c, vm, P.stranger, pid, P.b, 0, "UNCLEAR", 40, offset=t0 + 40)
    reward = SLICE * 2_500 // 10_000
    assert ledger.to(P.c) == bond_c + reward and ledger.to(P.b) == 0
    # rounds 1 and 2: a and b keep both
    for r in (1, 2):
        for who in (P.a, P.b):
            claim(c, vm, who, pid, r, offset=open_of(c, pid, r) + 1)
        for who in (P.a, P.b):
            judge(c, vm, P.stranger, pid, who, r, "MET", 10, offset=close_of(c, pid, r) + 1)
    extra = bond_b - reward
    assert int(prow(c, pid)["balance"]) == 3 * STAKE + extra
    settle(c, vm, pid, offset=finished_at(c, pid))
    out = paid(ledger, (P.a, P.b, P.c))
    expected = model(STAKE, ROUNDS, [2, 2, 0], extra)
    expected[2] += bond_c + reward  # what c already received from its contest
    assert out == expected
    assert sum(out) == 3 * STAKE + bond_c + bond_b and books(c)["balanced"] and prow(c, pid)["forfeited"] == str(bond_b)


def test_a_member_who_wins_a_contest_of_their_own_gets_the_bond_back_and_the_round(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm)
    vm = direct_vm
    for who in (P.a, P.b):
        for r in range(ROUNDS):
            claim(c, vm, who, pid, r, offset=open_of(c, pid, r) + 1)
    judge(c, vm, P.stranger, pid, P.a, 0, "NOT_MET", 90, offset=close_of(c, pid, 0) + 1)
    bond = contest(c, vm, P.a, pid, P.a, 0, offset=close_of(c, pid, 0) + 10)
    audit(c, vm, P.stranger, pid, P.a, 0, "MET", 5, offset=close_of(c, pid, 0) + 20)
    for who in (P.a, P.b):
        for r in (1, 2):
            judge(c, vm, P.stranger, pid, who, r, "MET", 10, offset=close_of(c, pid, r) + 1)
    judge(c, vm, P.stranger, pid, P.b, 0, "MET", 10, offset=close_of(c, pid, 2) + 2)
    settle(c, vm, pid, offset=finished_at(c, pid))
    # a and b both kept 3 rounds, c kept none: c's stake is the pot
    out = paid(ledger, (P.a, P.b, P.c))
    assert out[0] == bond + STAKE + STAKE // 2 and out[1] == STAKE + STAKE // 2 and out[2] == 0
    assert books(c)["balanced"]


def test_the_referee_can_decide_everything_by_hand(direct_vm, direct_deploy, ledger):
    c, pid = start(direct_deploy, direct_vm, members=(P.a, P.b), referee=hx(P.referee))
    vm = direct_vm
    for who in (P.a, P.b):
        for r in range(ROUNDS):
            claim(c, vm, who, pid, r, offset=open_of(c, pid, r) + 1)
    for r in range(ROUNDS):
        at(vm, close_of(c, pid, r) + 1)
        act(vm, P.referee)
        c.overrule(pid, hx(P.a), r, True, "Read the log, it is fine.")
        act(vm, P.referee)
        c.overrule(pid, hx(P.b), r, r == 0, "Only the first entry was real.")
    settle(c, vm, pid, offset=close_of(c, pid, 2) + 5)  # every claim is final already: no need to wait
    assert paid(ledger, (P.a, P.b)) == model(STAKE, ROUNDS, [3, 1]) and books(c)["balanced"]
