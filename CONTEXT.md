# Quits

Splitting the shared costs of a trip among friends, until everyone is even.

## Language

### The trip

**Trip**:
A shared, time-bounded set of costs among a fixed circle of friends, kept in one currency. It is either open or closed; a closed trip is read-only until someone reopens it. A deleted trip can be restored for 30 days.
_Avoid_: Group, event, archive (an archived trip is just a closed one)

**Trip link**:
The secret link to a trip. Whoever has it is in the trip; regenerating it makes the old one stop working.
_Avoid_: Invite, share code

**Creator code**:
A personal secret that lets its holder create trips. Each one belongs to a named person and can be revoked on its own.
_Avoid_: Admin password, invite

**Creator**:
Whoever holds a valid creator code. A creator can create trips but has no special powers inside one.
_Avoid_: Admin, owner, organiser

**Participant**:
A name inside one trip, standing for one person or for a unit that pays together (a couple, a family). There are no accounts: a participant exists only within its trip.
_Avoid_: Member, user, friend

**Payment details**:
What a participant chose to share about how to receive money (an IBAN, a PayPal.me name, a Revolut name, a phone number for Satispay), all optional. They let whoever owes that participant pay in one tap. Shown in the Italian interface as "Come ricevere i soldi". Quits never moves the money itself.
_Avoid_: Bank details, payment method, wallet

**Trip currency**:
The single currency every amount in a trip is expressed in. There is no conversion between currencies.

**Default split**:
The split a trip suggests for each new expense (e.g. a couple counted as two shares). Expenses can always override it.

### Money moving

**Expense**:
Money one or more participants paid for something the trip shares, with a description, a date and a split.
_Avoid_: Cost, transaction, bill

**Payer**:
A participant who paid part of an expense, with the exact amount they paid.

**Split**:
How an expense is divided among participants: equally (among everyone or a subset), by exact amounts, by percentages or by shares. The split method and its inputs are kept, not just the resulting amounts.
_Avoid_: Division, allocation

**Category**:
What an expense was for. Every trip has the standard categories (Accommodation, Transport, Restaurants, Groceries, Activities, Other) and may add its own, with a name and an emoji. An expense without one is Other.
_Avoid_: Tag, label, type

**Share**:
The amount of an expense a participant owes, derived from the split.
_Avoid_: Quota, owed share

**Refund**:
Money the trip receives back (e.g. a returned deposit), split like an expense with its sign reversed.
_Avoid_: Reimbursement, income

**Settlement**:
Money one participant gives another to reduce what they owe. Shown in the Italian interface as "Pagamento".
_Avoid_: Reimbursement, rimborso, payback

### Being even

**Balance**:
What a participant has paid minus what they owe, across the whole trip. Positive means the trip owes them.
_Avoid_: Debt, credit

**Suggested settlements**:
The smallest practical set of settlements that brings every balance to zero. Quits never shows who owes whom pair by pair, only balances and suggested settlements.
_Avoid_: Simplified debts

**Leftover cent**:
The minor unit left over when a share cannot be divided exactly; it goes to a participant by a fixed rule so every device agrees.

### History

**Operation**:
One recorded change to a trip (an expense added, edited, deleted or restored; a settlement recorded; a participant added, renamed or merged, a phone changing who it is), with its author and time. The trip is whatever its operations add up to.
_Avoid_: Event, activity, log entry

**History**:
A trip's operations in order, never erased. Deleted expenses and settlements are restored from it.
_Avoid_: Activity feed, audit log

**Conflict**:
Two operations on the same expense made without knowledge of each other. The later one wins on the whole expense; the other stays in the history.

**Identity (of a device)**:
Which participant a phone is in a trip, answered once by "chi sei?" ("Sei Simone"). It is sticky: changing it is a deliberate act in Viaggio that everyone sees in the history. It is a label on the phone, not an account.
_Avoid_: Profile, login, user

**Merge**:
Folding one participant into another when the same person was added twice.
