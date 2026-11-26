import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { brand } from '../brand';
import { useAuth } from '../lib/auth';
import { api } from '../api/client';
import { ROLE_LABEL } from '../lib/format';
import {  } from './ui';
import { cx } from '../lib/styles';

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src={brand.logo} alt="" className={cx('h-7 w-7 rounded-md', light && 'ring-1 ring-white/30')} />
      <span className={cx('text-[15px] font-semibold tracking-tight', light ? 'text-white' : 'text-navy')}>
        {brand.company} <span className={light ? 'text-white/70' : 'text-slate-500'}>{brand.shortName}</span>
      </span>
    </span>
  );
}

export function Layout() {
  const { user, signOut, can } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }: { isActive: boolean }) => cx('rounded-md px-3 py-1.5 text-sm font-medium', isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white');
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-navy">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link to="/">
            <Logo light />
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={link}>
              Projects
            </NavLink>
            {can('ADMIN') && (
              <NavLink to="/users" className={link}>
                People
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-white/90">
            {api.mock && <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">Sample data</span>}
            {user && (
              <span className="hidden sm:block">
                {user.name} <span className="text-white/60">({ROLE_LABEL[user.role]})</span>
              </span>
            )}
            <button
              className="rounded p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              title="Sign out"
              onClick={() => {
                signOut();
                nav('/login');
              }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
