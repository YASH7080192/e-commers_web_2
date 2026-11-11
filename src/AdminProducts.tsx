import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authHeaders, request } from './api';
import ProductImage from './ProductImage';
import VariantEditor, { type AdminVariant } from './VariantEditor';

type Product = {
  _id: string; name: string; slug: string; description: string; category: string;
  images: string[]; variants: AdminVariant[]; featured: boolean; active: boolean;
  inventoryVerified?: boolean; sku?: string; discountPrice?: number; quote?: string;
  bg?: string; tag?: string; seoTitle?: string; seoDescription?: string;
  customSizeEnabled?: boolean;
};
type Category = { _id: string; name: string; slug: string };
type ImageEntry = { id: string; src: string; file?: File };
type PageData = { products: Product[]; pagination: { page: number; pages: number; total: number } };
const emptyProduct = (): Product => ({
  _id: '', name: '', slug: '', description: '', category: '', images: [],
  variants: [{ size: 'A4', paperQuality: 'Matte 250 GSM', finish: 'Unframed', frame: '', price: 299, originalPrice: undefined, stock: 10, sku: '', active: true }],
  featured: false, active: false, inventoryVerified: false,
});
const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const freshImages = (images: string[] = []): ImageEntry[] => images.map((src, index) => ({ id: `${Date.now()}-${index}-${Math.random()}`, src }));

