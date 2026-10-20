#!/usr/bin/env python3
"""Write DATA.md: the data contract between these pages and whatever feeds them (mock files today, the API later).

Field lists, types and examples are read from the mock files, so they cannot drift from what the pages render.
The meaning of each field is written in FIELDS below; the script stops if a field in the mocks has no entry here,
so a new field can never ship undocumented.

    python3 tools/build-data-contract.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# path -> (meaning, extra type note or '')
FIELDS = {
    'common': {
        'guest': ('true when the app opened the page without a token (not signed in, spec §53). The pages then show their guest version and call only the guest APIs; program.joinRequirement is "signup", balance 0, no accounts.', 'boolean'),
        'now': ('Current server time, ISO 8601 with offset. Drives "today", days until expiry, and "3m ago" in the recent activity card.', ''),
        'activity[].type': ('Recent activity card on Home and Earn (spec §50), one list per session from the backend. Kind of entry: "gift" (a reward was redeemed) or "coin" (coins were earned).', '"gift" | "coin"'),
        'activity[].client': ('Client of that entry, already masked by the backend, e.g. "95***442".', ''),
        'activity[].reward': ('Gift entries: the reward\'s name.', ''),
        'activity[].points': ('Coin entries: coins earned.', ''),
        'activity[].at': ('When it happened (ISO 8601). The card shows the time since then ("3m ago").', ''),
        'balance.available': ('Coins the user can spend now. The big number on Home and Coins.', ''),
        'balance.expiring': ('Coins about to expire, or null. When set, the red warning shows under the balance.', 'null or object'),
        'balance.expiring.points': ('How many coins expire within the warning window.', ''),
        'program.ended': ('true when the programme is over: Earn shows the end message, no trade button; Home hides the "earn coins" card.', ''),
        'program.creditMode': ('When earned coins are credited: "delayed" (after creditDelayDays) or "in-day" (through the day).', '"delayed" | "in-day"'),
        'program.dailyMaxPoints': ('Most coins a user can earn per day, or null for no maximum. Shown in the rules and next to the rate range; null hides both.', 'number or null'),
        'program.minHoldMinutes': ('Minimum time a position must be held to earn. Shown in the rules.', ''),
        'program.minHoldSeconds': ('The same minimum in seconds. When it is not a whole number of minutes the rule reads "at least 90 seconds"; when it is 0 the rule is not shown.', ''),
        'program.tzMinutes': ('Time zone of the programme as minutes from UTC (420 = GMT+7). Sent back to the coin list endpoints; the pages format every date in GMT+7 (WIB).', ''),
        'program.creditDelayDays': ('Days between the trading day and crediting, in "delayed" mode. Shown in the rules.', ''),
        'program.expiryDays': ('Days after crediting until coins expire. Shown in the rules.', ''),
        'program.creditWithinMinutes': ('NOT FROM THE API: fixed in the UI. Longest time for coins to arrive after a position is closed. Shown as "Updates within 15 mins" and in the in-day rule.', ''),
        'program.resetTime': ('Local time (WIB) at which a new earning day starts. Shown in the rules.', 'HH:MM'),
        'program.expiryWarningDays': ('Size of the "expiring soon" window in days: the balance warning text and the red highlight on lots.', ''),
        'program.tradingTask': ('false when the trading task is off or hidden for this user: Home hides the "earn coins" card of the rewards grid and the bottom bar drops the Earn tab.', ''),
        'program.joinRequirement': ('Guests (no token): "signup". Otherwise NOT SENT BY THE LOYALTY API: derive it from the app sign-in data (kycApproveTime = 0 -> "kyc"; kycApproveTime > 0 and firstDepositTime = 0 -> "deposit"; else null). When set, the Today card on Earn shows "How to start" instead of today\'s figures, Earn shows no account picker and no rates table, and every Redeem button (Home, Coins) opens the "How to start" sheet instead of Tada.', 'null | "signup" | "kyc" | "deposit"'),
        'program.termsUrl': ('Address of the Terms & Conditions document. Earn shows a `Terms & Conditions` text button under the How it works rules; it opens this address inside a bottom sheet. The document is a PDF. Null or missing hides the button. The mock points at a sample PDF.', 'URL of a PDF, or null'),
        'program.rateRange': ('Lowest and highest earning rate of the programme, or null when it has no rate yet. Shown as "70–100 coins per lot" to users without a trading account, and its max in tour step 2. Null hides both.', 'object or null'),
        'program.rateRange.min': ('Lowest coins per lot.', ''),
        'program.rateRange.max': ('Highest coins per lot. One figure is shown when min = max.', ''),
        'accounts[].id': ('Trading account number, shown as is. The list is empty for users without a live account.', ''),
        'accounts[].eligible': ('Whether this account takes part in the programme (false e.g. for an MT5 group that is excluded).', ''),
        'accounts[].group': ('Full MT5 group name of the account, e.g. Direct\\VIP1 (tradingTask/get, spec §51). A tier only when it is exactly (any case) Direct\\Mini400 = Micro, Direct\\Mini10 = Standard, Direct\\VIP1 = VIP, Direct\\MIVIP = Platinum; others (e.g. 1F\\Direct\\Mini10) show no tier and no upgrade row.', ''),
        'accounts[].lifetimeDeposit': ('Approved deposits into this account, USD; 0 when none (every account, eligible or not). The tier sheet compares it with the next tier\'s threshold, fixed in the page: 0, 200, 1,000, 5,000.', 'number'),
        'selectedAccountId': ('The trading account the app currently trades with (tradingTask/get `selectedAccountId`); null for guests. Used only as a tie-break: the pages show the eligible account on the highest tier, and among several on that tier this one (spec §55).', 'string | null'),
        'accounts[].rates[].type': ('Kind of rate row. Empty list for an account that is not eligible.', '"symbol" | "symbol_group" | "any"'),
        'accounts[].rates[].value': ('Symbol (shown as is), or group: forex, metal, energy, index, stocks, other (label = copy key rate.<value>). For type "any": "other" or null, shown as "Others".', 'string or null'),
        'accounts[].rates[].ptsPerLot': ('Coins earned per lot for that row. Rows come highest first, the "any" row last, never 0.', ''),
        'tiers[].group': ('One element per MT5 group the programme has rates for (tradingTask/get, spec §51), unsorted; full group name. The page keeps the four tier groups, in tier order. None for guests.', ''),
        'tiers[].rates[].type': ('Rates of this group, made by the same function as an account\'s rates. Shown in the tier sheet\'s table.', '"symbol" | "symbol_group" | "any"'),
        'tiers[].rates[].value': ('As accounts[].rates[].value.', 'string or null'),
        'tiers[].rates[].ptsPerLot': ('Coins per lot on this tier for that row.', ''),
        'view': ('PREVIEW ONLY. "loading" or "error" replaces the page content with the loading placeholder or the error message. In the product this comes from the state of the requests, not from data.', '"loading" | "error", optional'),
        'tour.firstVisit': ('PREVIEW ONLY. Forces the guided tour to open as on a first visit.', ''),
        'tour.simulatedBalance': ('Figure the balance counts up to in tour step 3 (a simulation). No effect if the real balance is already higher.', ''),
    },
    'dashboard': {
        'rewards[].id': ('HSB\'s key for the reward card (GET /loyalty/catalog, number in the API, text here). Sent as data-reward and as reward_id in loyalty_reward_click. Not a Tada id: it does not open the reward in Tada.', ''),
        'rewards[].name': ('Reward name as HSB sends it (may include a denomination, e.g. "Rp50.000"), two lines at most.', ''),
        'rewards[].points': ('Price in coins on the card.', ''),
        'rewards[].image': ('HTTPS link to the reward image, hosted by HSB: square, transparent background, product centred, at least 460px; shown whole.', ''),
        'checkIn.enabled': ('Shows the daily check-in card (future feature, off by default).', ''),
        'checkIn.rewards[]': ('Coins for each of the seven check-in days, in order.', ''),
        'checkIn.checkedDays': ('How many days in a row the user has checked in.', ''),
        'checkIn.checkedToday': ('Whether today is already checked in (button disabled).', ''),
    },
    'trading-task': {
        'today.lots': ('Lots already counted for coins today (the API\'s today.lotsValid). It rises together with today.points, when the coins of a closed position arrive.', ''),
        'today.points': ('Coins earned today.', ''),
        'today.status': ('Where today\'s coins stand. Picks the line under the figures: earning = coins are arriving (shown even while lots and coins still read 0), credited = all in the balance, not_started = no trade yet, pending (delayed programmes) = no line.', '"not_started" | "earning" | "credited" | "pending"'),
        'today.capped': ('true when today\'s maximum is reached.', ''),
        'selectedAccountId': ('The trading account the app currently trades with (tradingTask/get `selectedAccountId`, the same value as common.selectedAccountId); one of common.accounts[].id. Missing or null when the user has no account. Since spec §55 it is only the tie-break and the fallback: Earn opens on the account chosen for the session (shared/tiers.js chosenAccountId).', 'string or null'),
        'history[].date': ('A trading day, newest first. Today is included once it has coins arriving and is labelled "Today".', 'YYYY-MM-DD'),
        'history[].lots': ('Lots traded that day.', ''),
        'history[].points': ('Coins earned that day.', ''),
        'history[].status': ('Badge of that day. Days with status "pending" are not listed.', '"earning" | "credited" | "pending"'),
        'history[].capped': ('true when that day reached the maximum ("Reached Max Coins").', ''),
    },
    'point-balance': {
        'items[].source': ('Where the lot came from; its label is copy key pb.source.<source>.', '"trading" | "daily_checkin" | "adjust"'),
        'items[].earnedOn': ('Day the coins reached the balance (not the trading day).', 'YYYY-MM-DD'),
        'items[].total': ('Coins earned in this lot ("Earned").', ''),
        'items[].remaining': ('Coins of this lot not yet spent ("Remain"); for an expired lot, the coins that expired unspent.', ''),
        'items[].status': ('State of the lot. earning/active/used-before-expiry show in Available; expired and used-then-expired show in Expired.', '"earning" | "active" | "used" | "expired"'),
        'items[].expiresAt': ('Expiry of the lot; only its day is shown. May be null while earning.', 'date or ISO 8601, or null'),
        'items[].list': ('Tab the lot belongs to.', '"available" | "expired"'),
        'items[].expiringSoon': ('true when the lot still has coins and expires within 10 days: its expiry line turns red.', ''),
        'history[].happenedAt': ('When the movement happened. Its time is shown after the label; rows are ordered by it, newest first.', 'ISO 8601'),
        'history[].date': ('Local day of happenedAt. Rows are grouped under it.', 'YYYY-MM-DD'),
        'history[].type': ('Kind of movement. earn shows the source as its label; consume = "Redeemed reward"; refund = "Refund"; expire = "Expired"; adjust_* = "Adjustment".', '"earn" | "consume" | "refund" | "expire" | "adjust_positive" | "adjust_negative"'),
        'history[].source': ('Where the coins came from or went to; label of an earn row (copy key pb.source.<source>).', '"trading" | "daily_checkin" | "adjust" | "redeem"'),
        'history[].points': ('Signed amount: positive added, negative taken. One row per credit: several earn rows a day are normal and are not merged.', ''),
        'usedItems[]': ('PREVIEW ONLY. Lots added by the has-used state. Same remark.', 'same shape as items[]'),
        'loadMoreError': ('PREVIEW ONLY. Shows the failed-to-load row at the end of a long list.', 'optional'),
        'empty.available': ('PREVIEW ONLY. Empties the Available tab.', 'optional'),
        'empty.expired': ('PREVIEW ONLY. Empties the Expired tab.', 'optional'),
        'empty.history': ('PREVIEW ONLY. Empties the History tab.', 'optional'),
    },
    'redemptions': {
        'total': ('Number of orders the user has (the `total` of GET /loyalty/orders). While the list holds fewer, it loads the next page on scroll (page, pageSize 20).', ''),
        'orders[].orderReference': ('Order id from GET /loyalty/orders (spec §52). Opens the order: fetchOrder(orderReference).', ''),
        'orders[].orderNumber': ('Order number shown to the user, e.g. TADA26101214305512.', ''),
        'orders[].status': ('Normalised by the backend. Badge: new = Order placed, on process = Processing, completed, canceled = Cancelled, failed.', '"new" | "on process" | "completed" | "canceled" | "failed"'),
        'orders[].orderDate': ('When the order was placed (ISO 8601). List is newest first.', ''),
        'orders[].firstItemName': ('Name of the order\'s first reward (GET /loyalty/orders `firstItemName`, settled 20 Oct 2026).', ''),
        'orders[].coinSpent': ('Coins taken for the order.', ''),
        'details[].orderReference': ('MOCK ONLY: the demo\'s orders for fetchOrder(ref). With the API, one GET /loyalty/orders/{orderReference} per order, in this shape.', ''),
        'details[].orderNumber': ('As in the list.', ''),
        'details[].status': ('Current status (phase 1 has no step-by-step history).', 'as orders[].status'),
        'details[].orderDate': ('When the order was placed.', ''),
        'details[].lastStatusAt': ('When the status last changed: "Updated {date}, {time}".', ''),
        'details[].coinSpent': ('Coins taken for the order.', ''),
        'details[].refunded': ('true when the coins went back to the balance: a green note.', ''),
        'details[].items[].name': ('Reward name.', ''),
        'details[].items[].type': ('Kind: decides the block shown. egift: evoucher; pln / pulsa: token; physical: tracking. Others: label "Reward".', '"egift" | "physical" | "pln" | "pulsa" | …'),
        'details[].items[].quantity': ('Quantity.', ''),
        'details[].items[].status': ('Item status; shown only when it differs from the order\'s.', ''),
        'details[].items[].evoucher': ('E-gift items only; null otherwise. Each item has at most one of evoucher, token, tracking.', 'object or null'),
        'details[].items[].token': ('PLN / mobile credit items only; null otherwise.', 'object or null'),
        'details[].items[].tracking': ('Physical goods only, once shipped; null otherwise.', 'object or null'),
        'details[].items[].evoucher.code': ('E-voucher code. Arrives in clear; hidden until Show, then copyable.', 'string or null'),
        'details[].items[].evoucher.pin': ('E-voucher PIN, same handling.', 'string or null'),
        'details[].items[].evoucher.link': ('Voucher link: "Open voucher" (intent `voucher`, data-url).', 'string or null'),
        'details[].items[].evoucher.expiredDate': ('"Valid until {date}".', 'ISO 8601 or null'),
        'details[].items[].token.serialNumber': ('PLN / mobile credit token. Hidden until Show, then copyable.', ''),
        'details[].items[].token.message': ('Message shown under it.', ''),
        'details[].items[].tracking.awbNumber': ('Physical goods: AWB number (copyable).', ''),
        'details[].items[].tracking.shippingCompany': ('Courier.', ''),
        'details[].items[].tracking.trackingNumber': ('Tracking number.', ''),
        'details[].recipient.name': ('Physical goods: "Delivery to".', ''),
        'details[].recipient.address': ('Address.', ''),
        'details[].recipient.postalCode': ('Postal code.', ''),
    },
}
SOURCES = [
    ('common', 'mock/common.json', None, 'Shared by all pages — `fetchCommon()`'),
    ('dashboard', 'mock/dashboard.json', 'default', 'Home — `fetchPage(\'dashboard\')`'),
    ('trading-task', 'mock/trading-task.json', 'default', 'Earn — `fetchPage(\'trading-task\')`'),
    ('point-balance', 'mock/point-balance.json', 'default', 'Coins — `fetchPage(\'point-balance\')`'),
    ('redemptions', 'mock/redemptions.json', 'default', 'Redemption history — `fetchPage(\'redemptions\')` (list) and `fetchOrder(ref)` (one order, shape of `details[]`)'),
]
TYPES = {'str': 'string', 'int': 'number', 'float': 'number', 'bool': 'boolean', 'NoneType': 'null', 'list': 'array', 'dict': 'object'}


def walk(value, path, out):
    if isinstance(value, dict) and value:
        for key, inner in value.items():
            walk(inner, f'{path}.{key}' if path else key, out)
    elif isinstance(value, list) and value and isinstance(value[0], dict):
        merged = {}
        for item in value:
            for key, inner in item.items():
                if merged.get(key) is None:
                    merged[key] = inner
        for key, inner in merged.items():
            walk(inner, f'{path}[].{key}', out)
    elif isinstance(value, list):
        out[path + '[]'] = (TYPES[type(value[0]).__name__] if value else 'array', json.dumps(value, ensure_ascii=False))
    else:
        out[path] = (TYPES[type(value).__name__], json.dumps(value, ensure_ascii=False))


def main():
    lines = [
        '# Data contract',
        '',
        '_Generated from the mock files by `tools/build-data-contract.py`. Do not edit by hand._',
        '',
        'These are the only data the pages read. All of it enters through `shared/data-source.js`: today that file',
        'reads the mock JSON; to connect the API, make its functions return **these same shapes** and nothing else',
        'changes. Field names say `points` for historical reasons; on screen the unit is always "coins".',
        '',
        'Rows marked **PREVIEW ONLY** or **DEMO generator** exist for the demo and are not expected from the API.',
        'Dates without a time are calendar days in WIB (GMT+7). Amounts are whole coins.',
        '',
    ]
    missing = []
    for name, file, key, title in SOURCES:
        data = json.loads((ROOT / file).read_text(encoding='utf-8'))
        raw = data
        data = data[key] if key else {k: v for k, v in data.items() if k not in ('stateGroups', 'states', 'default')}
        found = {}
        walk(data, '', found)
        # Fields that only appear inside preview states (e.g. balance.expiring.points) are documented too.
        documented = FIELDS[name]
        missing += [f'{name}: {path}' for path in found if path not in documented and not any(path.startswith(p.rstrip('[]') + '[].') for p in documented if p.endswith('[]'))]
        lines += [f'## {title}', '', f'Example file: `{file}`' + (' (`default`)' if key else ''), '',
                  '| Field | Type | Example | Meaning |', '|---|---|---|---|']
        for path, (meaning, note) in documented.items():
            kind, example = found.get(path, ('', ''))
            kind = note or kind
            if len(example) > 46:
                example = example[:43] + '…'
            lines.append(f'| `{path}` | {kind} | {("`" + example + "`") if example else ""} | {meaning} |')
        lines.append('')
        del raw
    if missing:
        sys.exit('Fields in the mocks without a description in tools/build-data-contract.py:\n  ' + '\n  '.join(missing))
    (ROOT / 'DATA.md').write_text('\n'.join(lines), encoding='utf-8')
    print('Wrote DATA.md')


if __name__ == '__main__':
    main()
