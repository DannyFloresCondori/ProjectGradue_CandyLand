import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { PrivateRoute } from './PrivateRoute'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { ToppingsPage } from '@/pages/ToppingsPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { SalesPage } from '@/pages/SalesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { PromotionsPage } from '@/pages/PromotionsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { UsersPage } from '@/pages/UsersPage'
import { KitchenPage } from '@/pages/KitchenPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard',  element: <DashboardPage /> },
          { path: '/ventas',     element: <SalesPage /> },
          { path: '/pedidos',    element: <OrdersPage /> },
          { path: '/cocina',     element: <KitchenPage /> },
          { path: '/inventario', element: <InventoryPage /> },
          { path: '/productos',  element: <ProductsPage /> },
          { path: '/categorias', element: <CategoriesPage /> },
          { path: '/toppings',   element: <ToppingsPage /> },
          { path: '/clientes',   element: <CustomersPage /> },
          { path: '/promociones',element: <PromotionsPage /> },
          { path: '/reportes',   element: <ReportsPage /> },
          { path: '/usuarios',   element: <UsersPage /> },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
])
