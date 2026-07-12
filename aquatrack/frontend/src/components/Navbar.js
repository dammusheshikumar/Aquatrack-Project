import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <div className="page-shell" style={styles.inner}>
        <Link to="/" style={styles.brand}>
          <span style={styles.dot} />
          AquaTrack
        </Link>
        <div style={styles.links}>
          {!user && (
            <>
              <Link to="/login" style={styles.link}>Log in</Link>
              <Link to="/register" className="btn-primary" style={styles.cta}>Get started</Link>
            </>
          )}
          {user && user.role === 'RESIDENT' && (
            <>
              <Link to="/resident" style={styles.link}>Dashboard</Link>
              <button onClick={handleLogout} className="btn-ghost" style={styles.logoutBtn}>Log out</button>
            </>
          )}
          {user && user.role === 'ADMIN' && (
            <>
              <Link to="/admin" style={styles.link}>Overview</Link>
              <Link to="/admin/households" style={styles.link}>Households</Link>
              <Link to="/admin/tariffs" style={styles.link}>Tariffs</Link>
              <Link to="/admin/billing" style={styles.link}>Billing</Link>
              <button onClick={handleLogout} className="btn-ghost" style={styles.logoutBtn}>Log out</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: { borderBottom: '1px solid var(--line)', background: 'rgba(251,250,246,0.9)', backdropFilter: 'blur(6px)', position: 'sticky', top: 0, zIndex: 20 },
  inner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, color: 'var(--ink)' },
  dot: { width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' },
  links: { display: 'flex', alignItems: 'center', gap: 22 },
  link: { fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' },
  cta: { padding: '9px 18px', fontSize: 14 },
  logoutBtn: { padding: '8px 16px', fontSize: 13.5 },
};
