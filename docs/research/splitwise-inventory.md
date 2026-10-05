# Splitwise feature inventory

Research for [issue #2](https://github.com/Simi24/quits/issues/2), input to the domain-model ticket. Question: how exactly does Splitwise behave in the features Quits replicates, and what is free vs Pro (including the current free-tier limits)?

All sources were read on **2026-10-03**. Splitwise's help center (`kb.splitwise.com`) shows no per-article dates; where only an older source exists (the 2012-2018 UserVoice forum, the 2012 blog), its date is given and the claim is marked as possibly stale. Confidence tags: **[official]** Splitwise's own current docs, **[official, dated]** Splitwise staff statement with a date, **[secondary]** third party, **[inferred]** my reading, not stated anywhere.

## TL;DR

- Split modes: equally (also on a subset), exact amounts, percentages, shares, adjustment, plus reimbursement (web only) and itemized. [official]
- Multiple payers per expense: yes, free. Each payer enters an exact amount paid. No "everyone paid an equal share" shortcut. [official, dated]
- Data model: every expense stores, per person, a `paid_share` and an `owed_share`. Splitwise does **not** store the split method or its parameters (shares, %), only the resulting amounts. [official API + official, dated]
- Leftover cents: amounts are rounded to the cent and the extra cent(s) are assigned to a **random** participant; re-saving re-rolls them. [official, dated]
- Simplify debts: optional per group, any member can toggle it, free. It minimises the number of payments without changing anyone's net balance; it re-runs on every new expense/payment. Splitwise never published the algorithm; finding the true minimum is NP-hard, the standard practical approach is the greedy debtor/creditor matching (at most N-1 payments).
- Settlement = a "payment", which is a special expense (`payment: true`). Recorded payments can be deleted to undo. [official]
- Edit history: an un-clearable activity feed (Expense added/updated/deleted/undeleted, debt simplification toggled, group settings changed, ...) plus auto-generated notes on the expense describing what changed. Deleted expenses and groups can be restored. [official]
- Members: no admins, anyone in the group can edit/delete any group expense. A member with a non-zero balance **cannot be removed** until their balance is cleared. [official]
- Free tier today: **4 expenses per day** per user, with ads. Pro (~$4.99/month, $39.99/year in the US App Store) adds unlimited expenses, no ads, search, charts, receipt scanning/itemization, currency conversion, default splits, JSON backup, and a 30-day **Trip Pass** for one trip group.

## 1. Split modes

Source: [What are different ways I can split an expense?](https://kb.splitwise.com/balances-and-expenses/what-are-different-ways-i-can-split-an-expense) [official]

The add-expense sentence is "Paid by [you] and split [equally]"; tapping "equally" opens the split options, "More options" opens the unequal modes. The same options exist when editing.

| Mode | Behavior (Splitwise's words, condensed) |
|---|---|
| Equally | Default. Split evenly among everyone listed. Tap a person to remove them; the rest is divided equally among the others. This is how a **subset** split works. |
| Exact amounts | Enter the exact amount each person owes. |
| Percentage | Enter the percentage of the total each person owes. |
| Shares | Assign a number of shares to each person ("useful for couples or families"). 0 shares is allowed: the help center's couple recipe is "2 shares to the person covering the couple, 0 to the partner" ([couple article](https://kb.splitwise.com/groups/how-do-i-split-an-expense-for-a-couple-that-is-sharing-costs)). |
| Adjustment | "Enter an adjustment to a person's share, and the rest of the expense will be split equally among everyone else." Added in Oct 2012 together with shares and % ([forum, 2012-10-10](https://feedback.splitwise.com/forums/162446-general/suggestions/2886259-split-an-expense-equally-with-individual-or-ad)). |
| Reimbursement (web only) | For a refund one person received and must redistribute: enter the amount each person should receive. Not on mobile ([refund article](https://kb.splitwise.com/balances-and-expenses/how-do-i-add-a-refund-or-reimbursement)). Reimbursements can only be split evenly per a long-standing forum request ([forum](https://feedback.splitwise.com/forums/162446-general/suggestions/11568042-split-reimbursements-unequally)) [possibly stale]. |
| Itemized | Enter bill items and assign each to people, plus tax, tip, discounts. Receipt-scan itemization is Pro. Whether manual itemization is free is unclear: the split article lists it among the general options, the Pro article says "only Pro subscribers can scan and itemize receipts". |

Uncertain:
- **Adjustment arithmetic.** The KB wording ("split equally among everyone else") is ambiguous. The common reading, and the 2012 feature request it answers, is: share_i = (total - sum of adjustments) / n + adjustment_i, where n includes the adjusted person. Verify in the app before copying the semantics. [inferred]
- **Validation.** No help article says that exact amounts must sum to the total or % to 100 before saving; the apps show a running "left to assign" counter and block save (common knowledge, not documented). [inferred]
- **Edit fidelity.** Because only amounts are stored, re-opening an unequal split by shares or % shows the resulting amounts, not the shares/% entered. Splitwise acknowledged this needs "a change to our data structures" and has not done it ([forum, 2012-12-18 and 2016-04-05](https://feedback.splitwise.com/forums/162446-general/suggestions/3465674-when-editing-an-unequal-split-load-the-entered)). Whether the current apps changed this is not documented. [official, dated; possibly stale]

## 2. Multiple payers

- Web first, then Android (May 2014) and iPhone (2014): "Multiple payers is now fully supported" ([forum, 2014-05-22](https://feedback.splitwise.com/forums/162446-general/suggestions/3223639-allow-multiple-payers-when-adding-bills-on-mobile)). Listed as a free feature in the [App Store listing](https://apps.apple.com/us/app/splitwise/id458023433).
- UI: in "Paid by [X]" choose multiple people and enter how much each paid. There is no "each paid an equal share" option; users must compute the amounts ([forum, 2015-05-26, under review](https://feedback.splitwise.com/forums/162446-general/suggestions/8093769-bills-paid-by-multiple-people-each-person-paid-a)).
- Model: payers and split are independent. The API's create-expense takes, per user, `paid_share` and `owed_share`; the sum of `paid_share` and the sum of `owed_share` each equal the cost. "When splitting equally, the authenticated user is assumed to be the payer" ([API docs](https://dev.splitwise.com/)). [official]
- Each person's balance impact for an expense = `paid_share - owed_share` (the export shows exactly this per person per row: [export article](https://kb.splitwise.com/account-issues/how-do-i-export-my-splitwise-data)). [official]

## 3. Leftover cents

- Amounts are computed to the cent; when they do not divide evenly, extra cents go to someone. Originally the penny went to the person adding the expense (2012); since Nov 2013 "we now randomly assign the extra penny on all platforms, though on iPhone, the entire remainder gets assigned to one person randomly instead of more correctly splitting it" ([forum, 2013-11-12](https://feedback.splitwise.com/forums/162446-general/suggestions/3309275-rotate-who-pays-the-extra-penny-when-the-bill-cann)). [official, dated]
- Shares: "the system currently calculates all the shares to the exact penny, with some getting an extra penny when rounding is necessary"; with very large share counts the random assignment varied too much, so Android moved to a methodology where "most cases will not vary at all, but in some rare situations you might see the exact rounding vary by 1 penny" ([forum, 2018-03-23](https://feedback.splitwise.com/forums/162446-general/suggestions/33733765--bug-splitting-expense-by-shares-calculation-isn)). [official, dated]
- Splitwise declined carrying sub-cent precision, citing non-deterministic results across devices ([forum, 2016-06-14](https://feedback.splitwise.com/forums/162446-general/suggestions/14800068-proper-cost-splitting-no-random-pennies)). [official, dated]
- Takeaway for Quits: Splitwise's random penny is a known irritant and non-deterministic. A deterministic rule (for example, largest remainder, ties broken by a stable order or rotated by expense id) is computable offline identically on every device. [inferred]

## 4. Simplify debts

What it does ([KB](https://kb.splitwise.com/balances-and-expenses/what-is-simplify-debts)) [official]:
- Restructures who owes whom inside a group to minimise the number of payments. "It never changes anyone's total balance." Example: Anna owes Bob 20, Bob owes Charlie 20, so Anna pays Charlie 20.
- Re-simplified automatically whenever an expense or payment is added. Users are told to look at their total, not at pairwise balances.
- Per currency: it never combines or converts across currencies.
- **Optional per group**; any member can toggle it in group settings; the toggle is logged in Recent Activity (also activity type 11 "Debt simplification" in the [API](https://dev.splitwise.com/)). Free feature ([App Store listing](https://apps.apple.com/us/app/splitwise/id458023433): "Simplify debts into repayment plans").
- Turning it off after payments were made "unravels the simplified payment paths"; nobody overpays, but people may have paid the wrong person. Splitwise recommends leaving it on once payments exist.
- API: group create has `simplify_by_default` ("Turn on simplify debts?") ([API docs](https://dev.splitwise.com/)).

Default value: **uncertain/contradictory.** A 2013 forum thread speaks of groups "set to have Simplify Debts on by default" and Splitwise answered by making it "a much more explicit choice when creating a group" ([forum, 2013](https://feedback.splitwise.com/forums/162446-general/suggestions/3863672-it-can-be-confusing-at-first-when-you-don-t-know-t)); in 2014 staff called its placement under advanced options "semi-hidden" ([forum, 2014-11-17](https://feedback.splitwise.com/forums/162446-general/suggestions/6714030-make-simplify-debts-not-hidden-under-advanced-o)). The current KB does not state the default.

Rules: the 2012 blog post ([Debts Made Simple, 2012-09-14](https://blog.splitwise.com/2012/09/14/debts-made-simple/)) and an old KB article on cross-friend simplification ([archived](http://web.archive.org/web/2021/https://feedback.splitwise.com/knowledgebase/articles/150674-why-didn-t-debt-simplification-change-anything)) list three rules:
1. Everyone owes the same net amount at the end.
2. No one owes a person they didn't owe before.
3. No one owes more money in total than before.

**Contradiction:** rule 2 cannot hold for the in-group feature as the current KB describes it (Anna ends up paying Charlie, whom she did not owe). The rules apply to the old cross-friendship "debt shuffling"; in-group simplify debts only guarantees rule 1 (and in practice 3). [inferred from the KB example]

Algorithm: Splitwise has **never published** it. Staff said privacy prevents showing the full simplification graph ([forum, 2013-11-18](https://feedback.splitwise.com/forums/162446-general/suggestions/4991672-improved-debt-simplification-with-more-clarity)). Popular blog posts claiming a max-flow/Dinic implementation are reconstructions, not Splitwise sources. The math, from a peer-reviewed source:
- Tom Verhoeff, "Settling Multiple Debts Efficiently: An Invitation to Computing Science", *Informatics in Education* 3(1):105-126, 2004 ([journal](https://infedu.vu.lt/journal/INFEDU/article/612/info); [problems and solutions, TU/e](https://wstomv.win.tue.nl/publications/settling-debts-problems.pdf)):
  - Only net balances matter. Repeatedly pick a debtor and a creditor and transfer min(|debt|, credit): this settles everything with the **minimum total amount transferred** and **at most N-1 transfers**, but not necessarily the minimum number of transfers.
  - Minimising the number of transfers = maximising the number of disjoint zero-sum subgroups; "a NP-hard problem, for which only algorithms are known that try an exponential number of possibilities".
- Same conclusion with worked proofs: [Terbium, "Debt simplification", 2020-09-25](https://terbium.io/2020/09/debt-simplification/) [secondary].
- Takeaway for Quits: for a holiday (fewer than ~15 people) either greedy largest-debtor-to-largest-creditor (deterministic, N-1 bound) or an exact search over zero-sum subsets is feasible. Deterministic output matters for offline devices to agree. [inferred]

## 5. Settlements (payments)

- "Settle up" opens the flow to pay someone or record being paid; "Record a cash payment" records a payment made outside the app (cash, bank transfer). In supported countries it can also send money (Splitwise Pay, Venmo, PayPal) ([How do I use Splitwise](https://kb.splitwise.com/getting-started/how-do-i-use-splitwise)). [official]
- A payment is an expense with `payment: true` and a `repayments` list of `{from, to, amount}` ([API docs](https://dev.splitwise.com/)). [official]
- Undo: delete the payment record; balances update ([undo article](https://kb.splitwise.com/balances-and-expenses/i-accidentally-settled-up-how-can-i-undo-this)). [official]
- Recording a payment that zeroes a friendship across groups auto-creates balancing entries in each group ("Settle all balances"); deleting or editing the payment does **not** update those entries ([fully settled article](https://kb.splitwise.com/balances-and-expenses/what-does-it-mean-if-im-fully-settled-up-with-my-friend)). Not applicable to Quits (trip is the only unit) but a warning about derived records. [official]
- Partial payments: the amount is editable, so a payment smaller than the debt is allowed (no help article; standard behavior). [inferred]
- Refund to the group (for example an airline refund): use the reimbursement split (web only), see section 1.

## 6. Activity and edit history

- Recent Activity / Activity tab: changes to groups, friends, expenses and payments. **Cannot be cleared**, "for example, if someone deletes an expense, there should be a record of that deletion". Mobile loads only the latest 100 items ([clear activity](https://kb.splitwise.com/account-issues/can-i-clear-my-recent-activity), [history](https://kb.splitwise.com/account-issues/where-can-i-view-a-history-of-recent-changes-to-my-account)). [official]
- Activity types in the API: 0 expense added, 1 updated, 2 deleted, 3 comment added, 4 added to group, 5 removed from group, 6 group deleted, 7 group settings changed, 11 debt simplification, 12 group undeleted, 13 expense undeleted, 14/15 currency conversion ([API docs](https://dev.splitwise.com/)). Expenses carry `created_by`, `updated_by`, `deleted_by`, `deleted_at`. [official]
- Per-expense change notes: "Expenses also get detailed notes on changes when they are updated so you can be sure you know what's different" ([forum, 2014-04-04](https://feedback.splitwise.com/forums/162446-general/suggestions/2863713-limit-or-track-past-edits)). Expenses also have user comments. [official, dated]
- Restore: a deleted expense can be undeleted from the activity item by anyone who was on the expense; balances recalculate ([restore article](https://kb.splitwise.com/balances-and-expenses/how-can-i-restore-a-deleted-expense)). Deleted groups can be undeleted with all their expenses ([group article](https://kb.splitwise.com/groups/how-do-i-delete-or-undelete-a-group)). [official]
- No date limits on expenses: Splitwise tried rejecting old dates and reverted after complaints (same 2012 forum thread). [official, dated]

## 7. Members and permissions

- **No admins, no permissions.** Anyone involved in an expense or in its group can view, edit or delete it, regardless of who created it ([permissions article](https://kb.splitwise.com/groups/can-i-prevent-group-members-from-changing-expenses-or-set-permissions)). [official]
- Joining: only by being added by a member (email/phone) or via an invite link ([join article](https://kb.splitwise.com/groups/how-do-i-join-an-existing-group)). Name-only "placeholder" members exist, web only ([placeholder article](https://kb.splitwise.com/getting-started/can-i-add-a-friend-without-adding-their-email-address-or-phone-number)). [official]
- Adding a member mid-group: allowed any time ([add article](https://kb.splitwise.com/groups/how-do-i-add-a-new-person-to-a-group)); existing expenses are untouched since each expense stores its own participants. [inferred from the model]
- **Removing a member with a non-zero balance is blocked.** First clear it, either by recording a cash payment or by editing every expense to remove them ([remove article](https://kb.splitwise.com/groups/how-do-i-remove-a-person-from-a-group)); the API's `remove_user_from_group` "does not succeed if the user has a non-zero balance" ([API docs](https://dev.splitwise.com/)). Leaving a group is suggested only "if you are settled up". Removing an involved member also stops recurring expenses ([recurring article](https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-recurring-expenses)). [official]
- Duplicate person in a group: the two accounts cannot share any expense before merging ([duplicate article](https://kb.splitwise.com/groups/someone-was-added-to-the-group-twice-how-can-i-fix-this)). Relevant to Quits' "who are you?" list: a "merge two names" action is a candidate. [official]

## 8. Free vs Pro

Sources: [What is Splitwise Pro?](https://kb.splitwise.com/pro/what-is-splitwise-pro), [splitwise.com/pro](https://www.splitwise.com/pro), [App Store listing](https://apps.apple.com/us/app/splitwise/id458023433) (version 26.9.1, 2026-09-20). [official]

Free: groups, expenses in any currency (balances kept per currency, no conversion), offline entry, all split modes, multiple payers, simplify debts, record cash payments, categories, group totals, CSV export, comments, recurring expenses, activity feed, edit history and restore, 100+ currencies, 7+ languages.

Pro only:
- Unlimited expenses.
- No ads ("No limits and no ads"; "A totally ad-free experience").
- Expense search.
- Charts and graphs by category.
- Receipt scanning (OCR) and itemization from a scan; high-res receipt storage (10 GB).
- Currency conversion (converts the whole group to the converter's default currency; all members see the result).
- Default split per group (e.g. 55/45, or shares per family).
- JSON backup.
- Transaction import from a card (US only).
- Early access to new features.

Plans: Individual + Trip Pass (yearly), Duo + Trip Pass (yearly, two people), Monthly. A **Trip Pass** "can be applied to any trip group of your choosing and grants Pro features to group members for 30 days" (one per yearly plan). US App Store in-app prices: $4.99 (monthly) and $39.99 (yearly), with $2.99, $3.99, $29.99 variants also listed. Splitwise's own site publishes no prices.

## 9. Free-tier limits

- **Daily expense cap: 4 per day** for free users, stated in the current KB ("free users can add up to 4 expenses each day", [What is Splitwise Pro?](https://kb.splitwise.com/pro/what-is-splitwise-pro)). [official]
- History and contradictions:
  - Introduced in late 2023. Press at the time reported 3 or 4 per day varying by user, plus a **10-second cooldown** before adding an expense on Android and iOS ([IT Voice, 2023-12-30](https://www.itvoice.in/splitwise-has-introduced-restrictions-on-the-number-of-free-expenses-users-can-add)) [secondary]. The cooldown is not in any current Splitwise page; unverified today.
  - A comparison site claims Splitwise publishes no number and support emails in Oct 2023 said 3 per day ([Dolio, 2026-08-15](https://dolio.org/compare/splitwise-free-plan-limits)) [secondary]. Contradicted by the KB article above, which now says 4. Treat 4 as current.
  - Undocumented: whether payments and edits count, reset time/time zone, per user vs per group (secondary sources say per user).
  - Third-party blogs say the KB suggests another member logging the expense as a workaround; no such text exists in the current KB. Unverified.
- **Ads** in the free tier: implied by Pro's "no ads" promise. [official]
- Mobile activity feed limited to the latest 100 items (all users). [official]

## 10. Candidate features a holiday user may expect (not decisions)

Not named in issue #1's in-scope list; for the domain-model grilling to accept or reject. Items already in "Not yet specified" are marked (NYS).

1. **Refund / money received by the group** (e.g. deposit returned, airline refund): a negative or "reimbursement" expense. Splitwise has it, web only.
2. **Split by adjustment** (equal split plus or minus a fixed amount for one person).
3. **Itemized split** (assign lines of a bill to people) without receipt scanning.
4. **Expense date** separate from creation time, and back-dating with no limit.
5. **Comments on an expense**, plus auto-generated "what changed" notes.
6. **Undo delete / restore** of an expense (and of a trip) from the history.
7. **Per-trip default split** (e.g. couples as 2 shares), a Pro feature in Splitwise.
8. **Couples or families as one unit** when paying (shares already cover the split side).
9. **Merge two names** in the "who are you?" list (duplicate person).
10. **Name-only participants** who never open the link (Splitwise placeholders).
11. **Totals screen**: total trip spend, what each person paid, each person's share; distinct from balances.
12. **Partial settlement** and **mark everything settled** at trip end, before archiving.
13. **Deterministic cent rounding** visible to the user (who got the extra cent).
14. **Simplify debts toggle and default** per trip, and what happens to recorded payments when it is toggled.
15. **"Who should pay next"** hint (listed in the App Store free features).
16. **CSV export** (NYS: "export finale").
17. **Categories**, **receipt photos**, **search**, **charts**, **payment links** (all NYS).
18. **Edit conflicts offline**: two people editing the same expense; Splitwise documents only that totals can differ until devices sync ([Totals article](https://kb.splitwise.com/balances-and-expenses/can-you-explain-the-totals-screen)). Input for the sync research, not a feature.

## Facts that may reshape other tickets

- **Domain model**: store per participant `paid` and `owed` amounts in integer cents (Splitwise's model), and also store the split method and its inputs, which Splitwise cannot do and users have asked for since 2012.
- **Domain model**: a settlement is just a transfer record (from, to, amount); simplify debts is a pure function of net balances and should be deterministic for offline agreement.
- **Domain model**: removing a participant with a non-zero balance should be blocked or need an explicit resolution (Splitwise blocks it).
- **Permissions**: Splitwise's "no admins, anyone can edit anything, everything is logged and restorable" fits Quits' no-account link model well.
- **Offline/sync**: Splitwise computes group totals on the device and admits devices can disagree until sync; random cent assignment would make devices disagree, so avoid randomness.
