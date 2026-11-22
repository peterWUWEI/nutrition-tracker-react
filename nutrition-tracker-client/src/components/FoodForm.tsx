import AddIcon from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useState, type ChangeEvent, type FormEvent } from 'react'

import type { NewFood } from '../types/food.ts'

interface FoodFormProps {
  onSubmit: (food: NewFood) => Promise<void>
}

// Form inputs hold strings; we convert to numbers on submit.
const emptyForm = { name: '', calories: '', protein: '', carbs: '', fat: '' }
type FormValues = typeof emptyForm

const numberFields: { key: Exclude<keyof FormValues, 'name'>; label: string }[] = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
]

export default function FoodForm({ onSubmit }: FoodFormProps) {
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (key: keyof FormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: values.name.trim(),
        calories: Math.round(Number(values.calories)),
        protein: Number(values.protein || 0),
        carbs: Number(values.carbs || 0),
        fat: Number(values.fat || 0),
      })
      setValues(emptyForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save food')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Food name"
          value={values.name}
          onChange={handleChange('name')}
          required
          fullWidth
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {numberFields.map(({ key, label }) => (
            <TextField
              key={key}
              label={label}
              type="number"
              value={values[key]}
              onChange={handleChange(key)}
              required={key === 'calories'}
              fullWidth
              slotProps={{ htmlInput: { min: 0, step: key === 'calories' ? 1 : 0.1 } }}
            />
          ))}
        </Stack>

        <Box>
          <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={submitting}>
            {submitting ? 'Saving…' : 'Add food'}
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
