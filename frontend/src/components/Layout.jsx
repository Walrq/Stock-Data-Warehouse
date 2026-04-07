import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, PlusCircle, History, Search, SlidersHorizontal } from 'lucide-react';

const Layout = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Research', path: '/research', icon: Search },
    { name: 'Screener', path: '/screener', icon: SlidersHorizontal }, // [SCREENER FEATURE]
    { name: 'Add Company', path: '/add-company', icon: PlusCircle },
    { name: 'Trades', path: '/trades', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-dark-bg text-dark-text">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-dark-card border-r border-dark-bor md:fixed md:h-screen flex flex-col transition-all duration-300">
            <div className="p-6 flex items-center gap-3 border-b border-dark-bor">
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">Stock DWH</h1>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                                isActive 
                                ? 'bg-primary/10 text-primary' 
                                : 'text-dark-muted hover:text-white hover:bg-dark-bor/50'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>
            
            <div className="p-4 border-t border-dark-bor text-sm text-dark-muted flex flex-col gap-1 items-center mb-4">
                <span>DBMS Project</span>
                <span>© 2026 Admin</span>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 relative overflow-x-hidden min-h-screen pb-10">
            {/* Topbar equivalent for padding or global search could go here */}
            <div className="p-4 md:p-8 pt-6">
                <Outlet />
            </div>
        </main>
    </div>
  );
};

export default Layout;