export default function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [details, setDetails] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setError('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search.trim()) query.set('search', search.trim());
      if (category) query.set('category', category);
      if (activeFilter) query.set('active', activeFilter);
      if (visibilityFilter) query.set('verified', visibilityFilter);
      const result = await request<PageData>(`/admin/products?${query}`);
      setItems(result.products); setPages(Math.max(1, result.pagination.pages)); setTotal(result.pagination.total);
    } catch (err) { setError(err instanceof Error ? err.message : 'Products could not be loaded.'); }
  };
  useEffect(() => { void load(); }, [page, pageSize, search, category, activeFilter, visibilityFilter]);
  useEffect(() => { request<{ categories: Category[] }>('/categories').then(result => setCategoryOptions(result.categories)).catch(() => setCategoryOptions([])); }, []);

  const startEdit = (product: Product) => {
    setError(''); setSuccess(''); setEditing({ ...product, variants: (product.variants || []).map(variant => ({ active: true, ...variant })) });
    setImageEntries(freshImages(product.images));
  };
  const startAdd = () => { setError(''); setSuccess(''); setEditing(emptyProduct()); setImageEntries([]); };
  const closeEdit = () => {
    imageEntries.forEach(image => { if (image.file) URL.revokeObjectURL(image.src); });
    setEditing(null); setImageEntries([]); setError('');
  };
  const changeField = (key: keyof Product, value: unknown) => setEditing(current => current ? { ...current, [key]: value } : current);
  const addFiles = (files: FileList | null, replaceId?: string) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    const invalidType = picked.find(file => !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase()) && !/\.(jpe?g|png|webp)$/i.test(file.name));
    const tooLarge = picked.find(file => file.size > 8 * 1024 * 1024);
    if (invalidType) { setError(`${invalidType.name}: choose a JPG, JPEG, PNG or WebP image.`); return; }
    if (tooLarge) { setError(`${tooLarge.name}: image files must be 8 MB or smaller.`); return; }
    setError('');
    setImageEntries(current => {
      const entries = [...current];
      for (const file of picked) {
        const src = URL.createObjectURL(file);
        const next = { id: `${Date.now()}-${Math.random()}`, src, file };
        if (replaceId && entries.some(image => image.id === replaceId)) {
          const index = entries.findIndex(image => image.id === replaceId);
          const replaced = entries[index]; if (replaced.file) URL.revokeObjectURL(replaced.src);
          entries[index] = next;
        } else entries.push(next);
      }
      return entries;
    });
  };
  const removeImage = (id: string) => setImageEntries(current => {
    const image = current.find(entry => entry.id === id); if (image?.file) URL.revokeObjectURL(image.src);
    return current.filter(entry => entry.id !== id);
  });
  const moveImage = (index: number, direction: -1 | 1) => setImageEntries(current => {
    const target = index + direction; if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });

  const uploadSelectedFiles = async (entries: ImageEntry[]) => {
    const fileEntries = entries.filter(entry => entry.file);
    const fileUrls = new Map<File, string>();
    setUploading(true);
    try {
      for (let offset = 0; offset < fileEntries.length; offset += 5) {
        const batch = fileEntries.slice(offset, offset + 5);
        const data = new FormData(); batch.forEach(entry => data.append('images', entry.file!));
        const response = await fetch('/api/admin/uploads', { method: 'POST', headers: new Headers(authHeaders()), body: data });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Image upload failed.');
        batch.forEach((entry, index) => fileUrls.set(entry.file!, result.images[index]));
      }
      return entries.map(entry => entry.file ? fileUrls.get(entry.file!)! : entry.src);
    } finally { setUploading(false); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return; setError('');
    if (!editing.name.trim() || !editing.description.trim() || !editing.category) { setError('Name, description and category are required.'); return; }
    if (!editing.variants.length) { setError('Add at least one product variant.'); return; }
    for (let i = 0; i < editing.variants.length; i++) {
      const v = editing.variants[i];
      if (!v.size?.trim()) { setError(`Variant #${i + 1}: size is required.`); return; }
      if (!v.price || v.price <= 0) { setError(`Variant #${i + 1}: valid selling price greater than ₹0 is required.`); return; }
      if (v.originalPrice !== undefined && v.originalPrice !== null && v.originalPrice < v.price) {
        setError(`Variant #${i + 1}: original price (MRP ₹${v.originalPrice}) cannot be lower than selling price (₹${v.price}).`); return;
      }
      if (v.stock === undefined || v.stock === null || v.stock < 0 || !Number.isInteger(v.stock)) {
        setError(`Variant #${i + 1}: stock must be a non-negative whole number.`); return;
      }
    }
    const enteredSkus = [editing.sku, ...editing.variants.map(v => v.sku)].filter(Boolean).map(s => String(s).trim().toLowerCase());
    if (new Set(enteredSkus).size !== enteredSkus.length) {
      setError('Product SKU and variant SKUs must be unique.'); return;
    }
    if (editing.inventoryVerified && (!imageEntries.length || !imageEntries.some(image => image.src))) { setError('Add genuine product photos before verifying inventory for publication.'); return; }
    if (editing.inventoryVerified && !editing.variants.some(variant => variant.active !== false && variant.stock > 0)) { setError('At least one active variant needs verified price and available stock before publication.'); return; }
    setSaving(true);
    try {
      const images = await uploadSelectedFiles(imageEntries);
      const body = { ...editing, images, variants: editing.variants };
      await request(editing._id ? `/admin/products/${editing._id}` : '/admin/products', { method: editing._id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      const published = Boolean(editing.active && editing.inventoryVerified);
      closeEdit(); setSuccess(published ? 'Product saved and published to the customer storefront.' : 'Product saved as a draft. Verify its real photo, price and available stock before publishing.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Product could not be saved.'); }
    finally { setSaving(false); }
  };

  const archive = async (product: Product) => {
    setError('');
    try {
      if (product.active) await request(`/admin/products/${product._id}`, { method: 'DELETE' });
      else await request(`/admin/products/${product._id}`, { method: 'PUT', body: JSON.stringify({ active: true }) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Product status could not be updated.'); }
  };

  return <main className="adminPage">
    <div className="sectionHead"><div><div className="eyebrow">CATALOGUE</div><h1>Products & prices</h1><p>{total} product records · unverified items stay out of the customer storefront.</p></div><Link to="/admin" className="textLink">Dashboard</Link></div>
    <div className="adminActions"><Link className="btn btn-outline" to="/admin/categories">Categories</Link><Link className="btn btn-outline" to="/admin/reviews">Reviews</Link><Link className="btn btn-outline" to="/admin/settings">Settings</Link><Link className="btn btn-dark" to="/admin/pos">+ Offline sale</Link><button className="btn btn-dark" onClick={startAdd}>+ Add product</button></div>
    <div className="notice">Product photos upload to secure local storage by default; configured Cloudinary credentials are reused when present. Use actual shop photos, prices and stock. Images can be reordered below; the first image is primary.</div>
    {success && <div role="status" className="notice">{success}</div>}
    {error && !editing && <div role="alert" className="notice">{error}</div>}
    <div className="orderFilters productFilters"><label>Search products<input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Name, category or SKU"/></label><label>Category<select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categoryOptions.map(option => <option key={option._id} value={option.name}>{option.name}</option>)}</select></label><label>Status<select value={activeFilter} onChange={event => { setActiveFilter(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive / archived</option></select></label><label>Storefront<select value={visibilityFilter} onChange={event => { setVisibilityFilter(event.target.value); setPage(1); }}><option value="">Published and drafts</option><option value="true">Published</option><option value="false">Draft / hidden</option></select></label></div>
    <div className="adminTable">{items.length ? items.map(product => <article className="adminProduct" key={product._id}>
      <ProductImage className="adminListImage" src={product.images?.[0]} alt={`${product.name} primary image`}/>
      <div className="adminProductSummary"><b>{product.name}</b><small>{product.category} · {product.active ? 'Active' : 'Archived'} · {product.inventoryVerified ? 'Verified for storefront' : 'Unverified / draft'}</small><small>{product.variants.map(variant => `${variant.size}${variant.frame ? ` ${variant.frame}` : ''} ${money(variant.price)} · ${variant.stock} in stock${variant.active === false ? ' · inactive' : ''}`).join(' / ')}</small></div>
      <div className="adminProductActions"><button className="filter" onClick={() => setDetails(product)}>View details</button><button className="filter" onClick={() => startEdit(product)}>Edit</button><button className="filter" onClick={() => void archive(product)}>{product.active ? 'Archive' : 'Restore'}</button></div>
    </article>) : <div className="adminEmpty"><h2>No products match these filters</h2><p>Try another search, category or status.</p></div>}</div>
    <div className="adminActions pagination"><button className="filter" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><select aria-label="Products per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10 / page</option><option value={20}>20 / page</option><option value={50}>50 / page</option></select><button className="filter" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>

    {details && <div className="scrim" onMouseDown={event => { if (event.target === event.currentTarget) setDetails(null); }}><section className="adminEditor"><div className="drawerHead"><h2>{details.name}</h2><button className="iconBtn" onClick={() => setDetails(null)} aria-label="Close details">×</button></div><p>{details.description}</p><p><b>Category:</b> {details.category} · <b>SKU:</b> {details.sku || 'Not set'}</p><p><b>Storefront:</b> {details.active && details.inventoryVerified ? 'Published' : details.active ? 'Active, awaiting genuine inventory verification' : 'Archived'}</p><div className="adminImageGrid">{details.images.map((src, index) => <div key={`${src}-${index}`}><ProductImage src={src} alt={`${details.name} image ${index + 1}`}/><small>{index === 0 ? 'Primary image' : `Image ${index + 1}`}</small></div>)}</div><h3>Variants</h3>{details.variants.map((variant,index)=><p key={variant._id || index}>{variant.size} · {variant.paperQuality} · {variant.finish}{variant.frame ? ` · ${variant.frame}` : ''} · {money(variant.price)}{variant.originalPrice ? ` (MRP ${money(variant.originalPrice)})` : ''} · stock {variant.stock} · {variant.sku || 'No SKU'}</p>)}{details.seoTitle && <p><b>SEO title:</b> {details.seoTitle}</p>}{details.seoDescription && <p><b>SEO description:</b> {details.seoDescription}</p>}</section></div>}

    {editing && <div className="scrim" onMouseDown={event => { if (event.target === event.currentTarget) closeEdit(); }}><section className="adminEditor adminProductEditor"><div className="drawerHead"><div><div className="eyebrow">{editing._id ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</div><h2>{editing._id ? editing.name : 'Add product'}</h2></div><button className="iconBtn" onClick={closeEdit} aria-label="Close product form">×</button></div>
      <form onSubmit={save}>
        {error && <div role="alert" className="notice">{error}</div>}
        <label>Product name<input value={editing.name} onChange={event => changeField('name', event.target.value)} minLength={2} maxLength={180} required/></label>
        <label>Product description<textarea value={editing.description} onChange={event => changeField('description', event.target.value)} minLength={5} maxLength={5000} rows={4} required/></label>
        <div className="adminFormGrid"><label>Category<select value={editing.category} onChange={event => changeField('category', event.target.value)} required><option value="">Choose category</option>{categoryOptions.map(option => <option key={option._id} value={option.name}>{option.name}</option>)}</select></label><label>Product SKU<input value={editing.sku || ''} onChange={event => changeField('sku', event.target.value)} maxLength={80}/></label></div>
        <label>Product images <small>JPG/JPEG, PNG or WebP · max 8 MB per image. Reorder images to select the primary image.</small></label>
        <div className="adminImageGrid">{imageEntries.map((image, index) => <div className="adminImageItem" key={image.id}><ProductImage src={image.src} alt={`${editing.name || 'Product'} image ${index + 1}`} loading="eager"/><strong>{index === 0 ? 'Primary image' : `Image ${index + 1}`}</strong><div><button type="button" className="filter" onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button><button type="button" className="filter" onClick={() => moveImage(index, 1)} disabled={index === imageEntries.length - 1}>→</button><label className="replaceImage filter">Replace<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => addFiles(event.currentTarget.files, image.id)}/></label><button type="button" className="filter" onClick={() => removeImage(image.id)}>Remove</button></div></div>)}</div>
        <label className="uploadDrop">Add multiple images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { addFiles(event.currentTarget.files); event.currentTarget.value = ''; }}/><small>{imageEntries.length} image{imageEntries.length === 1 ? '' : 's'} selected · first image is primary</small></label>
        <div className="adminFormGrid"><label>Discount price override ₹ (optional)<input type="number" min="1" value={editing.discountPrice ?? ''} onChange={event => changeField('discountPrice', event.target.value ? Number(event.target.value) : undefined)}/></label><label>Background colour (fallback only)<input type="color" value={editing.bg || '#e8d8bf'} onChange={event => changeField('bg', event.target.value)}/></label></div>
        <VariantEditor key={editing._id || 'new'} initial={editing.variants} onChange={variants => changeField('variants', variants)}/>
        <label>Poster quote (optional)<input value={editing.quote || ''} onChange={event => changeField('quote', event.target.value)}/></label><label>Tag (optional)<input value={editing.tag || ''} onChange={event => changeField('tag', event.target.value)}/></label>
        <label>SEO title<input value={editing.seoTitle || ''} onChange={event => changeField('seoTitle', event.target.value)} maxLength={180}/></label><label>SEO description<textarea value={editing.seoDescription || ''} onChange={event => changeField('seoDescription', event.target.value)} maxLength={320} rows={2}/></label>
        <label className="checkLabel"><input type="checkbox" checked={editing.featured} onChange={event => changeField('featured', event.target.checked)}/> Featured product</label>
        <label className="checkLabel"><input type="checkbox" checked={editing.active} onChange={event => changeField('active', event.target.checked)}/> Active status (keep unchecked to archive)</label>
        <label className="checkLabel"><input type="checkbox" checked={Boolean(editing.inventoryVerified)} onChange={event => { const verified = event.target.checked; setEditing(current => current ? { ...current, inventoryVerified: verified, ...(verified ? { active: true } : {}) } : current); }}/> Publish to customer storefront</label>
        {!editing.inventoryVerified && <small className="muted">New products are drafts and stay hidden from customers. To publish, add at least one real product photo, enter correct prices and available stock, then check “Publish to customer storefront”.</small>}
        {editing.inventoryVerified && <small className="muted">Publishing requires a real product photo and at least one active variant with stock. The server validates these before saving.</small>}
        <button className="btn btn-dark full" disabled={saving || uploading}>{saving || uploading ? 'Saving product…' : editing._id ? 'Save product changes' : 'Create product'}</button>
      </form>
    </section></div>}
  </main>;
}
