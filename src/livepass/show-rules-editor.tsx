import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatEther, parseEther } from 'ethers';
import { useLivePass } from './context';
import { ethInput, POLICIES, type ChainShow } from './model';
import { POLICY_COPY } from '../data/livepass';
import { Action, Field, p } from './ui';

type Change = { method: 'setPrice' | 'setResalePolicy' | 'setStakeRequirement'; value: bigint | number; label: string; before: string; after: string };

// The parent keys this form by wallet and on-chain rules, so changed rules discard the old draft/confirmation.
export function ShowRulesEditor({ show }: { show: ChainShow }) {
  const shop = useLivePass();
  const [price, setPrice] = useState(show.price);
  const [stake, setStake] = useState(show.stake);
  const [policy, setPolicy] = useState(POLICIES.indexOf(show.policy));
  const [confirmation, setConfirmation] = useState<Change | null>(null);
  const [error, setError] = useState('');
  const disabled = shop.locked || shop.phase !== 'ready' || show.rulesFrozen;
  const changed = () => { setConfirmation(null); setError(''); };
  const review = (method: Change['method']) => {
    try {
      let change: Change;
      if (method === 'setPrice') {
        const value = ethInput(price);
        if (value > parseEther('100')) throw new Error('课程测试演出票价请勿超过 100 ETH。');
        if (value === show.priceWei) throw new Error('票价未变化。');
        change = { method, value, label: '票价', before: `${show.price} ETH`, after: `${formatEther(value)} ETH` };
      } else if (method === 'setStakeRequirement') {
        const value = ethInput(stake, true);
        if (value > 0n && value < shop.floor) throw new Error(`非零预存门槛至少为 ${formatEther(shop.floor)} ETH。`);
        if (value === show.minStake) throw new Error('预存门槛未变化。');
        change = { method, value, label: '预存门槛', before: `${show.stake} ETH`, after: value === 0n ? '0 ETH（关闭门槛）' : `${formatEther(value)} ETH` };
      } else {
        change = { method, value: policy, label: '转售策略', before: show.policy, after: POLICIES[policy] };
      }
      setError(''); setConfirmation(change);
    } catch (e) { setConfirmation(null); setError((e as Error).message); }
  };
  const save = () => {
    if (!confirmation || disabled) return;
    const change = confirmation; setConfirmation(null);
    void shop.send(`修改 ${show.name} · ${change.label}`, change.method, [BigInt(show.id), change.value]);
  };
  return <View style={p.stack}>
    <Text style={p.label}>编辑开售前规则</Text>
    <Text style={p.small}>每次保存只修改一项，并单独确认一笔交易。首次开售后，以下三项规则永久冻结。</Text>
    <Field label="新票价 ETH" value={price} editable={!disabled} onChange={value => { setPrice(value); changed(); }} />
    <Action secondary label="保存票价" disabled={disabled || price === show.price} onPress={() => review('setPrice')} />
    <Text style={p.label}>新转售策略</Text>
    <View style={p.row}>{POLICIES.map((label, i) => <Action key={label} secondary={policy !== i} disabled={disabled} label={`${policy === i ? '● ' : ''}${label}`} onPress={() => { setPolicy(i); changed(); }} />)}</View>
    <Text style={p.small}>{POLICY_COPY[POLICIES[policy]]}</Text>
    <Action secondary label="保存转售策略" disabled={disabled || POLICIES[policy] === show.policy} onPress={() => review('setResalePolicy')} />
    <Field label="新预存门槛 ETH（0 为关闭）" value={stake} editable={!disabled} onChange={value => { setStake(value); changed(); }} />
    <Text style={p.small}>非零门槛至少 {formatEther(shop.floor)} ETH；预存冷却 {shop.cooldown.toString()} 秒。保证金可取回，不抵扣票款。</Text>
    <Action secondary label="保存预存门槛" disabled={disabled || stake === show.stake} onPress={() => review('setStakeRequirement')} />
    {!!error && <Text accessibilityRole="alert" style={p.notice}>{error}</Text>}
    {confirmation && <View style={p.notice}>
      <Text style={p.label}>确认修改 · Show #{show.id} · {show.name}</Text>
      <Text style={p.copy}>{confirmation.label}：{confirmation.before} → {confirmation.after}</Text>
      <Text style={p.small}>仅修改以上一项，另付 Sepolia 测试 gas。交易前合约会再次检查权限与冻结状态。</Text>
      <Action label="确认修改并打开 MetaMask" disabled={disabled} onPress={save} />
      <Action secondary label="取消修改" onPress={() => setConfirmation(null)} />
    </View>}
  </View>;
}
