import DeleteIcon from '@mui/icons-material/Delete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { unitLabel, type Food } from '../types/food.ts'

interface FoodTableProps {
  foods: Food[]
  onDelete: (food: Food) => void
}

const grams = (value: number) => `${value} g`

// One page of foods with their picture and nutrition per serving.
export default function FoodTable({ foods, onDelete }: FoodTableProps) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Food</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="right">Serving</TableCell>
            <TableCell align="right">Energy</TableCell>
            <TableCell align="right">Protein</TableCell>
            <TableCell align="right">Carbs</TableCell>
            <TableCell align="right">Fat</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {foods.map((food) => (
            <TableRow key={food.id} hover>
              {/* The food's name is the row header, so screen readers announce it for each cell */}
              <TableCell component="th" scope="row">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar variant="rounded" src={food.pictureUrl} alt={food.name} sx={{ width: 44, height: 44 }} />
                  <Box>
                    <Typography variant="body2">{food.name}</Typography>
                    {food.brand && (
                      <Typography variant="caption" color="text.secondary">
                        {food.brand}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{food.type === 'food' ? 'Food' : 'Beverage'}</TableCell>
              <TableCell align="right">
                {food.servingSize} {unitLabel(food.servingUnit)}
              </TableCell>
              <TableCell align="right">{food.energyInKcal} kcal</TableCell>
              <TableCell align="right">{grams(food.proteinInGram)}</TableCell>
              <TableCell align="right">{grams(food.carbsInGram)}</TableCell>
              <TableCell align="right">{grams(food.fatInGram)}</TableCell>
              <TableCell align="right">
                <Tooltip title="Delete">
                  <IconButton aria-label={`Delete ${food.name}`} onClick={() => onDelete(food)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
