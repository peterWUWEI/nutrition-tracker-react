import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useId, useState, type ChangeEvent, type FormEvent } from 'react'

import { unitLabel, type FoodType, type NewFood } from '../types/food.ts'

interface FoodFormDialogProps {
  onClose: () => void
  onSave: (food: NewFood, picture: File) => Promise<void>
}

const ACCEPTED_PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PICTURE_BYTES = 5 * 1024 * 1024 // 5 MB, same limit as the server

// The numeric fields, in the order they appear. Inputs hold text; we convert on save.
const numberFields = {
  servingSize: 'Serving size',
  servingsPerPackage: 'Servings per package',
  energyInKcal: 'Energy (kcal)',
  proteinInGram: 'Protein (g)',
  carbsInGram: 'Carbs (g)',
  fatInGram: 'Fat (g)',
  sodiumInMg: 'Sodium (mg)',
  cholesterolInMg: 'Cholesterol (mg)',
  dietaryFibreInGram: 'Dietary fibre (g)',
} as const
type NumberField = keyof typeof numberFields

const requiredNutrients: NumberField[] = ['energyInKcal', 'proteinInGram', 'carbsInGram', 'fatInGram']
const optionalNutrients: NumberField[] = ['sodiumInMg', 'cholesterolInMg', 'dietaryFibreInGram']

const emptyNumbers = Object.fromEntries(Object.keys(numberFields).map((key) => [key, ''])) as Record<NumberField, string>

// Form for adding a food with all its details and a picture.
// The parent mounts it only while it's open, so its state always starts fresh.
export default function FoodFormDialog({ onClose, onSave }: FoodFormDialogProps) {
  const titleId = useId()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [type, setType] = useState<FoodType>('food')
  const [numbers, setNumbers] = useState(emptyNumbers)
  const [picture, setPicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // The serving unit follows the type: grams for food, millilitres for beverages.
  const servingUnit = type === 'food' ? 'gram' : 'ml'

  const setNumber = (field: NumberField) => (event: ChangeEvent<HTMLInputElement>) => {
    setNumbers((current) => ({ ...current, [field]: event.target.value }))
  }

  const handlePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_PICTURE_TYPES.includes(file.type)) {
      setError('The picture must be a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_PICTURE_BYTES) {
      setError('The picture must be 5 MB or smaller.')
      return
    }
    setError(null)
    setPicture(file)
    // Read the file in the browser to show a preview before uploading.
    const reader = new FileReader()
    reader.onload = () => setPreviewUrl(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  // Returns the first problem with the form, or null when it can be saved.
  const findProblem = (): string | null => {
    const filled = (field: NumberField) => numbers[field].trim() !== ''
    const value = (field: NumberField) => Number(numbers[field])
    const nutrients = [...requiredNutrients, ...optionalNutrients].filter(filled)

    if (!name.trim()) return 'Enter a name.'
    if (!(value('servingSize') > 0)) return 'Serving size must be more than 0.'
    if (!requiredNutrients.every(filled)) return 'Enter energy, protein, carbs and fat.'
    if ([...nutrients, 'servingsPerPackage' as const].some((field) => filled(field) && Number.isNaN(value(field)))) {
      return 'Use numbers only.'
    }
    if (nutrients.some((field) => value(field) < 0)) return "Nutrition values can't be negative."
    if (filled('servingsPerPackage') && !(value('servingsPerPackage') > 0)) {
      return 'Servings per package must be more than 0.'
    }
    if (!picture) return 'Choose a picture.'
    return null
  }

  // Builds the request: required fields always, optional ones only when filled in.
  const toNewFood = (): NewFood => {
    const food: NewFood = {
      name: name.trim(),
      type,
      servingSize: Number(numbers.servingSize),
      servingUnit,
      energyInKcal: Number(numbers.energyInKcal),
      proteinInGram: Number(numbers.proteinInGram),
      carbsInGram: Number(numbers.carbsInGram),
      fatInGram: Number(numbers.fatInGram),
    }
    for (const field of ['servingsPerPackage', ...optionalNutrients] as const) {
      if (numbers[field].trim() !== '') {
        food[field] = Number(numbers[field])
      }
    }
    if (brand.trim()) {
      food.brand = brand.trim()
    }
    return food
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const problem = findProblem()
    if (problem || !picture) {
      setError(problem)
      return
    }

    setError(null)
    setSaving(true)
    try {
      await onSave(toNewFood(), picture)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the food')
    } finally {
      setSaving(false)
    }
  }

  const numberInput = (field: NumberField, options: { required?: boolean; unit?: string } = {}) => (
    <TextField
      key={field}
      type="number"
      label={numberFields[field]}
      value={numbers[field]}
      onChange={setNumber(field)}
      required={options.required}
      fullWidth
      slotProps={{
        htmlInput: { min: 0, step: 'any' },
        input: options.unit ? { endAdornment: <InputAdornment position="end">{options.unit}</InputAdornment> } : undefined,
      }}
    />
  )

  const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' } }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId}>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle id={titleId}>Add food</DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box sx={grid}>
              <TextField
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                sx={{ gridColumn: { sm: 'span 2' } }}
              />
              <TextField
                label="Brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                sx={{ gridColumn: { sm: 'span 2' } }}
              />
              <TextField
                select
                label="Type"
                value={type}
                onChange={(event) => setType(event.target.value as FoodType)}
                required
              >
                <MenuItem value="food">Food</MenuItem>
                <MenuItem value="beverage">Beverage</MenuItem>
              </TextField>
              {numberInput('servingSize', { required: true, unit: unitLabel(servingUnit) })}
              {numberInput('servingsPerPackage')}
            </Box>

            <Typography variant="subtitle2" color="text.secondary">
              Nutrition per serving
            </Typography>
            <Box sx={grid}>
              {requiredNutrients.map((field) => numberInput(field, { required: true }))}
              {optionalNutrients.map((field) => numberInput(field))}
            </Box>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {picture ? (
                  <Box
                    component="img"
                    alt="Picture preview"
                    src={previewUrl ?? undefined}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <PhotoCameraIcon color="disabled" />
                )}
              </Box>
              <Box>
                <Button component="label" variant="outlined" startIcon={<PhotoCameraIcon />}>
                  {picture ? 'Change picture' : 'Choose picture'} *
                  {/* Visually hidden file input; the button is its visible label */}
                  <Box
                    component="input"
                    type="file"
                    aria-label="Picture"
                    accept={ACCEPTED_PICTURE_TYPES.join(',')}
                    onChange={handlePictureChange}
                    sx={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {picture ? picture.name : 'JPEG, PNG or WebP, up to 5 MB'}
                </Typography>
              </Box>
            </Stack>
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
