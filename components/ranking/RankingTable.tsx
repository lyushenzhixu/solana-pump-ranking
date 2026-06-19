import ClickableRow from '@/components/ui/ClickableRow'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { RankingRowData } from '@/lib/rankingMerge'

function fmtMc(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}
function fmtVol(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}
function fmtPct(v: number | null): { text: string; cls: 'up' | 'down' | '' } {
  if (v == null) return { text: '—', cls: '' }
  return { text: `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, cls: v > 0 ? 'up' : v < 0 ? 'down' : '' }
}

export default function RankingTable({ rows }: { rows: RankingRowData[] }) {
  if (!rows.length) return <EmptyState title="暂无数据" hint="链上数据稍后同步" />
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--text-3)', fontSize: 11, fontWeight: 400 }}>
            <th style={{ padding: '9px 14px', textAlign: 'left', width: 32 }}>#</th>
            <th style={{ padding: '9px 14px', textAlign: 'left' }}>名称</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>市值</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h 量</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>持有人</th>
            <th style={{ padding: '9px 14px', textAlign: 'left' }}>信号</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct = fmtPct(row.pct24h)
            return (
              <ClickableRow key={row.ca ?? idx} href={row.ca ? `/token/${row.ca}` : null}
                style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <td className="num" style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{row.name}</td>
                <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{fmtMc(row.marketCap)}</td>
                <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{fmtVol(row.vol24h)}</td>
                <td className={`num ${pct.cls}`} style={{ padding: '10px 14px', textAlign: 'right' }}>{pct.text}</td>
                <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{row.holders != null ? row.holders.toLocaleString() : '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {row.badges.map((b, i) => <Badge key={i} kind={b.kind}>{b.label}</Badge>)}
                  </div>
                </td>
              </ClickableRow>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
