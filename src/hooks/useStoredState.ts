import { useEffect, useState } from 'react'

// Each persisted slice keeps its existing key and lazy initializer.
export function useStoredState<T>(key: string, initialize: () => T) {
  const [value, setValue] = useState<T>(initialize)

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
