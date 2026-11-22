import { Navigate, type RouteObject } from 'react-router'

import AppLayout from './layouts/AppLayout.tsx'
import ChartsPage from './pages/ChartsPage.tsx'
import FoodsPage from './pages/FoodsPage.tsx'
import MealsPage from './pages/MealsPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import NutritionReportPage from './pages/NutritionReportPage.tsx'
import TargetsPage from './pages/TargetsPage.tsx'

// All pages render inside AppLayout (app bar + side menu).
// The same route list is used by the browser router (App.tsx) and by tests (memory router).
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/foods" replace /> },
      { path: 'charts', element: <ChartsPage /> },
      { path: 'targets', element: <TargetsPage /> },
      { path: 'foods', element: <FoodsPage /> },
      { path: 'meals', element: <MealsPage /> },
      { path: 'nutrition-report', element: <NutritionReportPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
