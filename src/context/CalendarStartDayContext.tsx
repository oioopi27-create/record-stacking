'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type Ctx = { startDay: 0 | 1; setStartDay: (v: 0 | 1) => void }

const CalendarStartDayCtx = createContext<Ctx>({ startDay: 1, setStartDay: () => {} })

export function CalendarStartDayProvider({ initial, children }: { initial: 0 | 1; children: ReactNode }) {
  const [startDay, setStartDay] = useState<0 | 1>(initial)
  return (
    <CalendarStartDayCtx.Provider value={{ startDay, setStartDay }}>
      {children}
    </CalendarStartDayCtx.Provider>
  )
}

export function useCalendarStartDay() {
  return useContext(CalendarStartDayCtx)
}
