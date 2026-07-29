import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Challan, PaginationMeta } from '../types';

export default function Challans() {
  const [searchParams] = useSearchParams();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/challans', { params: { status: status || undefined, page, pageSize: 10 } });
      setChallans(res.data.data);
      setMeta(res.data.meta);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sales Challans</h1>
        <Link className="btn btn-primary" to="/challans/new">
          + New Challan
        </Link>
      </div>

      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Total Qty</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {challans.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                  </td>
                  <td>{(c.customer as any)?.name || '-'}</td>
                  <td>{c.totalQuantity}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {challans.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No challans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {meta.page} of {meta.totalPages}
              </span>
              <button className="btn" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
