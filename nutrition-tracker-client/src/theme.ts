import { createTheme } from '@mui/material/styles'

// Central place for colors, typography and component defaults.
// See https://mui.com/material-ui/customization/theming/
export const theme = createTheme({
  palette: {
    primary: { main: '#2e7d32' }, // green
    secondary: { main: '#f57c00' }, // orange
    background: { default: '#f5f7f5' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
})
