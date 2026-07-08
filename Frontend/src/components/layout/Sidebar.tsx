import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import {
  HomeIcon, ShoppingCartIcon, ClipboardDocumentListIcon,
  CubeIcon, TagIcon, UsersIcon, TicketIcon,
  ChartBarIcon, SquaresPlusIcon, UserGroupIcon,
  ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'
import type { FC } from 'react'
import LogoImg from '@/assets/Logo.jpeg'

interface NavItem {
  label: string
  to: string
  icon: FC<{ className?: string }>
  roles?: string[]
}

const nav: NavItem[] = [
  { label: 'Dashboard',  to: '/dashboard',  icon: HomeIcon },
  { label: 'Ventas',     to: '/ventas',     icon: ShoppingCartIcon },
  { label: 'Pedidos',    to: '/pedidos',    icon: ClipboardDocumentListIcon },
  { label: 'Preparación', to: '/cocina',   icon: ({ className }) => <span className={className}>🍦</span> },
  { label: 'Inventario', to: '/inventario', icon: CubeIcon },
  { label: 'Productos',  to: '/productos',  icon: TagIcon, roles: ['admin'] },
  { label: 'Categorías', to: '/categorias', icon: SquaresPlusIcon, roles: ['admin'] },
  { label: 'Toppings',   to: '/toppings',   icon: SquaresPlusIcon, roles: ['admin'] },
  { label: 'Clientes',   to: '/clientes',   icon: UserGroupIcon },
  { label: 'Promociones',to: '/promociones',icon: TicketIcon, roles: ['admin'] },
  { label: 'Reportes',   to: '/reportes',   icon: ChartBarIcon, roles: ['admin'] },
  { label: 'Usuarios',   to: '/usuarios',   icon: UsersIcon, roles: ['admin'] },
]

function isAdminRole(role?: string): boolean {
  if (!role) return false
  const normalized = role.toLowerCase()
  return normalized === 'admin' || normalized.includes('administrador')
}

export const Sidebar: FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { user } = useAuthStore()

  const visible = nav.filter(item => {
    if (!item.roles) return true
    if (isAdminRole(user?.role)) return true
    return item.roles.includes(user?.role ?? '')
  })

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-gray-900 text-white transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-800 px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-transparent shrink-0">
            <img src={LogoImg} alt="Logo" className="h-full w-full object-cover" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-white text-sm tracking-wide whitespace-nowrap">
              CandyLand
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        <ul className="space-y-0.5 px-2">
          {visible.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                title={item.label}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-gray-800 p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRightIcon className="h-4 w-4" />
            : <><ChevronLeftIcon className="h-4 w-4" />{!sidebarCollapsed && <span className="ml-2 text-xs">Colapsar</span>}</>
          }
        </button>
      </div>
    </aside>
  )
}
