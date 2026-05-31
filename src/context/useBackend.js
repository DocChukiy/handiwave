import { useContext } from 'react'
import { BackendContext } from './backendContext.js'

export function useBackend() {
  const backend = useContext(BackendContext)

  if (!backend) {
    throw new Error('useBackend must be used inside BackendProvider')
  }

  return backend
}
