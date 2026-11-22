import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import ConfirmDialog from '../components/ConfirmDialog.tsx'
import MealCard from '../components/MealCard.tsx'
import MealDialog from '../components/MealDialog.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { useMeals } from '../hooks/useMeals.ts'
import { mealTitleLabels, type Meal } from '../types/meal.ts'
import { addDays, formatTime, isValidDateString, toLocalDateString } from '../utils/date.ts'
import { mealsEnergy } from '../utils/nutrition.ts'

// Which dialog is open: adding a meal, editing one, or none.
type MealDialogState = { mode: 'add' } | { mode: 'edit'; meal: Meal } | null

export default function MealsPage() {
  // The day being viewed lives in the URL (?date=YYYY-MM-DD), so it survives a refresh
  // and works with the browser's back button. No date means today.
  const [searchParams, setSearchParams] = useSearchParams()
  const today = toLocalDateString()
  const dateParam = searchParams.get('date')
  const date = dateParam && isValidDateString(dateParam) ? dateParam : today
  const isToday = date === today

  const { meals, loading, error, addMeal, updateMeal, removeMeal } = useMeals(date)
  const [dialog, setDialog] = useState<MealDialogState>(null)
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const goTo = (newDate: string) => {
    setActionError(null)
    setSearchParams(newDate === today ? {} : { date: newDate })
  }

  const confirmDelete = async () => {
    if (!mealToDelete) return
    const meal = mealToDelete
    setMealToDelete(null)
    setActionError(null)
    try {
      await removeMeal(meal.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the meal')
    }
  }

  return (
    <>
      <PageHeader
        title="Meal management"
        actions={
          isToday && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ mode: 'add' })}>
              Add meal
            </Button>
          )
        }
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
        <IconButton aria-label="Previous day" onClick={() => goTo(addDays(date, -1))}>
          <ChevronLeftIcon />
        </IconButton>
        <TextField
          type="date"
          label="Date"
          size="small"
          value={date}
          onChange={(event) => {
            if (isValidDateString(event.target.value)) goTo(event.target.value)
          }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
        />
        <IconButton aria-label="Next day" onClick={() => goTo(addDays(date, 1))} disabled={isToday}>
          <ChevronRightIcon />
        </IconButton>
        <Button onClick={() => goTo(today)} disabled={isToday}>
          Today
        </Button>
      </Stack>

      {!isToday && (
        <Alert severity="info" role="status" sx={{ mb: 2 }}>
          Only today's meals can be changed.
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : meals.length === 0 ? (
        <Typography color="text.secondary">No meals logged for this day.</Typography>
      ) : (
        <Stack spacing={2}>
          <Typography>
            Total energy: <strong>{mealsEnergy(meals)} kcal</strong>
          </Typography>
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              canEdit={isToday}
              onEdit={() => setDialog({ mode: 'edit', meal })}
              onDelete={() => setMealToDelete(meal)}
            />
          ))}
        </Stack>
      )}

      {dialog && (
        <MealDialog
          date={date}
          meal={dialog.mode === 'edit' ? dialog.meal : undefined}
          onClose={() => setDialog(null)}
          onSave={async (input) => {
            if (dialog.mode === 'edit') {
              await updateMeal(dialog.meal.id, input)
            } else {
              await addMeal(input)
            }
            setDialog(null)
          }}
        />
      )}

      {mealToDelete && (
        <ConfirmDialog
          title={`Delete ${mealTitleLabels[mealToDelete.title].toLowerCase()}?`}
          message={`The ${mealTitleLabels[mealToDelete.title].toLowerCase()} at ${formatTime(mealToDelete.eatenAt)} will be removed from your log. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setMealToDelete(null)}
        />
      )}
    </>
  )
}
