The forms on this site validate with the same numbers as the contract, so a transaction that would be refused for its input is stopped before it is sent.

| | range | default |
| --- | --- | --- |
| title | 3–60 characters | |
| rules | 20–1200 characters | |
| claim | 12–300 characters | |
| contest reason | 12–300 characters | |
| rounds | 2 to 14 | |
| members | 2 to 12 at once; at most 24 entries ever recorded in a pool (members who left still count) | |
| round length | 1 minute to 30 days | |
| start delay (`starts_in`) | 1 minute to 30 days | |
| grace | 0 to 7 days | 10 minutes |
| review time | 10 minutes to 30 days | 3 days |
| dispute time | 2 minutes to 7 days | 1 hour |
| doubt limit | 0 to 100 | 35 |
| slice | at least 0.001 GEN | |
| contest bond | 20% of a slice, at least 0.001 GEN | |
| evidence link | one public http(s) URL, up to 300 characters | |
| page size of `list_pools` | at most 50 | |

## What counts as a valid evidence link

The evidence must be a **single public http(s) link** to a real domain:

- no IP addresses, no `localhost`, no private or internal names (`.local`, `.internal`, `.lan`, `.test`, `.example`, `.onion` …);
- no addresses that merely wrap an IP (`nip.io`, `sslip.io` and similar);
- no login in the URL (`user@host`) and no custom port (only 80 and 443);
- no spaces or non-ASCII characters; use the encoded form.

No two members of the same pool can use the same page.

## Enumerations

| name | values |
| --- | --- |
| pool `state` | 0 open · 1 cancelled · 2 settled |
| pool `phase` | joining · failed · running · finishing · settled · cancelled |
| round `state` | OPEN · CLAIMED · PASSED · MISSED |
| `decided_by` | 0 nobody · 1 the AI · 2 default (unreadable evidence) · 3 audit · 4 referee |
| `bond_state` | 0 none · 1 held · 2 refunded · 3 forfeited · 4 rewarded |
| verdict | MET · UNCLEAR · NOT_MET |
| flags | off_rules · injection · vague · stale · mismatch · unverifiable |
