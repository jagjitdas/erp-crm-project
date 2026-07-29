import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Challan } from '../types';

export default function ChallanDetail() {
  const { id } = useParams();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get(`/challans/${id}`);
    setChallan(res.data.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/challans/${id}/confirm`);
      load();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to confirm challan');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this challan? If it was confirmed, stock will be restored.')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/challans/${id}/cancel`);
      load();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to cancel challan');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !challan) return <div className="page">Loading...</div>;

  const total = challan.items.reduce((sum, it) => sum + Number(it.lineTotal), 0);

  return (
    <div className="page">
      <Link to="/challans" className="back-link">
        ← Back to Challans
      </Link>

      <div className="page-header">
        <h1>{challan.challanNumber}</h1>
        <span className={`badge badge-${challan.status.toLowerCase()}`}>{challan.status}</span>
      </div>

      <div className="card detail-grid">
        <div>
          <span className="muted">Customer</span>
          <div>
            <Link to={`/customers/${challan.customerId}`}>{(challan.customer as any)?.name}</Link>
          </div>
        </div>
        <div>
          <span className="muted">Mobile</span>
          <div>{(challan.customer as any)?.mobile}</div>
        </div>
        <div>
          <span className="muted">Total Quantity</span>
          <div>{challan.totalQuantity}</div>
        </div>
        <div>
          <span className="muted">Created</span>
          <div>{new Date(challan.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {actionError && <div className="form-error">{actionError}</div>}

      {challan.status === 'DRAFT' && (
        <div className="modal-actions" style={{ margin: '1rem 0' }}>
          <button className="btn btn-primary" disabled={actionLoading} onClick={handleConfirm}>
            Confirm Challan (reduces stock)
          </button>
          <button className="btn btn-ghost" disabled={actionLoading} onClick={handleCancel}>
            Cancel Challan
          </button>
        </div>
      )}
      {challan.status === 'CONFIRMED' && (
        <div className="modal-actions" style={{ margin: '1rem 0' }}>
          <button className="btn btn-ghost" disabled={actionLoading} onClick={handleCancel}>
            Cancel &amp; Restore Stock
          </button>
        </div>
      )}

      <h2>Products</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Unit Price</th>
            <th>Quantity</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productNameSnapshot}</td>
              <td>{item.skuSnapshot}</td>
              <td>₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
              <td>{item.quantity}</td>
              <td>₹{Number(item.lineTotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>
              Grand Total
            </td>
            <td style={{ fontWeight: 600 }}>₹{total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="muted small">
        Product name, SKU, and price shown above are snapshots captured at the time this challan was created —
        they remain accurate even if the product catalogue changes later.
      </p>
    </div>
  );
}
