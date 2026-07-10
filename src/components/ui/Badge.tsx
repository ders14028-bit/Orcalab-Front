import type { ReactNode } from 'react'

type Tone = 'primary' | 'neutral' | 'warning' | 'success' | 'danger' | 'info'

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary-soft text-violet-300',
  neutral: 'bg-surface-hover text-text-secondary',
  warning: 'bg-amber-950 text-amber-300',
  success: 'bg-emerald-950 text-emerald-300',
  danger: 'bg-danger-soft text-red-300',
  info: 'bg-cyan-950 text-cyan-300',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
