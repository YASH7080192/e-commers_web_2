import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Category = { _id: string; name: string; slug: string };
type Variant = { size: string; paperQuality: string; finish: string; price: number; stock: number };
type Product = { _id: string; name: string; slug: string; description: string; category: string; images: string[]; variants: Variant[]; featured: boolean; active: boolean; discountPrice?: number; tag?: string; quote?: string; bg?: string; createdAt?: string; averageRating?: number; reviewCount?: number };

export default function CatalogPage({ products, categories, renderProduct }: { products: Product[]; categories: Category[]; renderProduct: (product: Product) => ReactNode }) {
  const params = new URLSearchParams(window.location.search);
  const slug = decodeURIComponent(window.location.pathname.split('/').pop() || '');
  const category = categories.find(item => item.slug === slug)?.name || slug;
  const sizes = [...new Set(products.flatMap(product => product.variants.map(variant => variant.size)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const isSearch = window.location.pathname === '/search';
  const term = (params.get('q') || '').trim().toLowerCase();
  const [sort, setSort] = useState(params.get('sort') === 'newest' ? 'newest' : params.get('sort') === 'popular' ? 'popular' : 'featured');
  const [page, setPage] = useState(1);
  const [maxPrice, setMaxPrice] = useState('');
  const [size, setSize] = useState('');
  const [inStock, setInStock] = useState(false);
  const results = useMemo(() => products.filter(product => product.active
    && (!isSearch || !term || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(term))
    && (isSearch || product.category.toLowerCase() === category.toLowerCase())
    && (!size || product.variants.some(variant => variant.size === size))
    && (!maxPrice || product.variants.some(variant => variant.price <= Number(maxPrice)))
    && (!inStock || product.variants.some(variant => variant.stock > 0)))
    .sort((a, b) => sort === 'price-low' ? (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0)
      : sort === 'price-high' ? (b.variants[0]?.price || 0) - (a.variants[0]?.price || 0)
      : sort === 'newest' ? new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      : sort === 'popular' ? (b.reviewCount || 0) - (a.reviewCount || 0)
      : Number(b.featured) - Number(a.featured)), [products, isSearch, term, category, size, maxPrice, inStock, sort]);
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const pagedResults = results.slice((page - 1) * pageSize, page * pageSize);

  return <main className="catalogPage"><nav className="breadcrumbs"><Link to="/">Home</Link><span>›</span><span>{isSearch ? 'Search results' : category}</span></nav>
    <div className="catalogHeading"><div><div className="eyebrow">{isSearch ? 'SEARCH THE COLLECTION' : 'SHOP BY CATEGORY'}</div><h1>{isSearch ? (term ? `Results for “${params.get('q')}”` : 'Search posters') : category}</h1><p>{results.length} poster{results.length === 1 ? '' : 's'} in this collection</p></div>
      <label>Sort products<select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="featured">Featured</option><option value="popular">Best sellers</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">Newest</option></select></label></div>
    <div className="catalogLayout"><aside className="catalogFilters"><h2>Filter products</h2><label>Maximum price<input type="number" min="0" placeholder="Any price" value={maxPrice} onChange={event => setMaxPrice(event.target.value)}/></label><label>Size<select value={size} onChange={event => setSize(event.target.value)}><option value="">All sizes</option>{sizes.map(value => <option key={value}>{value}</option>)}</select></label><label className="filterCheck"><input type="checkbox" checked={inStock} onChange={event => setInStock(event.target.checked)}/> In stock only</label><button className="textLink" onClick={() => { setMaxPrice(''); setSize(''); setInStock(false); setSort('featured'); }}>Clear filters</button>{!isSearch && <div className="categoryFilterLinks"><h3>Categories</h3>{categories.map(item => <Link key={item._id} to={`/category/${item.slug}`}>{item.name}</Link>)}</div>}</aside>
      {results.length ? <><div className="productGrid catalogGrid">{pagedResults.map(product => <div key={product._id}>{renderProduct(product)}</div>)}</div><div className="catalogPagination"><button className="filter" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="filter" disabled={page >= pageCount} onClick={() => setPage(current => current + 1)}>Next</button></div></> : <div className="empty catalogEmpty"><h2>No posters found</h2><p>Try another keyword or clear the filters to browse the live collection.</p><Link className="btn btn-dark" to="/">Browse all posters</Link></div>}</div>
  </main>;
}
