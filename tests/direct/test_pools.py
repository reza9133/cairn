import json

import pytest

from conftest import *


def new(direct_deploy, direct_vm):
    return deploy(direct_deploy, direct_vm)


# ---- creating a pool --------------------------------------------------------------------------------------------------


def test_create_stores_everything_and_starts_open(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, referee=hx(P.referee))
    assert pid == 0
    row = prow(c, pid)
    assert row["organizer"] == hx(P.organizer) and row["referee"] == hx(P.referee)
    assert row["title"] == TITLE and row["rules"] == RULES
    assert row["state"] == OPEN and row["phase"] == "joining"
    assert row["stake"] == str(STAKE) and row["slice"] == str(STAKE // ROUNDS)
    assert row["rounds"] == ROUNDS and row["round_len"] == ROUND_LEN
    assert row["start_at"] == T0 + STARTS_IN and row["end_at"] == T0 + STARTS_IN + ROUNDS * ROUND_LEN
    assert (row["min_entrants"], row["max_entrants"]) == (2, 4)
    assert (row["grace"], row["review_span"], row["dispute_span"], row["doubt_limit"]) == (600, 3 * 86400, 3600, 35)
    assert row["active"] == 0 and row["balance"] == "0" and row["members"] == []
    assert books(c)["balanced"]


def test_ids_grow_and_views_list_newest_first(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    ids = [create(c, direct_vm, title=f"Pool number {i}") for i in range(5)]
    assert ids == [0, 1, 2, 3, 4]
    rows = json.loads(c.list_pools(0, 10))
    assert [r["id"] for r in rows] == [4, 3, 2, 1, 0]
    assert [r["id"] for r in json.loads(c.list_pools(1, 2))] == [3, 2]
    assert json.loads(c.list_pools(9, 2)) == []
    assert json.loads(c.list_pools(0, 0)) == []
    assert json.loads(c.list_pools(-3, 1))[0]["id"] == 4
    assert len(json.loads(c.list_pools(0, 10_000))) == 5


def test_pools_of_lists_organized_refereed_and_joined(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    p0 = create(c, direct_vm, referee=hx(P.referee))
    p1 = create(c, direct_vm, organizer=P.a)
    join(c, direct_vm, P.b, p1)
    assert [r["id"] for r in json.loads(c.pools_of(hx(P.organizer), 0, 10))] == [p0]
    assert [r["id"] for r in json.loads(c.pools_of(hx(P.referee), 0, 10))] == [p0]
    assert [r["id"] for r in json.loads(c.pools_of(hx(P.b), 0, 10))] == [p1]
    assert [r["id"] for r in json.loads(c.pools_of(hx(P.a), 0, 10))] == [p1]
    assert json.loads(c.pools_of(hx(P.stranger), 0, 10)) == []
    with direct_vm.expect_revert("not a valid address"):
        c.pools_of("nonsense", 0, 10)


@pytest.mark.parametrize(
    "kw, msg",
    [
        ({"title": "ab"}, "title needs"),
        ({"title": "x" * 61}, "title needs"),
        ({"title": "   \u200b  "}, "title needs"),
        ({"rules": "too short"}, "rules need"),
        ({"rules": "r" * 1201}, "rules need"),
        ({"rounds": 1}, "number of rounds"),
        ({"rounds": 15}, "number of rounds"),
        ({"rounds": -2}, "number of rounds"),
        ({"round_len": 59}, "round has to last"),
        ({"round_len": 30 * 86400 + 1}, "round has to last"),
        ({"starts_in": 59}, "start between"),
        ({"starts_in": 30 * 86400 + 1}, "start between"),
        ({"min_entrants": 1}, "member limits"),
        ({"min_entrants": 5, "max_entrants": 4}, "member limits"),
        ({"max_entrants": 13}, "member limits"),
        ({"stake": 0}, "stake is out of range"),
        ({"stake": -1}, "stake is out of range"),
        ({"stake": 10**24 + 1}, "stake is out of range"),
        ({"stake": 3 * MILLI - 1}, "at least 0.001 GEN"),
        ({"referee": "0x12"}, "not a valid address"),
        ({"referee": "0x" + "0" * 40}, "cannot be the referee"),
    ],
)
def test_create_refuses_bad_input(direct_vm, direct_deploy, kw, msg):
    c = new(direct_deploy, direct_vm)
    args = dict(
        title=TITLE, rules=RULES, stake=STAKE, rounds=ROUNDS, round_len=ROUND_LEN, starts_in=STARTS_IN,
        min_entrants=2, max_entrants=4, referee="",
    )
    args.update(kw)
    act(direct_vm, P.organizer)
    before = fingerprint(c)
    with direct_vm.expect_revert(msg):
        c.create_pool(*args.values())
    assert fingerprint(c) == before


def test_create_accepts_the_edges(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    create(c, direct_vm, rounds=2, stake=2 * MILLI, round_len=60, starts_in=60, min_entrants=2, max_entrants=2)
    create(c, direct_vm, rounds=14, stake=14 * MILLI, round_len=30 * 86400, starts_in=30 * 86400, min_entrants=12, max_entrants=12)
    create(c, direct_vm, title="abc", rules="r" * 1200, stake=10**24)
    assert stats(c)["pools"] == 3


def test_clean_text_removes_markup_and_invisible_characters(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, title="  A <b>bold</b>\u200b   title ", rules="Rules   with\n\tspaces and <tags> inside them, long enough.")
    row = prow(c, pid)
    assert row["title"] == "A (b)bold(/b) title"
    assert "<" not in row["rules"] and "  " not in row["rules"]


def test_organizer_can_be_the_referee(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, referee=hx(P.organizer))
    assert prow(c, pid)["referee"] == hx(P.organizer)


# ---- the terms ------------------------------------------------------------------------------------------------------


def test_set_terms_by_the_organizer_before_the_start(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    terms(c, direct_vm, pid, grace=0, review_span=600, dispute_span=120, doubt_limit=0)
    row = prow(c, pid)
    assert (row["grace"], row["review_span"], row["dispute_span"], row["doubt_limit"]) == (0, 600, 120, 0)
    terms(c, direct_vm, pid, grace=7 * 86400, review_span=30 * 86400, dispute_span=7 * 86400, doubt_limit=100)
    row = prow(c, pid)
    assert (row["grace"], row["review_span"], row["dispute_span"], row["doubt_limit"]) == (7 * 86400, 30 * 86400, 7 * 86400, 100)


@pytest.mark.parametrize(
    "args, msg",
    [
        ((-1, 3600, 900, 35), "grace time"),
        ((7 * 86400 + 1, 3600, 900, 35), "grace time"),
        ((300, 599, 900, 35), "review time"),
        ((300, 30 * 86400 + 1, 900, 35), "review time"),
        ((300, 3600, 119, 35), "dispute time"),
        ((300, 3600, 7 * 86400 + 1, 35), "dispute time"),
        ((300, 3600, 900, -1), "doubt limit"),
        ((300, 3600, 900, 101), "doubt limit"),
    ],
)
def test_set_terms_range_checks(direct_vm, direct_deploy, args, msg):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    refuse(c, direct_vm, msg, c.set_terms, pid, *args, who=P.organizer)


def test_set_terms_roles_and_timing(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, referee=hx(P.referee))
    for who in (P.stranger, P.referee, P.a):
        refuse(c, direct_vm, "Only the organizer", c.set_terms, pid, 300, 3600, 900, 35, who=who)
    refuse(c, direct_vm, "No such pool", c.set_terms, 7, 300, 3600, 900, 35, who=P.organizer)
    at(direct_vm, STARTS_IN)
    refuse(c, direct_vm, "already started", c.set_terms, pid, 300, 3600, 900, 35, who=P.organizer)


# ---- joining ----------------------------------------------------------------------------------------------------------


def test_join_takes_the_exact_stake_and_records_the_member(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    join(c, direct_vm, P.a, pid)
    row = prow(c, pid)
    assert row["active"] == 1 and row["balance"] == str(STAKE)
    m = row["members"][0]
    assert m["who"] == hx(P.a) and m["url"] == url_of(P.a) and not m["left"] and m["marks"] == "..."
    assert books(c)["balanced"] and stats(c)["deposited"] == str(STAKE)


def test_join_refusals(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, referee=hx(P.referee), max_entrants=2)
    u = url_of(P.a)
    refuse(c, direct_vm, "exactly the stake", c.join, pid, u, who=P.a, value=STAKE - 1)
    refuse(c, direct_vm, "exactly the stake", c.join, pid, u, who=P.a, value=STAKE + 1)
    refuse(c, direct_vm, "exactly the stake", c.join, pid, u, who=P.a, value=0)
    refuse(c, direct_vm, "referee cannot join", c.join, pid, url_of(P.referee), who=P.referee, value=STAKE)
    refuse(c, direct_vm, "No such pool", c.join, 5, u, who=P.a, value=STAKE)
    join(c, direct_vm, P.a, pid)
    refuse(c, direct_vm, "joined this pool before", c.join, pid, url_of(P.d), who=P.a, value=STAKE)
    join(c, direct_vm, P.b, pid)
    refuse(c, direct_vm, "pool is full", c.join, pid, url_of(P.c), who=P.c, value=STAKE)


@pytest.mark.parametrize(
    "url",
    [
        "", "not a link", "ftp://writers.org/log", "http://", "https://localhost/log", "https://127.0.0.1/log",
        "https://10.0.0.5/log", "https://user:pw@writers.org/log", "https://writers.org:8080/log",
        "https://writers.internal/log", "https://writers.example/log", "https://nip.io/log", "https://192.168.1.1.nip.io/x",
        "https://writers.org/log with space", "https://" + "a" * 300 + ".org/x", "https://writers/log", "https://-bad.org/x",
        "https://writers.org\n/log", "https://[::1]/log", "javascript:alert(1)", "https://writers.123/log",
    ],
)
def test_join_refuses_evidence_that_is_not_a_public_link(direct_vm, direct_deploy, url):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    refuse(c, direct_vm, "single public http(s) link", c.join, pid, url, who=P.a, value=STAKE)


def test_join_accepts_ordinary_links(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, max_entrants=12)
    urls = [
        "https://writers.org/journal", "http://writers.org:80/other", "https://www.blog.org:443/a?x=1",
        "https://xn--bcher-kva.org/log", "https://sub.domain.co.uk/path/to/page#top", "https://writers.dev",
    ]
    for who, u in zip(P.extra, urls):
        join(c, direct_vm, who, pid, url=u)
    assert prow(c, pid)["active"] == len(urls)


def test_the_same_page_cannot_back_two_members_however_it_is_spelled(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, max_entrants=12)
    join(c, direct_vm, P.a, pid, url="https://writers.org/journal?id=7&utm_source=x")
    same = [
        "https://writers.org/journal?id=7", "http://www.writers.org/journal/?id=7", "https://WRITERS.org/journal?id=7#top",
        "https://writers.org:443/journal?utm_campaign=z&id=7", "https://writers.org//journal/?id=7",
    ]
    for i, u in enumerate(same):
        refuse(c, direct_vm, "already used", c.join, pid, u, who=P.extra[i], value=STAKE)
    join(c, direct_vm, P.b, pid, url="https://writers.org/journal?id=8")
    assert prow(c, pid)["active"] == 2


def test_the_same_page_can_be_used_in_different_pools(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    p0, p1 = create(c, direct_vm), create(c, direct_vm)
    join(c, direct_vm, P.a, p0, url="https://writers.org/shared")
    join(c, direct_vm, P.b, p1, url="https://writers.org/shared")
    assert prow(c, p0)["active"] == 1 and prow(c, p1)["active"] == 1


def test_joining_is_closed_from_the_start(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    at(direct_vm, STARTS_IN - 1)
    join(c, direct_vm, P.a, pid)
    at(direct_vm, STARTS_IN)
    refuse(c, direct_vm, "already started", c.join, pid, url_of(P.b), who=P.b, value=STAKE)


def test_a_pool_has_room_for_at_most_24_entries_even_with_leavers(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, max_entrants=2)
    for i in range(24):
        who = P.extra[i]
        join(c, direct_vm, who, pid)
        act(direct_vm, who)
        c.leave(pid)
    assert prow(c, pid)["active"] == 0 and len(prow(c, pid)["members"]) == 24
    refuse(c, direct_vm, "no room for more members", c.join, pid, url_of(P.a), who=P.a, value=STAKE)
    assert books(c)["balanced"]


# ---- leaving ----------------------------------------------------------------------------------------------------------


def test_leave_returns_the_stake_and_frees_the_page(direct_vm, direct_deploy, ledger):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    join(c, direct_vm, P.a, pid)
    join(c, direct_vm, P.b, pid)
    act(direct_vm, P.a)
    c.leave(pid)
    assert ledger.to(P.a) == STAKE
    row = prow(c, pid)
    assert row["active"] == 1 and row["balance"] == str(STAKE)
    assert row["members"][0]["left"] and row["members"][0]["marks"] == "" and row["members"][0]["payout"] == str(STAKE)
    assert books(c)["balanced"]
    join(c, direct_vm, P.c, pid, url=url_of(P.a))  # the freed page is available again


def test_leave_refusals(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    join(c, direct_vm, P.a, pid)
    refuse(c, direct_vm, "not a member", c.leave, pid, who=P.stranger)
    refuse(c, direct_vm, "No such pool", c.leave, 3, who=P.a)
    act(direct_vm, P.a)
    c.leave(pid)
    refuse(c, direct_vm, "not a member", c.leave, pid, who=P.a)
    refuse(c, direct_vm, "joined this pool before", c.join, pid, url_of(P.a), who=P.a, value=STAKE)
    join(c, direct_vm, P.b, pid)
    at(direct_vm, STARTS_IN)
    refuse(c, direct_vm, "already started", c.leave, pid, who=P.b)


# ---- calling a pool off -------------------------------------------------------------------------------------------------


def test_the_organizer_can_call_the_pool_off_before_the_start(direct_vm, direct_deploy, ledger):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm)
    for who in (P.a, P.b, P.c):
        join(c, direct_vm, who, pid)
    act(direct_vm, P.organizer)
    c.cancel_pool(pid)
    for who in (P.a, P.b, P.c):
        assert ledger.to(who) == STAKE
    row = prow(c, pid)
    assert row["state"] == CANCELLED and row["phase"] == "cancelled" and row["balance"] == "0" and row["active"] == 0
    assert books(c)["balanced"] and stats(c)["cancelled"] == 1
    refuse(c, direct_vm, "already closed", c.cancel_pool, pid, who=P.organizer)
    refuse(c, direct_vm, "pool is closed", c.join, pid, url_of(P.d), who=P.d, value=STAKE)
    refuse(c, direct_vm, "pool is closed", c.leave, pid, who=P.a)


def test_cancel_before_the_start_is_for_the_organizer_only(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, referee=hx(P.referee))
    join(c, direct_vm, P.a, pid)
    for who in (P.a, P.stranger, P.referee):
        refuse(c, direct_vm, "Only the organizer", c.cancel_pool, pid, who=who)


def test_after_the_start_anyone_can_call_off_a_pool_that_lacks_members(direct_vm, direct_deploy, ledger):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, min_entrants=3)
    join(c, direct_vm, P.a, pid)
    join(c, direct_vm, P.b, pid)
    at(direct_vm, STARTS_IN)
    assert prow(c, pid)["phase"] == "failed"
    claims_msg = "did not get enough members"
    refuse(c, direct_vm, claims_msg, c.claim, pid, 0, NOTE, who=P.a)
    refuse(c, direct_vm, "The pool has not run", c.settle, pid, who=P.stranger)
    act(direct_vm, P.stranger)
    c.cancel_pool(pid)
    assert ledger.to(P.a) == STAKE and ledger.to(P.b) == STAKE
    assert prow(c, pid)["state"] == CANCELLED and books(c)["balanced"]


def test_a_running_pool_cannot_be_called_off(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = pool_with(c, direct_vm, members=(P.a, P.b))
    at(direct_vm, STARTS_IN + 5)
    for who in (P.organizer, P.stranger, P.a):
        refuse(c, direct_vm, "cannot be called off", c.cancel_pool, pid, who=who)


def test_a_member_who_left_counts_for_the_minimum(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, min_entrants=2)
    for who in (P.a, P.b):
        join(c, direct_vm, who, pid)
    act(direct_vm, P.b)
    c.leave(pid)
    at(direct_vm, STARTS_IN)
    assert prow(c, pid)["phase"] == "failed"


# ---- the phases -------------------------------------------------------------------------------------------------------


def test_the_phase_follows_the_clock(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    pid = pool_with(c, direct_vm, members=(P.a, P.b))
    start = start_of(c, pid)
    end = start + ROUNDS * ROUND_LEN
    seen = []
    for t in (0, start - 1, start, end - 1, end, end + 5000):
        at(direct_vm, t)
        seen.append(prow(c, pid)["phase"])
    assert seen == ["joining", "joining", "running", "running", "finishing", "finishing"]


def test_views_reject_unknown_ids(direct_vm, direct_deploy):
    c = new(direct_deploy, direct_vm)
    for fn in (c.get_pool, c.standing):
        with direct_vm.expect_revert("No such pool"):
            fn(0)
        with direct_vm.expect_revert("No such pool"):
            fn(-1)


def test_addresses_work_in_the_form_the_contract_reports_them(direct_vm, direct_deploy):
    """Clients hand back what get_pool printed (possibly mixed case, as a wallet would show it)."""
    c = new(direct_deploy, direct_vm)
    pid = create(c, direct_vm, referee=hx(P.referee))
    terms(c, direct_vm, pid)
    at(direct_vm, 10)
    join(c, direct_vm, P.a, pid)
    join(c, direct_vm, P.b, pid)
    raw = json.loads(c.get_pool(pid))
    for who in (raw["organizer"], raw["referee"], raw["members"][0]["who"]):
        assert [r["id"] for r in json.loads(c.pools_of(who, 0, 5))] == [pid]
    at(direct_vm, start_of(c, pid) + 1)
    claim(c, direct_vm, P.a, pid, 0)
    world(direct_vm, "MET", 5)
    at(direct_vm, close_of(c, pid, 0))
    act(direct_vm, P.stranger)
    c.judge(pid, raw["members"][0]["who"], 0)  # exactly as reported
    assert json.loads(c.get_round(pid, raw["members"][0]["who"], 0))["state"] == "PASSED"
