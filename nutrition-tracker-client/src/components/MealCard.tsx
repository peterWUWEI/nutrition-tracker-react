import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useId } from 'react'

import { mealTitleLabels, type Meal } from '../types/meal.ts'
import { formatTime } from '../utils/date.ts'
import { formatAmount, itemEnergy, mealEnergy } from '../utils/nutrition.ts'

interface MealCardProps {
  meal: Meal
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

// One meal: its type, time, total energy and the foods eaten.
export default function MealCard({ meal, canEdit, onEdit, onDelete }: MealCardProps) {
  const headingId = useId()
  const title = mealTitleLabels[meal.title]
  const time = formatTime(meal.eatenAt)

  return (
    // A <section> labelled by its heading, so screen readers (and tests) can find "the Breakfast card".
    <Card component="section" aria-labelledby={headingId}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography id={headingId} variant="h6" component="h2">
            {title}
          </Typography>
          <Typography color="text.secondary">{time}</Typography>
          <Typography sx={{ flexGrow: 1, textAlign: 'right', fontWeight: 'bold' }}>{mealEnergy(meal)} kcal</Typography>
          {canEdit && (
            <>
              <Tooltip title="Edit">
                <IconButton aria-label={`Edit ${title} at ${time}`} onClick={onEdit} size="small">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton aria-label={`Delete ${title} at ${time}`} onClick={onDelete} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>

        {/* Fixed column widths so the columns line up across meal cards */}
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell>Food</TableCell>
              <TableCell align="right" sx={{ width: '18%' }}>
                Servings
              </TableCell>
              <TableCell align="right" sx={{ width: '18%' }}>
                Amount
              </TableCell>
              <TableCell align="right" sx={{ width: '18%' }}>
                Energy
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meal.items.map((item) => (
              <TableRow key={item.foodId}>
                <TableCell>{item.food.name}</TableCell>
                <TableCell align="right">{item.quantityConsumed}</TableCell>
                <TableCell align="right">{formatAmount(item)}</TableCell>
                <TableCell align="right">{Math.round(itemEnergy(item))} kcal</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
