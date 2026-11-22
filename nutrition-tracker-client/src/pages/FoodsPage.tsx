import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'

import FoodForm from '../components/FoodForm.tsx'
import FoodTable from '../components/FoodTable.tsx'
import { useFoods } from '../hooks/useFoods.ts'

export default function FoodsPage() {
  const { foods, loading, error, addFood, removeFood } = useFoods()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = (id: number) => {
    setDeleteError(null)
    removeFood(id).catch((err: unknown) => {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete food')
    })
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add a food
          </Typography>
          <FoodForm onSubmit={addFood} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Foods
          </Typography>

          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <FoodTable foods={foods} onDelete={handleDelete} />
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
