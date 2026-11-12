import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { request } from './api';
import { printOfflineBill } from './print';

type Variant = { size: string; paperQuality: string; finish: string; price: number; stock: number; active?: boolean };
type Product = { _id: string; name: string; active: boolean; variants: Variant[] };
type Order = { orderNumber: string; total: number; items?: Array<{ name: string; size: string; quantity: number; unitPrice: number }>; customer?: { name: string; phone: string } };

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function AdminPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [variantIndex, setVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);

  useEffect(() => {
    request<{ products: Product[] }>('/admin/products?pageSize=100&active=true')
      .then(result => {
        const available = result.products.filter(product => product.active && product.variants?.some(variant => variant.active !== false && variant.stock > 0));
        setProducts(available);
        setProductId(available[0]?._id || '');
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Products could not be loaded.'));
  }, []);

  const product = products.find(item => item._id === productId);
  const variants = product?.variants.filter(item => item.active !== false && item.stock > 0) || [];
  const variant = variants[variantIndex] || variants[0];
  const total = useMemo(() => (variant?.price || 0) * quantity, [quantity, variant]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || !variant) return;
    setBusy(true);
    setError('');
    setSavedOrder(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await request<{ order: Order }>('/admin/offline-sales', {
        method: 'POST',
        body: JSON.stringify({
          customer: { name: form.get('name'), phone: form.get('phone') },
          items: [{ productId: product._id, variant: { size: variant.size, paperQuality: variant.paperQuality, finish: variant.finish }, quantity }],
          paymentMethod: form.get('paymentMethod'),
          discount: Number(form.get('discount') || 0),
          notes: form.get('notes'),
        }),
      });
      setSavedOrder(result.order);
      event.currentTarget.reset();
      setQuantity(1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sale could not be recorded.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="adminContent">
    <div className="adminPageHead"><div><div className="adminEyebrow">IN STORE</div><h1 className="adminPageTitle">Record offline sale</h1><p className="adminPageSub">Record a shop counter sale and print its bill.</p></div><Link to="/admin" className="adminBtn adminBtnOutline">Dashboard</Link></div>
    {error && <div className="adminNotice adminNoticeError" role="alert">{error}</div>}
    {savedOrder && <div className="adminNotice adminNoticeSuccess" role="status">Sale {savedOrder.orderNumber} saved for {money(savedOrder.total)}. <button type="button" className="filter" onClick={() => printOfflineBill(savedOrder)}>Print bill</button></div>}
    {!products.length && !error ? <div className="adminLoading">Loading products…</div> : <form className="adminPosForm" onSubmit={submit}>
      <label>Customer name<input name="name" required minLength={2}/></label>
      <label>Phone number<input name="phone" type="tel" required minLength={10}/></label>
      <label>Poster<select value={productId} onChange={event => { setProductId(event.target.value); setVariantIndex(0); }} required>{products.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <label>Size and finish<select value={variantIndex} onChange={event => setVariantIndex(Number(event.target.value))}>{variants.map((item, index) => <option value={index} key={`${item.size}-${item.paperQuality}-${item.finish}`}>{item.size} · {item.paperQuality} · {item.finish} · {money(item.price)} · {item.stock} in stock</option>)}</select></label>
      <label>Quantity<input type="number" min="1" max={variant?.stock || 1} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(Number(event.target.value) || 1, variant?.stock || 1)))}/></label>
      <label>Discount ₹<input name="discount" type="number" min="0" max={total} defaultValue="0"/></label>
      <label>Payment method<select name="paymentMethod"><option value="cash">Cash</option><option value="upi">UPI</option><option value="other">Other</option></select></label>
      <label>Notes<input name="notes" maxLength={500}/></label>
      <div className="adminPosTotal"><span>Sale total before discount</span><strong>{money(total)}</strong></div>
      <button className="adminBtn adminBtnDark" disabled={busy || !variant}>{busy ? 'Saving sale…' : `Record sale · ${money(total)}`}</button>
    </form>}
  </div>;
}
