import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  actions?: ReactNode
}

// Page title (the page's only <h1>) with optional controls on the right.
export default function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
    >
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      {actions && <Box>{actions}</Box>}
    </Stack>
  )
}
