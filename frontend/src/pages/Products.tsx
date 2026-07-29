import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Product, PaginationMeta, MovementType } from '../types';

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  currentStock: '0',
  minStockAlert: '0',
  location: '',
};

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: { search: search || undefined, lowStock: lowStockOnly ? 'true' : undefined, page, pageSize: 10 },
      });
      setProducts(res.data.data);
      setMeta(res.data.meta);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lowStockOnly]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleAddProduct(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post('/products', {
        ...form,
        category: form.category || undefined,
        location: form.location || undefined,
        unitPrice: Number(form.unitPrice),
        currentStock: Number(form.currentStock),
        minStockAlert: Number(form.minStockAlert),
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to add product');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Products &amp; Inventory</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={handleAddProduct}>
          <div className="form-field">
            <label>Product Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-field">
            <label>SKU / Code *</label>
            <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Unit Price *</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Opening Stock</label>
            <input
              type="number"
              value={form.currentStock}
              onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Min Stock Alert</label>
            <input
              type="number"
              value={form.minStockAlert}
              onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Location / Warehouse</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          {formError && <div className="form-error form-field-wide">{formError}</div>}
          <div className="form-field-wide">
            <button className="btn btn-primary" type="submit">
              Save Product
            </button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input placeholder="Search by name, SKU, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn" type="submit">
            Search
          </button>
        </form>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setSearchParams(e.target.checked ? { lowStock: 'true' } : {});
              setPage(1);
            }}
          />
          Low stock only
        </label>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock</th>
                <th>Location</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.category || '-'}</td>
                  <td>₹{Number(p.unitPrice).toFixed(2)}</td>
                  <td>
                    <span className={p.currentStock <= p.minStockAlert ? 'stock-low' : ''}>{p.currentStock}</span>
                    {p.currentStock <= p.minStockAlert && <span className="badge badge-warning">Low</span>}
                  </td>
                  <td>{p.location || '-'}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => setStockModalProduct(p)}>
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No products found.
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

      {stockModalProduct && (
        <StockMovementModal
          product={stockModalProduct}
          onClose={() => setStockModalProduct(null)}
          onSaved={() => {
            setStockModalProduct(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StockMovementModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/products/${product.id}/stock-movements`, {
        movementType,
        quantity: Number(quantity),
        reason,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record stock movement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Adjust Stock — {product.name}</h3>
        <p className="muted">Current stock: {product.currentStock}</p>

        <label>Movement Type</label>
        <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)}>
          <option value="IN">Stock IN</option>
          <option value="OUT">Stock OUT</option>
        </select>

        <label>Quantity</label>
        <input type="number" min={1} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />

        <label>Reason</label>
        <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Purchase receipt, damage, correction" />

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
