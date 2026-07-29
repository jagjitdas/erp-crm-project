import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    lowStock: 0,
    draftChallans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [customersRes, productsRes, lowStockRes, challansRes] = await Promise.all([
          api.get('/customers', { params: { pageSize: 1 } }),
          api.get('/products', { params: { pageSize: 1 } }),
          api.get('/products', { params: { lowStock: 'true', pageSize: 100 } }),
          api.get('/challans', { params: { status: 'DRAFT', pageSize: 1 } }),
        ]);
        setStats({
          customers: customersRes.data.meta.total,
          products: productsRes.data.meta.total,
          lowStock: lowStockRes.data.meta.total,
          draftChallans: challansRes.data.meta.total,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page">
      <h1>Welcome, {user?.name}</h1>
      <p className="muted">Here's a quick snapshot of the business today.</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="stat-grid">
          <Link to="/customers" className="stat-card">
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-label">Total Customers</div>
          </Link>
          <Link to="/products" className="stat-card">
            <div className="stat-value">{stats.products}</div>
            <div className="stat-label">Products</div>
          </Link>
          <Link to="/products?lowStock=true" className="stat-card stat-card-warning">
            <div className="stat-value">{stats.lowStock}</div>
            <div className="stat-label">Low Stock Alerts</div>
          </Link>
          <Link to="/challans?status=DRAFT" className="stat-card">
            <div className="stat-value">{stats.draftChallans}</div>
            <div className="stat-label">Draft Challans</div>
          </Link>
        </div>
      )}
    </div>
  );
}
