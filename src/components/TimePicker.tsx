'use client'

import { useState } from 'react'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

type TimeVal = { hour: number; minute: number; isPM: boolean }

function toH24({ hour, minute, isPM }: TimeVal) {
  const h = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour)
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseH24(val?: string): TimeVal {
  if (!val) return { hour: 9, minute: 0, isPM: false }
  const [h, m] = val.split(':').map(Number)
  if (isNaN(h)) return { hour: 9, minute: 0, isPM: false }
  const isPM = h >= 12
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  const minute = MINUTES.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a)
  return { hour, minute, isPM }
}

function TimeRow({ val, onChange }: { val: TimeVal; onChange: (v: TimeVal) => void }) {
  return (
    <div className="board-v2-time-row">
      <div className="board-v2-ampm-toggle">
        <button type="button"
          className={`board-v2-ampm-btn${!val.isPM ? ' is-active' : ''}`}
          onClick={() => onChange({ ...val, isPM: false })}>오전</button>
        <button type="button"
          className={`board-v2-ampm-btn${val.isPM ? ' is-active' : ''}`}
          onClick={() => onChange({ ...val, isPM: true })}>오후</button>
      </div>
      <div className="board-v2-time-hm">
        <select className="board-v2-time-sel" value={val.hour}
          onChange={e => onChange({ ...val, hour: +e.target.value })}>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="board-v2-timepicker-colon">:</span>
        <select className="board-v2-time-sel" value={val.minute}
          onChange={e => onChange({ ...val, minute: +e.target.value })}>
          {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function TimePicker({
  name, endName, defaultValue, defaultEndValue,
}: {
  name: string
  endName?: string
  defaultValue?: string
  defaultEndValue?: string
}) {
  const [enabled, setEnabled] = useState(!!defaultValue)
  const [start, setStart] = useState<TimeVal>(() => parseH24(defaultValue))
  const [end, setEnd]     = useState<TimeVal>(() => parseH24(defaultEndValue ?? undefined))
  const [hasEnd, setHasEnd] = useState(!!defaultEndValue)

  function toggle() {
    setEnabled(v => !v)
    setHasEnd(false)
  }

  return (
    <div className="board-v2-timepicker">
      <input type="hidden" name={name} value={enabled ? toH24(start) : ''} />
      {endName && <input type="hidden" name={endName} value={enabled && hasEnd ? toH24(end) : ''} />}

      <label className="board-v2-timepicker-check">
        <span
          role="checkbox"
          aria-checked={enabled}
          tabIndex={0}
          className={`board-v2-timepicker-toggle${enabled ? ' is-on' : ''}`}
          onClick={toggle}
          onKeyDown={e => e.key === ' ' && toggle()}
        />
        <span className="board-v2-timepicker-label">시간 설정</span>
      </label>

      {enabled && (
        <div className="board-v2-timepicker-body">
          <TimeRow val={start} onChange={setStart} />
          {endName && (
            hasEnd ? (
              <div className="board-v2-time-end-row">
                <span className="board-v2-time-tilde">~</span>
                <TimeRow val={end} onChange={setEnd} />
                <button type="button" className="board-v2-time-end-remove"
                  onClick={() => setHasEnd(false)}>×</button>
              </div>
            ) : (
              <button type="button" className="board-v2-time-end-add"
                onClick={() => setHasEnd(true)}>+ 종료 시간</button>
            )
          )}
        </div>
      )}
    </div>
  )
}
