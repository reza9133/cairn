import json

from conftest import *


def test_deploys_and_runs_the_happy_path(direct_vm, direct_deploy, ledger):
    c = deploy(direct_deploy, direct_vm)
    pid = pool_with(c, direct_vm, members=(P.a, P.b))
    assert prow(c, pid)["phase"] == "joining"
    assert books(c)["balanced"]
    for who in (P.a, P.b):
        for r in range(ROUNDS):
            claim(c, direct_vm, who, pid, r, offset=open_of(c, pid, r) + 1)
            judge(c, direct_vm, P.stranger, pid, who, r, offset=close_of(c, pid, r) + 1)
    end = finished_at(c, pid)
    settle(c, direct_vm, pid, offset=end)
    assert prow(c, pid)["state"] == SETTLED
    assert ledger.to(P.a) == STAKE and ledger.to(P.b) == STAKE
    assert books(c)["balanced"]
