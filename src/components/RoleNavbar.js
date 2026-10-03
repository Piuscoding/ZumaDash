import React from 'react';
import { useAuth } from '../context/AuthContext';
import CustomerNavbar from './CustomerNavbar';
import RiderNavbar from './RiderNavbar';
import AdminNavbar from './AdminNavbar';
import PublicNavbar from './PublicNavbar';

const RoleNavbar = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <PublicNavbar />;
  if (user?.role === 'admin') return <AdminNavbar />;
  if (user?.role === 'rider') return <RiderNavbar />;
  return <CustomerNavbar />;
};

export default RoleNavbar;
