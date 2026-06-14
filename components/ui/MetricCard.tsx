import React from 'react'
import CountUp from '@/components/ui/CountUp'

export interface MetricCardProps {
  label: string
  value: string
  sub?: string
  tone?: 'pos' | 'neg' | 'muted'
  /** When provided, renders an animated CountUp instead of the static value string */
  countUpValue?: number
}

/**
 * 哑光指标卡 — 哑光终端设计系统
 * surface-1 底 + line-soft 边框 + 22px 等宽 tabular 数字
 */
export default function MetricCard({ label, value, sub, tone, countUpValue }: MetricCardProps) {
  const subColor: React.CSSProperties['color'] =
    tone === 'pos'
      ? 'var(--up)'
      : tone === 'neg'
      ? 'var(--down)'
      : 'var(--text-3)'

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
      }}
    >
      {/* label */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-2)',
          marginBottom: 7,
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>

      {/* value — 等宽 tabular */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 500,
          fontFamily: 'var(--mono)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
        }}
      >
        {countUpValue !== undefined ? (
          <CountUp value={countUpValue} durationMs={900} decimals={0} />
        ) : (
          value
        )}
      </div>

      {/* sub */}
      {sub !== undefined && (
        <div
          style={{
            fontSize: 12,
            marginTop: 3,
            color: subColor,
            fontFamily: 'var(--mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
