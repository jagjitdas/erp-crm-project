import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, Product } from '../types';

interface LineItem {
  productId: string;
  quantity: string;
}

export default function ChallanNew() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: '1' }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      const [customersRes, productsRes] = await Promise.all([
        api.get('/customers', { params: { pageSize: 100 } }),
        api.get('/products', { params: { pageSize: 100 } }),
      ]);
      setCustomers(customersRes.data.data);
      setProducts(productsRes.data.data);
    }
    loadOptions();
  }, []);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addLine() {
    setItems((prev) => [...prev, { productId: '', quantity: '1' }]);
  }

  function removeLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function productStock(productId: string) {
    return products.find((p) => p.id === productId)?.currentStock;
  }

  async function submit(status: 'DRAFT' | 'CONFIRMED', e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer');
      return;
    }
    const cleanItems = items
      .filter((it) => it.productId && Number(it.quantity) > 0)
      .map((it) => ({ productId: it.productId, quantity: Number(it.quantity) }));
    if (cleanItems.length === 0) {
      setError('Add at least one product line with a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/challans', { customerId, items: cleanItems, status });
      navigate(`/challans/${res.data.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create challan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>New Sales Challan</h1>

      <form className="card">
        <div className="form-field form-field-wide">
          <label>Customer *</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">-- Select customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.mobile})
              </option>
            ))}
          </select>
        </div>

        <h3>Products</h3>
        {items.map((item, i) => (
          <div className="line-item-row" key={i}>
            <select value={item.productId} onChange={(e) => updateItem(i, { productId: e.target.value })}>
              <option value="">-- Select product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — stock: {p.currentStock} — ₹{Number(p.unitPrice).toFixed(2)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(i, { quantity: e.target.value })}
              style={{ width: '100px' }}
            />
            {item.productId && productStock(item.productId) !== undefined && (
              <span className="muted small">avail: {productStock(item.productId)}</span>
            )}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeLine(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={addLine}>
          + Add Line
        </button>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn" disabled={submitting} onClick={(e) => submit('DRAFT', e)}>
            Save as Draft
          </button>
          <button className="btn btn-primary" disabled={submitting} onClick={(e) => submit('CONFIRMED', e)}>
            Save &amp; Confirm (reduces stock)
          </button>
        </div>
      </form>
    </div>
  );
}
