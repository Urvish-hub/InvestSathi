import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  PieChart,
  Clock,
  TrendingUp,
  FileBarChart2,
  Settings,
} from 'lucide-react';

export function BottomNav() {
  const navItems = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/ipos', label: 'IPOs', icon: Layers },
    { to: '/portfolio', label: 'Holdings', icon: PieChart },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/transactions', label: 'History', icon: Clock },
    { to: '/reports', label: 'Reports', icon: FileBarChart2 },
    { to: '/settings', label: 'Profile', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-7 h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all select-none ${isActive
                  ? 'text-emerald-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
