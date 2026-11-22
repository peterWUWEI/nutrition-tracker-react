import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

import PageHeader from '../components/PageHeader.tsx'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        There's nothing at this address.
      </Typography>
      <Button component={Link} to="/foods" variant="contained">
        Go to Food management
      </Button>
    </>
  )
}
