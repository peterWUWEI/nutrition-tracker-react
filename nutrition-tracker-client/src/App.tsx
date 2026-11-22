import RestaurantIcon from '@mui/icons-material/Restaurant'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

import ServerStatus from './components/ServerStatus.tsx'
import FoodsPage from './pages/FoodsPage.tsx'

function App() {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <RestaurantIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Nutrition Tracker
          </Typography>
          <ServerStatus />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <FoodsPage />
      </Container>
    </Box>
  )
}

export default App
