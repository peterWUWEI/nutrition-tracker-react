import CircleIcon from '@mui/icons-material/Circle'
import Chip from '@mui/material/Chip'
import { useEffect, useState } from 'react'

import { ApiError } from '../api/client.ts'
import { getHealth } from '../api/health.ts'

type Status = 'checking' | 'online' | 'database-down' | 'offline'

const labels: Record<Status, string> = {
  checking: 'Checking API…',
  online: 'API & DB online',
  'database-down': 'Database down',
  offline: 'API offline',
}

// Theme palette paths used for the status dot.
const dotColors: Record<Status, string> = {
  checking: 'text.disabled',
  online: 'success.main',
  'database-down': 'warning.main',
  offline: 'error.main',
}

// Shows whether the API server and database are reachable.
export default function ServerStatus() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    const controller = new AbortController()

    getHealth(controller.signal)
      .then(() => setStatus('online'))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setStatus(err instanceof ApiError && err.status === 503 ? 'database-down' : 'offline')
      })

    return () => controller.abort()
  }, [])

  return (
    <Chip
      size="small"
      label={labels[status]}
      icon={<CircleIcon />}
      sx={{
        bgcolor: 'background.paper',
        '& .MuiChip-icon': { color: dotColors[status], fontSize: 12 },
      }}
    />
  )
}
