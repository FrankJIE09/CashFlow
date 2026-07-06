import sys, json, os
sys.stdout.reconfigure(encoding='utf-8')
p = r'H:/Frank/code/CashFlow/test-output'
fs = sorted([f for f in os.listdir(p) if f.endswith('.json')], reverse=True)
with open(os.path.join(p, fs[0]), 'r', encoding='utf-8') as f:
    d = json.load(f)

meta = d.get('meta', {})
print('=== 测试元数据 ===')
print('  文件名:', fs[0])
print('  最大回合:', meta.get('maxRounds'))
print('  完成回合:', meta.get('roundsCompleted'))
print('  最终阶段:', meta.get('finalPhase'))
print('  Bug 数:', meta.get('bugCount'))

snaps = d.get('snapshots', [])
print(f'\n=== 快照: {len(snaps)} 条 ===')
print('  回合范围:', snaps[0].get('round'), '~', snaps[-1].get('round'))
last = snaps[-1]
print('  最终现金:', last.get('cash'))
print('  最终现金流:', last.get('cashFlow'))
print('  最终被动收入:', last.get('passiveIncome'))
print('  最终支出:', last.get('expenses'))
print('  最终净资产:', last.get('netWorth'))
print('  破产:', last.get('isBankrupt'))
print('  失业:', last.get('unemployed'))

# 快照明细表
print('\n=== 完整回合数据 ===')
header = ['回合','阶段','现金','现金流','被动','支出','净资','失业','破产','资产清单']
print('\t'.join(header))
for s in snaps:
    assets = s.get('assetCashFlows', [])
    summary = ', '.join([f"{a['name']}({a['name'][:2] if len(a['name'])>2 else a['name']})" for a in assets]) if assets else ''
    print('\t'.join([
        str(s.get('round')),
        s.get('phase','')[:8],
        str(s.get('cash','')),
        str(s.get('cashFlow','')),
        str(s.get('passiveIncome','')),
        str(s.get('expenses','')),
        str(s.get('netWorth','')),
        'U' if s.get('unemployed') else '',
        'B' if s.get('isBankrupt') else '',
        summary[:60],
    ]))

bugs = d.get('bugs', [])
print(f'\n=== Bug: {len(bugs)} 条 ===')
cats = {}
for b in bugs:
    k = (b.get('category'), b.get('severity'), b.get('message','')[:60])
    cats[k] = cats.get(k, 0) + 1
for (cat, sev, msg), cnt in sorted(cats.items(), key=lambda x: -x[1]):
    print('  [%s/%s] %s x%d' % (sev, cat, msg, cnt))

# 检验财务一致性
print('\n=== 财务一致性校验 ===')
for i, s in enumerate(snaps):
    calc_cf = s.get('salary',0) + s.get('passiveIncome',0) - s.get('expenses',0)
    actual_cf = s.get('cashFlow',0)
    if abs(calc_cf - actual_cf) > 1:
        print('  R%d 现金流不一致: 计算=%d vs 实际=%d (工资=%d+被动=%d-支出=%d)' % (
            s.get('round'), calc_cf, actual_cf,
            s.get('salary',0), s.get('passiveIncome',0), s.get('expenses',0)))

if all(abs(s.get('salary',0) + s.get('passiveIncome',0) - s.get('expenses',0) - s.get('cashFlow',0)) <= 1 for s in snaps):
    print('  ✅ 全部回合现金流计算一致')

# ── 全面资产数据校验 ──
print('\n=== 全面资产数据校验 ===')

errs = []

for s in snaps:
    for a in s.get('assetCashFlows', []):
        r = s.get('round')
        # 1. 现金流 = baseFlow × 乘数
        expected_cf = round(a['baseFlow'] * a['typeMult'] * a['sectorMult'])
        if a['actualFlow'] != expected_cf:
            errs.append('  ❌ R%d %s 现金流: 期望 %d = %s×%s×%s，实际 %d' % (
                r, a['name'], expected_cf, a['baseFlow'], a['typeMult'], a['sectorMult'], a['actualFlow']))
        # 2. 非股票类市值 = baseMV × 乘数
        if a.get('singlePrice') is None:  # 非股票类
            expected_mv = round(a['baseMarketValue'] * a['mvTypeMult'] * a['mvSectorMult'])
            if a['currentMarketValue'] != expected_mv:
                errs.append('  ❌ R%d %s 市值: 期望 %d = %s×%s×%s，实际 %d' % (
                    r, a['name'], expected_mv, a['baseMarketValue'], a['mvTypeMult'], a['mvSectorMult'], a['currentMarketValue']))
        # 3. 股票类: 检查月股息计算
        if a.get('monthlyDividend') is not None and a.get('yearDivPerShare') is not None and a.get('shareHand') is not None:
            expected_div = round(a['shareHand'] * 100 * a['yearDivPerShare'] / 12)
            if a['monthlyDividend'] != expected_div:
                errs.append('  ❌ R%d %s 月股息: 期望 %d = %d手×100×%s/12，实际 %d' % (
                    r, a['name'], expected_div, a['shareHand'], a['yearDivPerShare'], a['monthlyDividend']))

