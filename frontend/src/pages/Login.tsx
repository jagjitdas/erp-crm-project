import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading, error, user } = useAuth();
  const [email, setEmail] = useState('admin@erp.local');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // error is surfaced via AuthContext.error
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>ERP / CRM Login</h1>
        <p className="muted">Wholesale &amp; Distribution Management</p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && <div className="form-error">{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="muted small">
          Demo seed accounts (password: <code>Password123!</code>): admin@erp.local, sales@erp.local,
          warehouse@erp.local, accounts@erp.local
        </p>
      </form>
    </div>
  );
}
