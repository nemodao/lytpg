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
        'now': ('Current server time, ISO 8601 with offset. Drives "today", days until expiry, and the live-feed open/closed check.', ''),
        'balance.available': ('Coins the user can spend now. The big number on Home and Coins.', ''),
        'balance.pending': ('Coins earned but not yet credited. Shown as "+850 pending" when above 0.', ''),
        'balance.expiring': ('Coins about to expire, or null. When set, the red warning shows under the balance.', 'null or object'),
        'balance.expiring.points': ('How many coins expire within the warning window.', ''),
        'balance.expiring.date': ('Date of the nearest expiry (not displayed; kept for reference).', 'YYYY-MM-DD'),
        'program.ended': ('true when the programme is over: Earn shows the end message, no trade button.', ''),
        'program.creditMode': ('When earned coins are credited: "delayed" (after creditDelayDays) or "in-day" (through the day).', '"delayed" | "in-day"'),
        'program.dailyMaxPoints': ('Most coins a user can earn per day. Shown in the rules.', ''),
        'program.minHoldMinutes': ('Minimum time a position must be held to earn. Shown in the rules.', ''),
        'program.creditDelayDays': ('Days between the trading day and crediting, in "delayed" mode. Shown in the rules.', ''),
        'program.expiryDays': ('Days after crediting until coins expire. Shown in the rules.', ''),
        'program.refreshMinutes': ('How often today\'s figures refresh. Shown as "Update every 30 mins".', ''),
        'program.resetTime': ('Local time (WIB) at which a new earning day starts. Shown in the rules.', 'HH:MM'),
        'program.expiryWarningDays': ('Size of the "expiring soon" window in days: the balance warning text and the red highlight on lots.', ''),
        'program.tradingTask': ('false when the trading task is off or hidden for this user: Home hides the Daily Trading card and the bottom bar drops the Earn tab.', ''),
        'program.joinRequirement': ('What the user must still do before joining the trading task. When set, the Today card on Home and Earn shows "How to start" (three steps and the button for the current step) instead of today\'s figures, and Earn hides the account picker.', 'null | "kyc" | "deposit"'),
        'accounts[].id': ('Trading account number, shown as is.', ''),
        'accounts[].eligible': ('Whether this account takes part in the programme (false e.g. for an MT5 group that is excluded).', ''),
        'rates[].group': ('Symbol group of an earning rate; its label is copy key rate.<group>.', '"forex" | "metal" | "indices" | "other"'),
        'rates[].ptsPerLot': ('Coins earned per lot in that group. Rows with 0 are hidden. The highest value fills "Earn up to {max} coins per lot" in the tour.', ''),
        'liveFeed.openUtc.day': ('Start of the weekly window in which the live activity line shows (UTC).', 'weekday name'),
        'liveFeed.openUtc.time': ('Start time of that window (UTC).', 'HH:MM'),
        'liveFeed.closeUtc.day': ('End of the weekly window (UTC).', 'weekday name'),
        'liveFeed.closeUtc.time': ('End time of that window (UTC).', 'HH:MM'),
        'liveFeed.clock': ('PREVIEW ONLY. Overrides `now` for the live feed, used by the market-closed state. Not sent by the API.', 'ISO 8601, optional'),
        'liveFeed.clientIdPrefix': ('DEMO generator: fixed first digits of the masked client id. With a real feed the server sends the masked id.', ''),
        'liveFeed.points.step': ('DEMO generator: step between possible amounts.', ''),
        'liveFeed.points.bands[].min': ('DEMO generator: lowest amount of a band.', ''),
        'liveFeed.points.bands[].max': ('DEMO generator: highest amount of a band.', ''),
        'liveFeed.points.bands[].weight': ('DEMO generator: share of entries drawn from this band.', ''),
        'liveFeed.intervalSeconds[]': ('DEMO generator: possible waits between two entries, in seconds.', ''),
        'tour.firstVisit': ('PREVIEW ONLY. Forces the guided tour to open as on a first visit.', ''),
        'tour.simulatedBalance': ('Figure the balance counts up to in tour step 3 (a simulation). No effect if the real balance is already higher.', ''),
    },
    'dashboard': {
        'task.lotsToday': ('Lots traded today. "You traded" on the Daily Trading card.', ''),
        'task.pointsToday': ('Coins earned today. "Coins earned" on the Daily Trading card.', ''),
        'task.updatedAt': ('When today\'s figures were last refreshed (not displayed).', 'ISO 8601'),
        'task.capped': ('true when today\'s maximum is reached: the capped message shows in the Today panel.', ''),
        'rewards[].image': ('Image of a reward tile on Home (three tiles). Path or URL.', ''),
        'rewards[].alt': ('Text alternative of that image.', ''),
        'checkIn.enabled': ('Shows the daily check-in card (future feature, off by default).', ''),
        'checkIn.rewards[]': ('Coins for each of the seven check-in days, in order.', ''),
        'checkIn.checkedDays': ('How many days in a row the user has checked in.', ''),
        'checkIn.checkedToday': ('Whether today is already checked in (button disabled).', ''),
    },
    'trading-task': {
        'today.lots': ('Lots traded today.', ''),
        'today.points': ('Coins earned today.', ''),
        'today.status': ('Whether today\'s coins are still waiting or already in the balance. Picks the status line under the figures.', '"pending" | "credited"'),
        'today.creditAt': ('When pending coins will be credited. Shown in the pending status line.', 'ISO 8601'),
        'today.updatedAt': ('When today\'s figures were last refreshed (not displayed).', 'ISO 8601'),
        'today.capped': ('true when today\'s maximum is reached.', ''),
        'selectedAccountId': ('Trading account currently selected; must match one of common.accounts[].id.', ''),
        'history[].date': ('A past trading day.', 'YYYY-MM-DD'),
        'history[].lots': ('Lots traded that day.', ''),
        'history[].points': ('Coins earned that day.', ''),
        'history[].status': ('Badge of that day. In "in-day" mode every past day shows as credited.', '"pending" | "credited"'),
        'history[].capped': ('true when that day reached the maximum ("Reached Max Coins").', ''),
    },
    'point-balance': {
        'items[].source': ('Where the lot came from; its label is copy key pb.source.<source>.', '"trading"'),
        'items[].earnedOn': ('Day the coins were earned.', 'YYYY-MM-DD'),
        'items[].total': ('Coins earned in this lot ("Earned").', ''),
        'items[].remaining': ('Coins of this lot not yet spent ("Remain"); for an expired lot, the coins that expired unspent.', ''),
        'items[].status': ('State of the lot. earning/pending/active/used-before-expiry show in Available; expired and used-then-expired show in Expired.', '"earning" | "pending" | "active" | "used" | "expired"'),
        'items[].creditAt': ('When a pending lot will be credited. Null for other statuses.', 'YYYY-MM-DD or null'),
        'items[].expiresAt': ('Expiry date of the lot. Null while earning or pending.', 'YYYY-MM-DD or null'),
        'history[].date': ('Day of a balance movement. Rows are grouped by day, newest first.', 'YYYY-MM-DD'),
        'history[].type': ('Kind of movement; its label is copy key hist.<type>.', '"earning" | "earned" | "redeemed" | "refunded" | "expired" | "adjusted"'),
        'history[].points': ('Signed amount: positive added, negative taken.', ''),
        'history[].source': ('Source of an earned movement, else null.', '"trading" or null'),
        'pendingItems[]': ('PREVIEW ONLY. Lots added by the has-pending state. With a real API put every lot in items and send [] or omit.', 'same shape as items[]'),
        'usedItems[]': ('PREVIEW ONLY. Lots added by the has-used state. Same remark.', 'same shape as items[]'),
        'empty.available': ('PREVIEW ONLY. Empties the Available tab.', 'optional'),
        'empty.expired': ('PREVIEW ONLY. Empties the Expired tab.', 'optional'),
        'empty.history': ('PREVIEW ONLY. Empties the History tab.', 'optional'),
    },
}
SOURCES = [
    ('common', 'mock/common.json', None, 'Shared by all pages — `fetchCommon()`'),
    ('dashboard', 'mock/dashboard.json', 'default', 'Home — `fetchPage(\'dashboard\')`'),
    ('trading-task', 'mock/trading-task.json', 'default', 'Earn — `fetchPage(\'trading-task\')`'),
    ('point-balance', 'mock/point-balance.json', 'default', 'Coins — `fetchPage(\'point-balance\')`'),
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
