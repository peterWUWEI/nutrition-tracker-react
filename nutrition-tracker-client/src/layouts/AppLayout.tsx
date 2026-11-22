import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Outlet } from 'react-router'

import ServerStatus from '../components/ServerStatus.tsx'
import SideMenu from '../components/SideMenu.tsx'

// The frame around every page: app bar on top, collapsible menu on the left,
// and the current page (the matched child route) rendered by <Outlet />.
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(true)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label={menuOpen ? 'Collapse menu' : 'Expand menu'}
            aria-controls="main-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            sx={{ mr: 2 }}
          >
            {menuOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          <RestaurantIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Nutrition Tracker
          </Typography>
          <ServerStatus />
        </Toolbar>
      </AppBar>

      <SideMenu open={menuOpen} />

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 3 }}>
        <Toolbar />
        <Container maxWidth="md" disableGutters>
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}
