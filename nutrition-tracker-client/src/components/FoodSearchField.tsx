import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { searchFoods } from '../api/foods.ts'
import type { FoodSummary } from '../types/food.ts'

interface FoodSearchFieldProps {
  value: FoodSummary | null
  onChange: (food: FoodSummary | null) => void
}

const unitLabel = (food: FoodSummary) => (food.servingUnit === 'gram' ? 'g' : 'ml')

// A search box that asks the server for foods matching what the user types.
export default function FoodSearchField({ value, onChange }: FoodSearchFieldProps) {
  const [inputValue, setInputValue] = useState(value?.name ?? '')
  const [options, setOptions] = useState<FoodSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const search = inputValue.trim()
    // The text already shows the chosen food: nothing new to search for.
    if (value && search === value.name) {
      return
    }

    // Wait until the user pauses typing (300 ms) before searching, and cancel
    // the previous search when the text changes again.
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      searchFoods(search, controller.signal)
        .then((foods) => setOptions(foods))
        .catch(() => {
          if (!controller.signal.aborted) setOptions([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [inputValue, value])

  // Keep the chosen food among the options so the field can display it.
  const allOptions = value && !options.some((food) => food.id === value.id) ? [value, ...options] : options

  return (
    <Autocomplete
      value={value}
      onChange={(_event, food) => onChange(food)}
      inputValue={inputValue}
      onInputChange={(_event, text) => setInputValue(text)}
      options={allOptions}
      filterOptions={(foods) => foods} // the server already filtered them
      getOptionLabel={(food) => food.name}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      loading={loading}
      noOptionsText="No matching foods"
      sx={{ flexGrow: 1 }}
      renderOption={(props, food) => {
        const { key, ...optionProps } = props
        return (
          <Box component="li" key={key} {...optionProps}>
            <Box>
              <Typography>{food.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {food.servingSize} {unitLabel(food)} · {food.energyInKcal} kcal per serving
              </Typography>
            </Box>
          </Box>
        )
      }}
      renderInput={(params) => <TextField {...params} label="Food" />}
    />
  )
}
