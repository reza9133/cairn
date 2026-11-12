When the contract refuses a call it raises a plain-language message. The transaction dialog on this site shows that message, so you know why. Nothing changes on chain when a call is refused (apart from the gas).

## Creating and configuring

| message | what to do |
| --- | --- |
| The title needs 3 to 60 characters. | shorten or lengthen the title |
| The rules need 20 to 1200 characters. | describe the promise and the proof in more words |
| The stake is out of range. | use a smaller, positive stake |
| The number of rounds has to be between 2 and 14. | pick 2–14 rounds |
| A round has to last between 1 minute and 30 days. | adjust the round length |
| The pool has to start between 1 minute and 30 days from now. | adjust "Starts in" |
| The member limits must satisfy 2 <= minimum <= maximum <= 12. | fix the minimum and maximum |
| Every round has to be worth at least 0.001 GEN (the stake divided by the rounds). | raise the stake or lower the rounds |
| That address cannot be the referee. / That is not a valid address. | use a valid 0x… address (not the contract itself) |
| The grace time has to be between 0 and 7 days. | |
| The review time has to be between 10 minutes and 30 days. | |
| The dispute time has to be between 2 minutes and 7 days. | |
| The doubt limit has to be between 0 and 100. | |
| Only the organizer can do that. | switch to the organizer's account |

## Pools and membership

| message | what to do |
| --- | --- |
| No such pool. / No such round. | check the pool number or the round number |
| The pool has already started. | joining and tuning end at the start time |
| The pool has not started yet. | wait for the start time |
| The pool is closed. / The pool is already closed. | the pool is settled or called off |
| The pool is full. / This pool has no room for more members. | choose another pool |
| Send exactly the stake of the pool. | the site sends the exact amount; do not edit the value |
| That evidence page is already used by another member of this pool. | use your own page |
| The evidence must be a single public http(s) link. | see [Limits](/docs/limits) for what is accepted |
| The referee cannot join the pool. | use another account |
| You joined this pool before (a member who left cannot join again). | members who left cannot come back |
| You are not a member of this pool. / That address is not a member of the pool. | check the account |
| Only the organizer can call the pool off before it starts. | after the start only a pool with too few members can be called off |
| The pool has started; it cannot be called off. | enough members joined; the pool runs |
| The pool did not get enough members; it can be called off. | anyone can call it off now |

## Claiming and judging

| message | what to do |
| --- | --- |
| That round has not started yet. | wait for the round to open |
| The time to claim that round is over. | a round without a claim is a final miss |
| You already claimed that round. | |
| The claim needs 12 to 300 characters. | |
| The round is still running. The judge looks at it after it closes. | wait for the round to close |
| That member made no claim for that round. | nothing to judge |
| That claim has already been judged. | the judgement stands until contested |
| Wait two minutes before asking again. | the page could not be read; retries are spaced by two minutes |
| The review time is over; a claim nobody judged counts as credited. | nothing to do |
| [LLM_ERROR] the judge did not return … | the model answered in an unusable format; try again |

## Contests and rulings

| message | what to do |
| --- | --- |
| Only a judgement of the AI can be contested. | referee rulings and defaults cannot be contested |
| That judgement has been contested before. | a judgement can be contested once |
| The dispute time of that judgement is over. | |
| Only members of this pool can contest. | |
| You can contest only your own missed rounds. | |
| You can contest only a round that the other member was credited for. | |
| Say in 12 to 300 characters why the judgement is wrong. | |
| Send exactly the contest bond. | the site sends the exact bond |
| That judgement is not under contest. | |
| The contest has not lapsed yet. Run the audit instead. | |
| The contest lapsed. Call lapse_contest to get the bond back. | use **Return the bond** |
| A contest bond is still waiting for its audit. | |
| Only the referee can do that. | |
| That round is already final. | nothing can change it any more |

## Settling

| message | what to do |
| --- | --- |
| The last round is still running. | wait for it to close |
| Some rounds are not final yet. | wait for the dispute time, or judge / audit the open ones |
| The pool has not run. | a pool that never started cannot be settled |
| The books of this pool do not add up. | a safety check; it should never appear |

## Wallet and network messages

| message | meaning |
| --- | --- |
| You rejected the request in your wallet. | you pressed reject; nothing was sent |
| The validators could not agree on this call … | the status was `UNDETERMINED`; nothing changed, try again |
| Cannot reach GenLayer Studionet right now. | the RPC is unreachable; check your connection |
