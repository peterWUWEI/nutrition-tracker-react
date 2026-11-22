import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog.tsx'
import FoodFormDialog from '../components/FoodFormDialog.tsx'
import FoodTable from '../components/FoodTable.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { useDebouncedValue } from '../hooks/useDebouncedValue.ts'
import { useFoods } from '../hooks/useFoods.ts'
import type { Food } from '../types/food.ts'

export default function FoodsPage() {
  // MUI's TablePagination counts pages from 0; the API counts from 1.
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const search = useDebouncedValue(searchText.trim(), 300)

  const { foods, totalItems, loading, error, addFood, removeFood } = useFoods({ page: page + 1, pageSize, search })
  const [adding, setAdding] = useState(false)
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const confirmDelete = async () => {
    if (!foodToDelete) return
    const food = foodToDelete
    setFoodToDelete(null)
    setDeleteError(null)
    try {
      await removeFood(food.id)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the food')
    }
  }

  const firstLoad = loading && foods.length === 0 && !error

  return (
    <>
      <PageHeader
        title="Food management"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)}>
            Add food
          </Button>
        }
      />

      <TextField
        type="search"
        label="Search foods"
        size="small"
        value={searchText}
        onChange={(event) => {
          setSearchText(event.target.value)
          setPage(0) // new search, start from the first page
        }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {deleteError}
        </Alert>
      )}

      <Card>
        {loading && !firstLoad && <LinearProgress />}
        {firstLoad ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : foods.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3 }}>
            {search ? `No foods match "${search}".` : 'No foods yet. Add your first one.'}
          </Typography>
        ) : (
          <>
            <FoodTable foods={foods} onDelete={setFoodToDelete} />
            <TablePagination
              component="div"
              count={totalItems}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[10, 25, 50]}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(0)
              }}
            />
          </>
        )}
      </Card>

      {adding && (
        <FoodFormDialog
          onClose={() => setAdding(false)}
          onSave={async (food, picture) => {
            await addFood(food, picture)
            setAdding(false)
          }}
        />
      )}

      {foodToDelete && (
        <ConfirmDialog
          title={`Delete ${foodToDelete.name}?`}
          message={`${foodToDelete.name} will be removed from your food list. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setFoodToDelete(null)}
        />
      )}
    </>
  )
}