# 被动收入 = ∑资产现金流
pi_errs = []
for s in snaps:
    r = s.get('round')
    sum_asset = sum(a['actualFlow'] for a in s.get('assetCashFlows', []))
    pi = s.get('passiveIncome', 0)
    if sum_asset != pi:
        pi_errs.append('  ❌ R%d ∑资产现金流 %d ≠ 被动收入 %d' % (r, sum_asset, pi))

if not errs:
    print('  ✅ 全部资产现金流 = baseFlow × 乘数')
    print('  ✅ 非股票类资产市值 = baseMV × 乘数')
    if not pi_errs:
        print('  ✅ 被动收入 = ∑资产现金流')
    else:
        print('\n'.join(pi_errs))
else:
    print('\n'.join(errs))

# ── 每回合资产明细（完整显示）──
print('\n=== 每回合资产明细（含PE/PB/股息/浮盈）===')
for s in snaps:
    r = s.get('round')
    for a in s.get('assetCashFlows', []):
        parts = ['  R%d %s' % (r, a['name'])]
        # 市值
        if a.get('singlePrice') is not None:
            is_effected = a['mvTypeMult'] != 1 or a['mvSectorMult'] != 1
            parts.append('市值%d%s' % (a['currentMarketValue'], '×乘' if is_effected else ''))
        else:
            is_effected = a['mvTypeMult'] != 1 or a['mvSectorMult'] != 1
            parts.append('市值%d→%d%s' % (a['baseMarketValue'], a['currentMarketValue'], '×乘' if is_effected else ''))
        # 现金流
        if a['typeMult'] != 1 or a['sectorMult'] != 1:
            parts.append('现金流%d×乘=%d' % (a['baseFlow'], a['actualFlow']))
        else:
            parts.append('现金流%d' % a['actualFlow'])
        # 股票信息
        if a.get('singlePrice') is not None:
            parts.append('现价¥%.2f' % a['singlePrice'])
            if a.get('costPerShare'): parts.append('成本¥%.2f' % a['costPerShare'])
            if a.get('currentPe'): parts.append('PE%s' % a['currentPe'])
            if a.get('basePe'): parts.append('中枢PE%s' % a['basePe'])
            if a.get('pb'): parts.append('PB%.2f' % a['pb'])
            if a.get('dividendYield'): parts.append('息%.1f%%' % (a['dividendYield'] * 100))
            if a.get('monthlyDividend'): parts.append('月股息%d' % a['monthlyDividend'])
            if a.get('profitPct') is not None:
                sign = '+' if a['profitPct'] >= 0 else ''
                parts.append('浮%s%.1f%%' % (sign, a['profitPct']))
            if a.get('heldMonths') is not None and a['heldMonths'] > 0:
                parts.append('持有%d月' % a['heldMonths'])
        if a.get('isSelfLiving'):
            parts.append('自住')
        print(' | '.join(parts))

# 显示有乘数效果的资产
print('\n=== 乘数生效的资产 ===')
found = False
for s in snaps:
    for a in s.get('assetCashFlows', []):
        cf_effected = a['typeMult'] != 1 or a['sectorMult'] != 1
        mv_effected = a['mvTypeMult'] != 1 or a['mvSectorMult'] != 1
        if cf_effected or mv_effected:
            print('  R%d %s%s%s' % (
                s.get('round'), a['name'],
                ' 现金流×%s×%s=%d' % (a['typeMult'], a['sectorMult'], a['actualFlow']) if cf_effected else '',
                ' 市值×%s×%s=%d→%d' % (a['mvTypeMult'], a['mvSectorMult'], a['baseMarketValue'], a['currentMarketValue']) if mv_effected else ''))
            found = True
if not found:
    print('  (本轮无乘数生效的资产)')
