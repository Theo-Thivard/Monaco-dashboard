import type { ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function ColorField({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v?: string) => void }) {
  return (
    <div className="field color">
      <span className="field-label">{label}</span>
      <span className="color-row">
        <input type="color" value={value ?? fallback} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <code>{(value ?? fallback).toUpperCase()}</code>
        {value && <button className="link" onClick={() => onChange(undefined)}>défaut</button>}
      </span>
    </div>
  )
}

export function NumberInput({ value, onChange, min, max, step = 1, placeholder }: { value: number | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number; placeholder?: string }) {
  return (
    <input
      type="number" value={value ?? ''} min={min} max={max} step={step} placeholder={placeholder}
      onChange={(e) => {
        if (e.target.value === '') return onChange(undefined)
        const v = Number(e.target.value)
        if (Number.isFinite(v)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)))
      }}
    />
  )
}

export function Drawer({ title, onClose, children, side = 'right', tabs }: { title: string; onClose: () => void; children: ReactNode; side?: 'left' | 'right'; tabs?: ReactNode }) {
  return (
    <aside className={'drawer ' + side} role="complementary" aria-label={title}>
      <div className="drawer-head"><h3>{title}</h3><button onClick={onClose} aria-label="Fermer">✕</button></div>
      {tabs}
      <div className="drawer-body">{children}</div>
    </aside>
  )
}
