import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FolderKanban, LogOut, Users, type LucideIcon } from 'lucide-react';
import { brand } from '../brand';
import { useAuth } from '../lib/auth';
import { api } from '../api/client';
import { ROLE_LABEL } from '../lib/format';
import { cx } from '../lib/styles';

/** Small VAICS mark with the product name, for places outside the sidebar. */
export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src={brand.logo} alt="" className="round h-7 w-7" />
      <span className={cx('text-[15px] font-semibold tracking-tight', light ? 'text-white' : 'text-deep')}>
        {brand.company} <span className={light ? 'text-white/70' : 'text-slate-500'}>{brand.shortName}</span>
      </span>
    </span>
  );
}

/** Layout copied from the VAICS Change Management System: white sidebar with magenta icons, hero header, white page. */
export function Layout() {
  const { user, signOut, can } = useAuth();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('uat_sidebar') === '1');
  const toggle = () => {
    localStorage.setItem('uat_sidebar', collapsed ? '0' : '1');
    setCollapsed(!collapsed);
  };
  const links: [string, string, LucideIcon][] = [['/', 'Projects', FolderKanban], ...(can('ADMIN') ? [['/users', 'People', Users] as [string, string, LucideIcon]] : [])];

  return (
    <div className="flex h-screen overflow-hidden bg-white text-sm">
      <div className="no-print relative z-20 h-screen shrink-0" style={{ width: collapsed ? 64 : 240, transition: 'width 200ms' }}>
        <aside className="flex h-full flex-col overflow-hidden border-r border-blue-200 bg-white">
          <div className={cx('px-2 pt-2', collapsed ? 'pb-14' : 'pb-2 pr-10')}>
            {collapsed ? (
              <img src={brand.logo} alt="VAICS" className="round mx-auto h-10 w-10" />
            ) : (
              <>
                <img src={brand.logoFull} alt="VAICS" className="h-12 w-[168px] object-contain object-left" />
                <p className="ml-0.5 mt-0.5 truncate font-medium tracking-wide text-ink">{brand.product}</p>
              </>
            )}
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {!collapsed && (
              <div className="mb-1">
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{brand.appName}</p>
                <div className="mx-2 mt-1.5 border-t border-gray-200" />
              </div>
            )}
            {links.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cx('flex items-center font-medium', collapsed ? 'justify-center px-2 py-2.5' : 'gap-2 px-2 py-2', isActive ? 'bg-rail-active text-deep' : 'text-ink hover:bg-gray-50')
                }
              >
                <span className="shrink-0 text-magenta">
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-3">
            {!collapsed && user && (
              <>
                <div className="font-semibold text-ink">{user.name}</div>
                <div className="text-slate-500">{ROLE_LABEL[user.role]}</div>
              </>
            )}
            <button
              onClick={() => {
                signOut();
                nav('/login');
              }}
              className={cx('mt-2 flex items-center gap-2 font-medium text-slate-700 hover:text-deep', collapsed && 'mx-auto')}
              title="Sign out"
            >
              <LogOut className="h-4 w-4 text-magenta" />
              {!collapsed && 'Sign out'}
            </button>
          </div>
        </aside>
        <button
          onClick={toggle}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className={cx(
            'round absolute z-30 flex h-9 w-9 items-center justify-center border border-gray-300 bg-white shadow-sm hover:bg-gray-50',
            collapsed ? 'left-1/2 top-16 -translate-x-1/2' : 'right-0 top-8 -translate-y-1/2 translate-x-1/2',
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="no-print relative w-full shrink-0 overflow-hidden" style={{ minHeight: 120 }}>
          <img src={brand.hero} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
          <div className="relative z-10 flex min-h-[120px] flex-wrap items-start justify-between gap-4 px-6 py-5 sm:px-8">
            {user && (
              <div>
                <div className="text-[18px] font-semibold text-slate-900">{user.name}</div>
                <div className="mt-2 space-y-0.5 text-slate-500">
                  <p>Email: {user.email}</p>
                  <p>Active Role: {ROLE_LABEL[user.role]}</p>
                </div>
              </div>
            )}
            {api.mock && <span className="border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Sample data</span>}
          </div>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
