import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, CircleHelp, FolderOpen, Image, LayoutDashboard, LogOut, Megaphone, Menu, Package, Plus, RotateCcw, Settings, ShoppingBag, Star, Tags, Truck, Users, X, Clock3 } from 'lucide-react';
import { request } from './api';

const AdminProducts = lazy(() => import('./AdminProducts'));
const AdminCategories = lazy(() => import('./AdminCategories'));
const AdminOrders = lazy(() => import('./AdminOrders'));
const AdminCustomers = lazy(() => import('./AdminCustomers'));
const AdminReviews = lazy(() => import('./AdminReviews'));
const AdminSettings = lazy(() => import('./AdminSettings'));
const AdminCustomRequests = lazy(() => import('./AdminCustomRequests'));
const AdminPOS = lazy(() => import('./AdminPOS'));
const AdminBannerManager = lazy(() => import('./AdminTools').then(module => ({ default: module.AdminBannerManager })));
const AdminCouponManager = lazy(() => import('./AdminTools').then(module => ({ default: module.AdminCouponManager })));
const AdminQuestionManager = lazy(() => import('./AdminTools').then(module => ({ default: module.AdminQuestionManager })));
const AdminReturnManager = lazy(() => import('./AdminTools').then(module => ({ default: module.AdminReturnManager })));

type DashboardData = {
  summary?: Record<string, number>;
  orders?: Array<{ _id: string; orderNumber: string; status: string; total: number; channel: string }>;
  products?: Array<{ _id: string; name: string; category: string; active: boolean }>;
  monthly?: Array<{ _id: string; revenue: number; orders: number }>;
};
type IconComponent = typeof LayoutDashboard;

const money = (value: number) => `${String.fromCodePoint(0x20b9)}${Number(value || 0).toLocaleString('en-IN')}`;

function useAdminAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('pjpw_token');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let active = true;
    setVerified(false);
    if (!token) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
      return () => { active = false; };
    }
    request<{ user: { role: string } }>('/auth/me').then(result => {
      if (!active) return;
      if (result.user?.role !== 'admin') {
        localStorage.removeItem('pjpw_token');
        navigate('/admin/login', { replace: true });
        return;
      }
      setVerified(true);
    }).catch(() => {
      if (!active) return;
      localStorage.removeItem('pjpw_token');
      navigate('/admin/login', { replace: true });
    });
    return () => { active = false; };
  }, [location.pathname, navigate, token]);

  return verified;
}

function SidebarItem({ to, icon: Icon, label, end, onClick }: { to: string; icon: IconComponent; label: string; end?: boolean; onClick?: () => void }) {
  return <NavLink to={to} end={end} onClick={onClick} className={({ isActive }) => `adminSideItem${isActive ? ' adminSideItemActive' : ''}`}>
    <span className="adminSideIcon"><Icon size={16} strokeWidth={1.8}/></span><span className="adminSideLabel">{label}</span>
  </NavLink>;
}

