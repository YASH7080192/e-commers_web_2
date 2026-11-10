import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { request } from './api';
import ProductImage from './ProductImage';

type Variant = { size: string; paperQuality: string; finish: string; frame?: string; price: number; stock: number; active?: boolean };
type Product = { _id: string; name: string; images: string[]; variants: Variant[]; discountPrice?: number };
type CartItem = { productId: string; variant: Variant; quantity: number };
type CartLine = CartItem & { product: Product; currentVariant: Variant };

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const sameVariant = (a: Variant, b: Variant) => a.size === b.size && a.paperQuality === b.paperQuality && a.finish === b.finish && (a.frame || '') === (b.frame || '');

export default function CartPage({ items, products, setItems }: { items: CartItem[]; products: Product[]; setItems: (items: CartItem[]) => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedItems, setSavedItems] = useState<CartItem[]>(() => JSON.parse(localStorage.getItem('pjpw_saved_items') || '[]') as CartItem[]);
  const lines = useMemo<CartLine[]>(() => items.flatMap(item => {
    const product = products.find(candidate => candidate._id === item.productId);
    const currentVariant = product?.variants.find(variant => sameVariant(variant, item.variant) && variant.active !== false);
    return product && currentVariant ? [{ ...item, product, currentVariant, quantity: Math.min(item.quantity, currentVariant.stock) }] : [];
  }), [items, products]);
  const subtotal = lines.reduce((sum, line) => sum + (line.product.discountPrice && line.product.discountPrice < line.currentVariant.price ? line.product.discountPrice : line.currentVariant.price) * line.quantity, 0);

  useEffect(() => {
    if (!localStorage.getItem('pjpw_token')) return;
    setSaving(true);
    request<{ cart: { items: Array<{ product: Product; size: string; paperQuality: string; finish: string; frame?: string; quantity: number }> } | null }>('/cart')
      .then(async result => {
        if (!result.cart?.items?.length) {
          if (items.length) await request('/cart', { method: 'PUT', body: JSON.stringify({ items: items.map(item => ({ productId: item.productId, size: item.variant.size, paperQuality: item.variant.paperQuality, finish: item.variant.finish, frame: item.variant.frame || '', quantity: item.quantity })) }) });
          return;
        }
        const serverItems = result.cart.items.map(item => {
          const variant = item.product.variants.find(candidate => candidate.size === item.size && candidate.paperQuality === item.paperQuality && candidate.finish === item.finish && (candidate.frame || '') === (item.frame || ''));
          return variant ? { productId: item.product._id, variant, quantity: item.quantity } : null;
        }).filter((item): item is CartItem => Boolean(item));
        if (serverItems.length) setItems(serverItems);
      })
      .catch(() => setError('Cart sync nahi ho paayi. Aap checkout par dobara try kar sakte hain.'))
      .finally(() => setSaving(false));
  }, []);

  const update = (line: CartLine, quantity: number) => {
    const next = items.map(item => item.productId === line.product._id && sameVariant(item.variant, line.variant)
      ? { ...item, quantity: Math.max(0, Math.min(quantity, line.currentVariant.stock)) }
      : item).filter(item => item.quantity > 0);
    setItems(next);
    if (localStorage.getItem('pjpw_token')) {
      request('/cart', { method: 'PUT', body: JSON.stringify({ items: next.map(item => ({ productId: item.productId, size: item.variant.size, paperQuality: item.variant.paperQuality, finish: item.variant.finish, frame: item.variant.frame || '', quantity: item.quantity })) }) }).catch(() => setError('Cart save nahi ho paaya.'));
    }
  };

  const saveForLater = (line: CartLine) => {
    const nextCart = items.filter(item => !(item.productId === line.product._id && sameVariant(item.variant, line.variant)));
    const nextSaved = savedItems.some(item => item.productId === line.product._id && sameVariant(item.variant, line.variant))
      ? savedItems
      : [...savedItems, { productId: line.product._id, variant: line.currentVariant, quantity: line.quantity }];
    setItems(nextCart);
    setSavedItems(nextSaved);
    localStorage.setItem('pjpw_saved_items', JSON.stringify(nextSaved));
  };

  const moveToCart = (item: CartItem) => {
    const product = products.find(candidate => candidate._id === item.productId);
    const variant = product?.variants.find(candidate => sameVariant(candidate, item.variant) && candidate.active !== false && candidate.stock > 0);
    if (!product || !variant) {
      setError('This saved poster is no longer available.');
      return;
    }
    const nextItems = [...items];
    const existing = nextItems.find(candidate => candidate.productId === item.productId && sameVariant(candidate.variant, variant));
    if (existing) existing.quantity = Math.min(variant.stock, existing.quantity + item.quantity);
    else nextItems.push({ ...item, variant, quantity: Math.min(item.quantity, variant.stock) });
    const nextSaved = savedItems.filter(candidate => !(candidate.productId === item.productId && sameVariant(candidate.variant, item.variant)));
    setItems(nextItems);
    setSavedItems(nextSaved);
    localStorage.setItem('pjpw_saved_items', JSON.stringify(nextSaved));
  };

  if (!items.length || !lines.length) return <main className="cartPage emptyCart"><ShoppingBag size={42}/><h1>Your cart is empty</h1><p>Apne ghar ke liye ek poster choose karein.</p><Link className="btn btn-dark" to="/">Continue shopping</Link></main>;
  return <main className="cartPage">
    <div className="sectionHead"><div><div className="eyebrow">YOUR BAG</div><h1>Shopping cart</h1><p>{lines.reduce((sum, line) => sum + line.quantity, 0)} items · Prices confirmed at checkout</p></div><Link className="btn btn-outline" to="/">Continue shopping</Link></div>
    {error && <div className="notice">{error}</div>}
    {saving && <div className="loading">Cart sync ho rahi hai…</div>}
    <div className="cartLayout"><section className="cartItems">{lines.map(line => {
      const price = line.product.discountPrice && line.product.discountPrice < line.currentVariant.price ? line.product.discountPrice : line.currentVariant.price;
      return <article className="cartItem" key={`${line.product._id}-${line.variant.size}-${line.variant.paperQuality}-${line.variant.finish}-${line.variant.frame || ''}`}>
        <ProductImage className="cartItemImage" src={line.product.images?.[0]} alt={line.product.name}/>
        <div className="cartItemDetails"><h2>{line.product.name}</h2><p>{line.variant.size} · {line.variant.paperQuality} · {line.variant.finish}{line.variant.frame ? ` · ${line.variant.frame} frame` : ''}</p><small>{line.currentVariant.stock > line.quantity ? `${line.currentVariant.stock} available` : 'Last available stock'}</small><div className="cartItemActions"><div className="quantity"><button aria-label="Decrease quantity" onClick={() => update(line, line.quantity - 1)}><Minus size={14}/></button><b>{line.quantity}</b><button aria-label="Increase quantity" disabled={line.quantity >= line.currentVariant.stock} onClick={() => update(line, line.quantity + 1)}><Plus size={14}/></button></div><button className="textLink" onClick={() => saveForLater(line)}>Save for later</button><button className="textLink" onClick={() => update(line, 0)}><Trash2 size={14}/> Remove</button></div></div><strong>{money(price * line.quantity)}</strong>
      </article>;
    })}</section><aside className="cartSummary"><h2>Order summary</h2><div className="subtotal"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="subtotal"><span>Total items</span><b>{lines.reduce((sum, line) => sum + line.quantity, 0)}</b></div><div className="subtotal"><span>Shipping</span><span>Calculated at checkout</span></div><div className="subtotal grand"><span>Estimated total</span><b>{money(subtotal)}</b></div><Link className="btn btn-dark full" to="/checkout">Proceed to checkout</Link><p className="muted">Final shipping, coupon and payment charges are validated securely on the server.</p></aside></div>
    {savedItems.length > 0 && <section className="savedForLater"><div className="sectionHead"><div><div className="eyebrow">KEEP FOR LATER</div><h2>Saved posters</h2></div></div>{savedItems.map(item => { const product = products.find(candidate => candidate._id === item.productId); if (!product) return null; return <div className="savedForLaterItem" key={`${item.productId}-${item.variant.size}-${item.variant.finish}`}><ProductImage className="cartItemImage" src={product.images?.[0]} alt={product.name}/><div><b>{product.name}</b><p>{item.variant.size} · {item.variant.finish}</p></div><button className="btn btn-outline" onClick={() => moveToCart(item)}>Move to cart</button></div>; })}</section>}
  </main>;
}
