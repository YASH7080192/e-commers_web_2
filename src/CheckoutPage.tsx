import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from './api';

type Variant = { size: string; paperQuality: string; finish: string; frame?: string; price: number };
type Line = { productId: string; variant: Variant; quantity: number; product: { _id: string; name: string } };
type Config = { codCharge: number; onlineDiscount: number; shippingCharge: number; freeShippingMinimum: number };
declare global { interface Window { Razorpay?: new (options: any) => { open: () => void; onDismiss?: () => void } } }
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
async function loadRazorpay() {
  if (window.Razorpay) return window.Razorpay;
  await new Promise<void>((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = () => resolve(); script.onerror = () => reject(new Error('Razorpay checkout unavailable')); document.body.appendChild(script); });
  if (!window.Razorpay) throw new Error('Razorpay checkout unavailable');
  return window.Razorpay;
}

export default function CheckoutPage({ lines, subtotal, setCart, config }: { lines: Line[]; subtotal: number; setCart: (items: any[]) => void; config: Config }) {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(-1);
  const [method, setMethod] = useState<'cod' | 'razorpay'>('cod');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => { request<{ addresses: any[] }>('/account/addresses').then(result => setAddresses(result.addresses)).catch(() => {}); }, []);
  useEffect(() => { if (!localStorage.getItem('pjpw_token')) navigate('/login?redirect=/checkout'); else if (!lines.length) navigate('/cart'); }, [navigate, lines.length]);
  const discount = coupon ? Math.min(subtotal, coupon.type === 'percent' ? subtotal * coupon.value / 100 : coupon.value, coupon.maxDiscount || subtotal) : 0;
  const onlineDiscount = method === 'razorpay' ? Math.min(config.onlineDiscount, subtotal - discount) : 0;
  const delivery = method === 'cod' ? config.codCharge : (subtotal - discount >= config.freeShippingMinimum ? 0 : config.shippingCharge);
  const total = Math.max(0, subtotal + delivery - discount - onlineDiscount);
  const applyCoupon = async () => { setCouponError(''); try { const result = await request<{ coupon: any }>('/coupons/validate', { method: 'POST', body: JSON.stringify({ code: couponCode, subtotal }) }); setCoupon(result.coupon); } catch (e) { setCoupon(null); setCouponError(e instanceof Error ? e.message : 'Coupon invalid hai'); } };
  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    const address = selectedAddress >= 0 ? addresses[selectedAddress] : form;
    let modalOpen = false;
    try {
      const result = await request<any>('/orders', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ items: lines.map(line => ({ productId: line.productId, variant: line.variant, quantity: line.quantity })), shippingAddress: address, paymentMethod: method, couponCode: coupon?.code }) });
      if (result.payment) {
        const Razorpay = await loadRazorpay();
        const checkout = new Razorpay({ key: result.payment.key, amount: result.payment.amount, currency: result.payment.currency, name: 'Pandit Ji Poster Wali', description: result.order.orderNumber, order_id: result.payment.id, handler: async (response: any) => { try { await request('/payments/verify', { method: 'POST', body: JSON.stringify({ ...response, orderId: result.order._id }) }); setCart([]); navigate(`/order-confirmation/${encodeURIComponent(result.order.orderNumber)}`); } catch (e) { setError(e instanceof Error ? e.message : 'Payment verification failed'); setBusy(false); } } });
        modalOpen = true; checkout.onDismiss = () => { void request('/payments/failure', { method: 'POST', body: JSON.stringify({ orderId: result.order._id, reason: 'Payment cancelled' }) }).catch(() => {}); setBusy(false); }; checkout.open(); return;
      }
      setCart([]); navigate(`/order-confirmation/${encodeURIComponent(result.order.orderNumber)}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Order place nahi hua'); } finally { if (!modalOpen) setBusy(false); }
  };
  return <main className="checkoutPage"><div><div className="eyebrow">SECURE CHECKOUT</div><h1>Delivery details</h1><form noValidate onSubmit={placeOrder}><label>Saved address<select value={selectedAddress} onChange={event => setSelectedAddress(Number(event.target.value))}><option value={-1}>Add a new address</option>{addresses.map((address, index) => <option value={index} key={`${address.label}-${index}`}>{address.label} · {address.city} · {address.postalCode}</option>)}</select></label><div className="checkoutFields">{[['name','Full name'],['phone','Mobile number'],['email','Email address'],['line1','House / building and street'],['line2','Landmark (optional)'],['city','City'],['state','State'],['postalCode','Six-digit pincode']].map(([name,label]) => <label key={name}>{label}<input name={name} required={!['line2'].includes(name)} minLength={name === 'postalCode' ? 6 : undefined} maxLength={name === 'postalCode' ? 6 : undefined} inputMode={name === 'postalCode' ? 'numeric' : undefined}/></label>)}</div><h2>Coupon</h2><div className="couponRow"><input value={couponCode} onChange={event => setCouponCode(event.target.value.toUpperCase())} placeholder="Enter coupon code"/><button type="button" className="btn btn-outline" onClick={() => void applyCoupon()} disabled={!couponCode || busy}>Apply</button></div>{couponError && <div className="notice">{couponError}</div>}{coupon && <div className="notice">Coupon {coupon.code} applied: -{money(discount)}</div>}<h2>Payment method</h2><label className="paymentChoice"><input type="radio" checked={method === 'cod'} onChange={() => setMethod('cod')}/> Cash on Delivery · {money(config.codCharge)} charge</label><label className="paymentChoice"><input type="radio" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')}/> Razorpay online payment</label>{error && <div className="notice">{error}</div>}<button className="btn btn-dark full" disabled={busy || !lines.length}>{busy ? 'Order submit ho raha hai…' : `Place order · ${money(total)}`}</button></form></div><aside className="checkoutSummary"><h2>Your order</h2>{lines.map(line => <div className="subtotal" key={`${line.productId}-${line.variant.size}`}><span>{line.product.name} · {line.variant.size} × {line.quantity}</span><b>{money(line.variant.price * line.quantity)}</b></div>)}<div className="subtotal"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="subtotal"><span>Discount</span><b>-{money(discount + onlineDiscount)}</b></div><div className="subtotal"><span>Delivery</span><b>{delivery ? money(delivery) : 'FREE'}</b></div><div className="subtotal grand"><span>Final payable</span><b>{money(total)}</b></div></aside></main>;
}
