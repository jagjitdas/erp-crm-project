import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Customer } from '../types';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [noteText, setNoteText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.get(`/customers/${id}`);
    setCustomer(res.data.data);
    setForm(res.data.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put(`/customers/${id}`, form);
      setEditing(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update customer');
    }
  }

  async function handleAddFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setError(null);
    try {
      await api.post(`/customers/${id}/follow-ups`, {
        note: noteText,
        followUpOn: followUpDate || undefined,
      });
      setNoteText('');
      setFollowUpDate('');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add follow-up');
    }
  }

  if (loading || !customer) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <Link to="/customers" className="back-link">
        ← Back to Customers
      </Link>
      <div className="page-header">
        <h1>{customer.name}</h1>
        <button className="btn" onClick={() => setEditing((e) => !e)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {editing ? (
        <form className="card form-grid" onSubmit={handleSave}>
          <div className="form-field">
            <label>Name</label>
            <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Mobile</label>
            <input value={form.mobile || ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Business Name</label>
            <input
              value={form.businessName || ''}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="form-field">
            <label>Customer Type</label>
            <select
              value={form.customerType}
              onChange={(e) => setForm({ ...form, customerType: e.target.value as any })}
            >
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
          <div className="form-field form-field-wide">
            <label>Address</label>
            <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-field-wide">
            <button className="btn btn-primary" type="submit">
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="card detail-grid">
          <div>
            <span className="muted">Mobile</span>
            <div>{customer.mobile}</div>
          </div>
          <div>
            <span className="muted">Email</span>
            <div>{customer.email || '-'}</div>
          </div>
          <div>
            <span className="muted">Business Name</span>
            <div>{customer.businessName || '-'}</div>
          </div>
          <div>
            <span className="muted">GST Number</span>
            <div>{customer.gstNumber || '-'}</div>
          </div>
          <div>
            <span className="muted">Type</span>
            <div>{customer.customerType}</div>
          </div>
          <div>
            <span className="muted">Status</span>
            <div>
              <span className={`badge badge-${customer.status.toLowerCase()}`}>{customer.status}</span>
            </div>
          </div>
          <div className="detail-wide">
            <span className="muted">Address</span>
            <div>{customer.address || '-'}</div>
          </div>
        </div>
      )}

      <h2>Follow-ups</h2>
      <form className="card follow-up-form" onSubmit={handleAddFollowUp}>
        <textarea
          placeholder="Add a follow-up note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
        />
        <div className="follow-up-form-row">
          <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          <button className="btn btn-primary" type="submit">
            Add Note
          </button>
        </div>
      </form>

      <ul className="timeline">
        {customer.followUps?.length ? (
          customer.followUps.map((f) => (
            <li key={f.id} className="timeline-item">
              <div className="timeline-date">{new Date(f.createdAt).toLocaleString()}</div>
              <div>{f.note}</div>
              {f.followUpOn && (
                <div className="muted small">Next follow-up: {new Date(f.followUpOn).toLocaleDateString()}</div>
              )}
              {f.createdBy?.name && <div className="muted small">— {f.createdBy.name}</div>}
            </li>
          ))
        ) : (
          <p className="muted">No follow-up notes yet.</p>
        )}
      </ul>

      {customer.challans && customer.challans.length > 0 && (
        <>
          <h2>Recent Challans</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {customer.challans.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                  </td>
                  <td>{c.status}</td>
                  <td>{c.totalQuantity}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
