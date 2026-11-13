import type { ReactNode } from 'react';
import { ArrowRight, Frame, MapPin, Printer, ShieldCheck, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

type Category = { _id: string; name: string; slug: string; image?: string };
type Product = {
  _id: string; name: string; slug: string; description: string; category: string; images: string[];
  variants: Array<{ _id?: string; size: string; paperQuality: string; finish: string; frame?: string; price: number; originalPrice?: number; stock: number; sku?: string; active?: boolean }>;
  featured: boolean; active: boolean; inventoryVerified?: boolean; discountPrice?: number; tag?: string; quote?: string; bg?: string; averageRating?: number; reviewCount?: number; createdAt?: string;
};

export default function HomePage({ categories, products, loading, catalogError, sort, setSort, renderProduct }: {
  categories: Category[];
  products: Product[];
  loading: boolean;
  catalogError: string;
  sort: 'featured'|'price-low'|'price-high'|'newest';
  setSort: (sort: 'featured'|'price-low'|'price-high'|'newest') => void;
  renderProduct: (product: Product) => ReactNode;
}) {
  const verified = products.filter(product => product.active && product.inventoryVerified).slice(0, 4);
  return <>
    <main id="home">
      <section className="hero heroEditorial">
        <div className="heroText">
          <div className="eyebrow">PANDIT JI POSTER WALI · CONNAUGHT PLACE</div>
          <h1>Make your walls<br/><em>feel like home.</em></h1>
          <p>Thoughtful art prints for the rooms you love. Find your next favourite from our curated poster collection.</p>
          <div className="heroActs"><Link className="btn btn-dark" to="/search">Shop posters <ArrowRight size={16}/></Link><Link className="btn btn-light" to="/custom-poster">Create a custom print</Link></div>
          <div className="heroContact"><a href="tel:+918383898233">Call 83838 98233</a><span>Connaught Place · near Haldiram’s, New Delhi</span></div>
        </div>
        <div className="heroArt heroEditorialArt"><img className="galleryRoomImage" src="/gallery-room.svg" alt="A warm living room with framed art prints above a sofa"/></div>
      </section>

      <section className="section categoryEditorial" aria-labelledby="shop-categories">
        <div className="sectionHead"><div><div className="eyebrow">FIND YOUR WALL’S MOOD</div><h2 id="shop-categories">Shop by category</h2><p>Explore the collections available in our shop.</p></div></div>
        {categories.length ? <div className="categoryTileGrid">{categories.map((category,index)=><Link className={`categoryTile categoryTone${index%4}`} to={`/category/${encodeURIComponent(category.slug)}`} key={category._id}>
          {category.image&&<img src={category.image} alt="" loading="lazy"/>}<span>{category.name}</span><small>Explore collection</small><ArrowRight aria-hidden="true" size={18}/>
        </Link>)}</div> : <div className="empty categoryEmpty">Shop collections are being prepared. Please check back soon.</div>}
      </section>

      <section className="section featuredEditorial" id="collection" aria-labelledby="featured-title">
        <div className="sectionHead"><div><div className="eyebrow">SELECTED WORKS</div><h2 id="featured-title">Featured collection</h2><p>Published, verified prints from our store.</p></div><Link className="textLink" to="/search">View all posters <ArrowRight size={15}/></Link></div>
        <div className="collectionTools"><label className="sortControl">Sort featured prints <select value={sort} onChange={event=>setSort(event.target.value as typeof sort)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">Newest</option></select></label></div>
        {loading&&<div className="loading">Collection load ho rahi hai…</div>}{catalogError&&<div className="notice" role="status">{catalogError}</div>}
        {verified.length ? <div className="productGrid">{verified.map(renderProduct)}</div> : !loading&&!catalogError ? <div className="empty featuredEmpty"><span className="emptyArtwork" aria-hidden="true">P</span><h3>New prints are on the way</h3><p>Our featured collection will appear here when verified products are published.</p><Link className="btn btn-outline" to="/search">Browse the catalogue</Link></div> : null}
      </section>

      <section className="customEditorial" aria-labelledby="custom-title">
        <div className="customComposition" aria-hidden="true"><div className="compositionFrame"><div className="compositionPrint"><span></span><i></i><b></b></div></div><div className="compositionSwatch"></div></div>
        <div className="customCopy"><div className="eyebrow">MADE FOR YOUR SPACE</div><h2 id="custom-title">Your photo.<br/>Your size.<br/><em>Your wall.</em></h2><p>Bring your own artwork or photograph. Choose a size, paper and frame, then our shop will confirm the details with you.</p><Link className="btn btn-dark" to="/custom-poster">Create a custom print <ArrowRight size={16}/></Link></div>
      </section>

      <section className="benefitsEditorial" aria-labelledby="benefits-title">
        <div className="benefitsIntro"><div className="eyebrow">THE PANDIT JI PROMISE</div><h2 id="benefits-title">Made with care,<br/>from print to frame.</h2></div>
        <div className="benefitItem"><Printer aria-hidden="true"/><b>Premium printing</b><span>Careful colour and crisp detail.</span></div>
        <div className="benefitItem"><ShieldCheck aria-hidden="true"/><b>Quality materials</b><span>Thoughtful paper and finish options.</span></div>
        <div className="benefitItem"><Frame aria-hidden="true"/><b>Sizes and framing</b><span>Choose the fit for your space.</span></div>
        <div className="benefitItem"><MapPin aria-hidden="true"/><b>Connaught Place shop</b><span>Local pickup by arrangement.</span></div>
        <div className="benefitItem"><Truck aria-hidden="true"/><b>Delivery updates</b><span>Order status available online.</span></div>
      </section>

      <section className="storyEditorial" aria-labelledby="story-title">
        <div className="storyMark" aria-hidden="true">P<span>W</span></div>
        <div className="storyCopy"><div className="eyebrow">A LITTLE SHOP IN THE HEART OF DELHI</div><h2 id="story-title">From Connaught Place<br/>to your favourite wall.</h2><p>Pandit Ji Poster Wali is a neighbourhood poster shop with a love for art that makes a space feel personal. Visit us in Connaught Place or explore the collection online.</p><Link className="textLink" to="/about">Read our story <ArrowRight size={15}/></Link></div>
      </section>
    </main>
    <footer className="footer"><div className="footerMain">
      <div><Link to="/" className="brand footerBrand"><span className="logo">P</span><span><strong>Pandit Ji Poster Wali</strong><small>PRINTS THAT FEEL LIKE HOME</small></span></Link><p>A little shop with big ideas.<br/>Connaught Place, New Delhi.</p></div>
      <div><b>Explore</b><Link to="/search">Shop all posters</Link><Link to="/custom-poster">Create your own poster</Link><Link to="/about">About us</Link></div>
      <div><b>Help</b><Link to="/contact">Contact</Link><Link to="/shipping">Shipping</Link><Link to="/policies">Returns</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/faq">FAQ</Link><Link to="/track">Track your order</Link></div>
      <div><b>Visit or call</b><a href="tel:+918383898233">83838 98233</a><a href="https://www.google.com/maps/search/?api=1&query=Haldiram%2C+Connaught+Place%2C+New+Delhi" target="_blank" rel="noreferrer">Connaught Place, near Haldiram’s, New Delhi</a></div>
    </div><div className="footerBottom"><span>Copyright 2026 Pandit Ji Poster Wali</span><span>Made with care in Delhi</span><Link to="/admin/login">Store admin</Link></div></footer>
  </>;
}
