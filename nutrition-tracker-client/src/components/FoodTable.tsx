import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { Food } from '../types/food.ts'

interface FoodTableProps {
  foods: Food[]
  onDelete: (id: number) => void
}

const formatGrams = (value: number) => `${value.toFixed(1)} g`

export default function FoodTable({ foods, onDelete }: FoodTableProps) {
  if (foods.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        No foods yet. Add your first one above.
      </Typography>
    )
  }

  // Derived data: totals are calculated from props on every render,
  // so they never go out of sync with the list (no extra state needed).
  const totals = foods.reduce(
    (sum, food) => ({
      calories: sum.calories + food.calories,
      protein: sum.protein + food.protein,
      carbs: sum.carbs + food.carbs,
      fat: sum.fat + food.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Food</TableCell>
            <TableCell align="right">Calories</TableCell>
            <TableCell align="right">Protein</TableCell>
            <TableCell align="right">Carbs</TableCell>
            <TableCell align="right">Fat</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {foods.map((food) => (
            <TableRow key={food.id} hover>
              <TableCell>{food.name}</TableCell>
              <TableCell align="right">{food.calories} kcal</TableCell>
              <TableCell align="right">{formatGrams(food.protein)}</TableCell>
              <TableCell align="right">{formatGrams(food.carbs)}</TableCell>
              <TableCell align="right">{formatGrams(food.fat)}</TableCell>
              <TableCell align="right">
                <Tooltip title="Delete">
                  <IconButton aria-label={`Delete ${food.name}`} onClick={() => onDelete(food.id)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {totals.calories} kcal
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {formatGrams(totals.protein)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {formatGrams(totals.carbs)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {formatGrams(totals.fat)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}