function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('pjpw_token');
    navigate('/admin/login', { replace: true });
  };
  const item = (to: string, icon: IconComponent, label: string, end = false) => <SidebarItem key={to} to={to} icon={icon} label={label} end={end} onClick={onClose}/>;
  return <>
    {open && <button className="adminSideBackdrop" aria-label="Close navigation" onClick={onClose}/>}
    <aside className={`adminSidebar${open ? ' adminSidebarOpen' : ''}`}>
      <div className="adminSideHeader"><Link to="/admin" className="adminSideLogo" onClick={onClose}><span className="adminSideLogoIcon">P</span><span><strong>Pandit Ji</strong><small>Admin Panel</small></span></Link><button className="adminSideClose" onClick={onClose} aria-label="Close menu"><X size={18}/></button></div>
      <nav className="adminSideNav" aria-label="Admin navigation">
        <div className="adminSideGroup"><div className="adminSideGroupLabel">OVERVIEW</div>{item('/admin', LayoutDashboard, 'Dashboard', true)}</div>
        <div className="adminSideGroup"><div className="adminSideGroupLabel">CATALOGUE</div>{item('/admin/products', Package, 'Products')}{item('/admin/products/new', Plus, 'Add Product', true)}{item('/admin/categories', FolderOpen, 'Categories')}</div>
        <div className="adminSideGroup"><div className="adminSideGroupLabel">SALES</div>{item('/admin/orders', ShoppingBag, 'Orders')}{item('/admin/pos', BarChart3, 'Offline Sale')}{item('/admin/custom-requests', Image, 'Custom Requests')}</div>
        <div className="adminSideGroup"><div className="adminSideGroupLabel">PEOPLE</div>{item('/admin/customers', Users, 'Customers')}{item('/admin/reviews', Star, 'Reviews')}{item('/admin/questions', CircleHelp, 'Questions')}{item('/admin/returns', RotateCcw, 'Returns')}</div>
        <div className="adminSideGroup"><div className="adminSideGroupLabel">MARKETING</div>{item('/admin/coupons', Tags, 'Coupons')}{item('/admin/banners', Megaphone, 'Banners')}</div>
        <div className="adminSideGroup"><div className="adminSideGroupLabel">SYSTEM</div>{item('/admin/settings', Settings, 'Settings')}<a className="adminSideItem" href="/api/admin/reports/sales.csv"><span className="adminSideIcon"><BarChart3 size={16}/></span><span className="adminSideLabel">Sales CSV</span></a></div>
      </nav>
      <div className="adminSideFooter"><Link to="/" className="adminSideItem" target="_blank"><span className="adminSideIcon"><ShoppingBag size={16}/></span><span className="adminSideLabel">View Store</span><ArrowRight size={14}/></Link><button className="adminSideItem adminSideLogout" onClick={logout}><span className="adminSideIcon"><LogOut size={16}/></span><span className="adminSideLabel">Logout</span></button></div>
    </aside>
  </>;
}

