import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useId, useRef, useState, type FormEvent } from 'react'

import type { FoodSummary } from '../types/food.ts'
import { MEAL_TITLES, mealTitleLabels, type Meal, type MealInput, type MealTitle } from '../types/meal.ts'
import { combineDateAndTime, formatTime, toLocalTimeString } from '../utils/date.ts'
import FoodSearchField from './FoodSearchField.tsx'

interface MealDialogProps {
  date: string // the day the meal belongs to (YYYY-MM-DD)
  meal?: Meal // given when editing an existing meal
  onClose: () => void
  onSave: (input: MealInput) => Promise<void>
}

// One food row in the form. `key` keeps React's list rendering stable when rows are removed.
interface ItemRow {
  key: number
  food: FoodSummary | null
  servings: string
}

// Form for adding a meal, or editing one when `meal` is given.
// The parent mounts it only while it's open, so its state always starts fresh.
export default function MealDialog({ date, meal, onClose, onSave }: MealDialogProps) {
  const titleId = useId()
  const [title, setTitle] = useState<MealTitle | ''>(meal?.title ?? '')
  const [time, setTime] = useState(meal ? formatTime(meal.eatenAt) : toLocalTimeString())
  const [rows, setRows] = useState<ItemRow[]>(() =>
    meal
      ? meal.items.map((item, index) => ({ key: index, food: item.food, servings: String(item.quantityConsumed) }))
      : [{ key: 0, food: null, servings: '1' }],
  )
  const nextKey = useRef(rows.length)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const updateRow = (key: number, changes: Partial<ItemRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }

  const addRow = () => {
    setRows((current) => [...current, { key: nextKey.current++, food: null, servings: '1' }])
  }

  const removeRow = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  // Returns the first problem with the form, or null when it can be saved.
  const findProblem = (): string | null => {
    if (!title) return 'Choose a meal type.'
    if (rows.some((row) => !row.food)) return 'Choose a food for every row.'
    if (rows.some((row) => !(Number(row.servings) > 0))) return 'Servings must be more than 0.'
    const foodIds = rows.map((row) => row.food?.id)
    if (new Set(foodIds).size !== foodIds.length) return 'Each food can only be added once.'
    if (!/^\d{2}:\d{2}$/.test(time)) return 'Choose a time.'
    if (combineDateAndTime(date, time) > new Date()) return "The time can't be in the future."
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const problem = findProblem()
    if (problem || !title) {
      setError(problem)
      return
    }

    setError(null)
    setSaving(true)
    try {
      await onSave({
        title,
        eatenAt: combineDateAndTime(date, time).toISOString(),
        items: rows.map((row) => ({ foodId: row.food!.id, quantityConsumed: Number(row.servings) })),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the meal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle id={titleId}>{meal ? 'Edit meal' : 'Add meal'}</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Meal"
                value={title}
                onChange={(event) => setTitle(event.target.value as MealTitle)}
                fullWidth
              >
                {MEAL_TITLES.map((mealTitle) => (
                  <MenuItem key={mealTitle} value={mealTitle}>
                    {mealTitleLabels[mealTitle]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="time"
                label="Time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            {rows.map((row, index) => (
              <Stack key={row.key} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <FoodSearchField value={row.food} onChange={(food) => updateRow(row.key, { food })} />
                <TextField
                  type="number"
                  label="Servings"
                  value={row.servings}
                  onChange={(event) => updateRow(row.key, { servings: event.target.value })}
                  sx={{ width: 110, flexShrink: 0 }}
                  slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                />
                <IconButton
                  aria-label={`Remove food ${index + 1}`}
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
            ))}

            <Box>
              <Button startIcon={<AddIcon />} onClick={addRow}>
                Add another food
              </Button>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
