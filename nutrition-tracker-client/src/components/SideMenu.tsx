import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import type { Theme } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import { NavLink, useLocation } from 'react-router'

import { navItems } from '../layouts/navItems.tsx'

export const MENU_WIDTH_OPEN = 240
export const MENU_WIDTH_CLOSED = 64

interface SideMenuProps {
  open: boolean
}

// Collapsible side menu: icons + labels when open, icons only (with tooltips) when closed.
export default function SideMenu({ open }: SideMenuProps) {
  const { pathname } = useLocation()
  const width = open ? MENU_WIDTH_OPEN : MENU_WIDTH_CLOSED
  const widthTransition = (theme: Theme) =>
    theme.transitions.create('width', { duration: theme.transitions.duration.shorter })

  return (
    <Drawer
      variant="permanent"
      id="main-menu"
      sx={{
        width,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: widthTransition,
        '& .MuiDrawer-paper': { width, overflowX: 'hidden', transition: widthTransition },
      }}
    >
      {/* Spacer so the menu starts below the fixed app bar */}
      <Toolbar />
      <Box component="nav" aria-label="Main menu">
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <Tooltip title={open ? '' : item.label} placement="right">
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  aria-label={item.label}
                  selected={pathname.startsWith(item.path)}
                  sx={{ minHeight: 48, px: 2.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 0 }}>{item.icon}</ListItemIcon>
                  {open && <ListItemText primary={item.label} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  )
}