function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return <header className="adminTopBar"><button className="adminMenuBtn" onClick={onMenuClick} aria-label="Open admin navigation"><Menu size={20}/></button><div className="adminTopBarBrand"><span>Admin Panel</span><small>Pandit Ji Poster Wali</small></div><div className="adminTopBarActions"><Link to="/admin/orders" className="adminTopBarLink">Orders</Link><Link to="/admin/products" className="adminTopBarLink">Products</Link><Link to="/" target="_blank" className="adminTopBarLink">Store <ArrowRight size={13}/></Link></div></header>;
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { request<DashboardData>('/admin/dashboard').then(setData).catch(reason => setError(reason.message)); }, []);
  const summary = data?.summary || {};
  const cards: Array<{ key: string; label: string; icon: IconComponent; currency?: boolean }> = [
    { key: 'revenue', label: 'Total Revenue', icon: BarChart3, currency: true },
    { key: 'orders', label: 'Total Orders', icon: ShoppingBag },
    { key: 'newOrders', label: 'New Orders', icon: Package },
    { key: 'pending', label: 'Pending', icon: Clock3 },
    { key: 'processing', label: 'Processing', icon: Settings },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'completed', label: 'Delivered', icon: CheckCircle2 },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'lowStock', label: 'Low Stock', icon: AlertTriangle },
  ];
  return <div className="adminContent">
    <div className="adminPageHead"><div><div className="adminEyebrow">SHOP CONTROL</div><h1 className="adminPageTitle">Dashboard</h1><p className="adminPageSub">A clear overview of your store.</p></div><div className="adminPageHeadActions"><Link to="/admin/products/new" className="adminBtn adminBtnDark"><Plus size={16}/> Add Product</Link><Link to="/admin/orders" className="adminBtn adminBtnOutline">View Orders</Link></div></div>
    {error && <div className="adminNotice adminNoticeError" role="alert">{error}</div>}
    {!data ? <div className="adminLoading">Loading dashboard…</div> : <>
      <div className="adminStatGrid">{cards.map(card => <div className="adminStatCard" key={card.key}><div className="adminStatIcon"><card.icon size={22} strokeWidth={1.8}/></div><div><div className="adminStatLabel">{card.label}</div><div className="adminStatValue">{card.currency ? money(summary[card.key] || 0) : summary[card.key] ?? 0}</div></div></div>)}</div>
      <div className="adminQuickLinks">
        <Link to="/admin/orders" className="adminQuickCard"><ShoppingBag size={18}/>Customer Orders{(summary.newOrders || 0) > 0 && <span className="adminBadge">{summary.newOrders} NEW</span>}</Link>
        <Link to="/admin/products" className="adminQuickCard"><Package size={18}/>Manage Products</Link><Link to="/admin/products/new" className="adminQuickCard"><Plus size={18}/>Add Product</Link>
        <Link to="/admin/pos" className="adminQuickCard"><BarChart3 size={18}/>Offline Sale</Link><Link to="/admin/custom-requests" className="adminQuickCard"><Image size={18}/>Custom Requests</Link><Link to="/admin/categories" className="adminQuickCard"><FolderOpen size={18}/>Categories</Link>
        <Link to="/admin/customers" className="adminQuickCard"><Users size={18}/>Customers</Link><Link to="/admin/reviews" className="adminQuickCard"><Star size={18}/>Reviews</Link><Link to="/admin/settings" className="adminQuickCard"><Settings size={18}/>Settings</Link>
        <a href="/api/admin/reports/sales.csv" className="adminQuickCard"><BarChart3 size={18}/>Sales Report</a>
      </div>
      {data.monthly?.length ? <section className="adminSection"><div className="adminSectionHead"><h2 className="adminSectionTitle">Monthly Revenue</h2></div><div className="adminTable"><table><thead><tr><th>Month</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>{data.monthly.map(month => <tr key={month._id}><td>{month._id}</td><td>{month.orders}</td><td>{money(month.revenue)}</td></tr>)}</tbody></table></div></section> : null}
      {data.orders?.length ? <section className="adminSection"><div className="adminSectionHead"><h2 className="adminSectionTitle">Recent Orders</h2><Link to="/admin/orders" className="adminTextLink">View all <ArrowRight size={13}/></Link></div><div className="adminTable"><table><thead><tr><th>Order #</th><th>Channel</th><th>Status</th><th>Total</th></tr></thead><tbody>{data.orders.map(order => <tr key={order._id}><td><b>{order.orderNumber}</b></td><td><span className="adminTag">{order.channel}</span></td><td><span className="adminTag">{order.status}</span></td><td><b>{money(order.total)}</b></td></tr>)}</tbody></table></div></section> : null}
      {data.products?.length ? <section className="adminSection"><div className="adminSectionHead"><h2 className="adminSectionTitle">Products</h2><Link to="/admin/products" className="adminTextLink">Manage <ArrowRight size={13}/></Link></div><div className="adminTable"><table><thead><tr><th>Name</th><th>Category</th><th>Status</th></tr></thead><tbody>{data.products.map(product => <tr key={product._id}><td><b>{product.name}</b></td><td>{product.category}</td><td><span className={`adminTag ${product.active ? 'adminTagGreen' : 'adminTagGray'}`}>{product.active ? 'Active' : 'Archived'}</span></td></tr>)}</tbody></table></div></section> : null}
    </>}
  </div>;
}

function AdminShell() {
  const authenticated = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!authenticated) return <div className="adminLoading">Checking administrator access…</div>;
  return <div className="adminShell"><AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)}/><div className="adminMain"><AdminHeader onMenuClick={() => setMenuOpen(value => !value)}/><div className="adminBody"><Suspense fallback={<div className="adminLoading">Loading page…</div>}><Outlet/></Suspense></div></div></div>;
}

export default function AdminLayout() {
  return <Routes><Route element={<AdminShell/>}><Route index element={<AdminDashboard/>}/><Route path="products/*" element={<AdminProducts/>}/><Route path="categories" element={<AdminCategories/>}/><Route path="orders" element={<AdminOrders/>}/><Route path="pos" element={<AdminPOS/>}/><Route path="customers" element={<AdminCustomers/>}/><Route path="reviews" element={<AdminReviews/>}/><Route path="custom-requests" element={<AdminCustomRequests/>}/><Route path="settings" element={<AdminSettings/>}/><Route path="coupons" element={<AdminCouponManager/>}/><Route path="banners" element={<AdminBannerManager/>}/><Route path="questions" element={<AdminQuestionManager/>}/><Route path="returns" element={<AdminReturnManager/>}/></Route></Routes>;
}
