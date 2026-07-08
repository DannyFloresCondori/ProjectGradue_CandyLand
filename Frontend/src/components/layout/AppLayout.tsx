import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

export const AppLayout: FC = () => (
  <div className="flex h-screen overflow-hidden bg-gray-50">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Navbar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  </div>
)
