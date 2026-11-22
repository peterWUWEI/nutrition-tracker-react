import BarChartIcon from '@mui/icons-material/BarChart'
import FastfoodIcon from '@mui/icons-material/Fastfood'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import SummarizeIcon from '@mui/icons-material/Summarize'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import type { ReactNode } from 'react'

export interface NavItem {
  label: string
  path: string
  icon: ReactNode
}

// The sections shown in the side menu, in order.
export const navItems: NavItem[] = [
  { label: 'Charts', path: '/charts', icon: <BarChartIcon /> },
  { label: 'Set targets', path: '/targets', icon: <TrackChangesIcon /> },
  { label: 'Food management', path: '/foods', icon: <FastfoodIcon /> },
  { label: 'Meal management', path: '/meals', icon: <RestaurantMenuIcon /> },
  { label: 'Nutrition report', path: '/nutrition-report', icon: <SummarizeIcon /> },
]
