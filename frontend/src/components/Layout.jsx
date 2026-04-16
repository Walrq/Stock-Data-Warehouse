import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, PlusCircle, Search, SlidersHorizontal, BarChart2 } from 'lucide-react';

const Layout = () => {
  const navItems = [
    { name: 'Dashboard',  path: '/',          icon: LayoutDashboard },
    { name: 'Research',   path: '/research',  icon: Search },
    { name: 'Screener',   path: '/screener',  icon: SlidersHorizontal },
    { name: 'Analytics',  path: '/analytics', icon: BarChart2 },
    { name: 'Add Company', path: '/add-company', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center gap-8 h-16">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 bg-primary/15 rounded-lg text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Big Bull</span>
          </div>

          {/* Tab Nav */}
          <nav className="flex items-center gap-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
