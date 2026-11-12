const fs = require('node:fs');
const file = 'src/App.tsx';
let s = fs.readFileSync(file, 'utf8');
s = s.replace("import CustomOrderPage from './CustomOrderPage';", "import CustomOrderPage from './CustomOrderPage';\nimport ContactPage from './ContactPage';");
const heroStart = s.indexOf('<section className="hero heroEditorial">');
const collectionStart = s.indexOf('<section className="section" id="collection">', heroStart);
if (heroStart < 0 || collectionStart < 0) throw new Error('homepage hero/collection anchors missing');
const hero = '<section className="hero heroEditorial"><div className="heroText"><div className="eyebrow">PANDIT JI POSTER WALI · CONNAUGHT PLACE</div><h1>Make your walls<br/><em>feel like home.</em></h1><p>Thoughtful art prints for the rooms you love. Find your next favourite from our curated poster collection.</p><div className="heroActs"><Link className="btn btn-dark" to="/search">Shop posters <ArrowRight size={16}/></Link><Link className="btn btn-light" to="/custom-poster">Create a custom print</Link></div><div className="heroContact"><a href="tel:+918383898233">Call 83838 98233</a><span>Connaught Place · near Haldiram’s, New Delhi</span></div></div><div className="heroArt heroEditorialArt"><img className="galleryRoomImage" src="/gallery-room.svg" alt="A warm living room with five framed art posters above a sofa"/></div></section>';
s = s.slice(0, heroStart) + hero + s.slice(collectionStart);
const categoryNav = /<div className="categoryNav">[\s\S]*?<\/div>/;
if (!categoryNav.test(s)) throw new Error('duplicate category nav missing');
s = s.replace(categoryNav, '');
for (const marker of ['<section className="featureBand customEditorial"', '<section className="perks benefitsEditorial"', '<section className="promise storyEditorial"']) {
  const start = s.indexOf(marker);
  if (start >= 0) {
    const end = s.indexOf('</section>', start);
    if (end < 0) throw new Error(`section close missing: ${marker}`);
    s = s.slice(0, start) + s.slice(end + '</section>'.length);
  }
}
s = s.replace(/<Route path="\/contact" element=\{<SimplePage title="Baat karte hain\." text="[^"]*"\/>\}\/>/, '<Route path="/contact" element={<ContactPage/>}/>');
const shopVisit = /<div><b>Shop visit<\/b>[\s\S]*?<\/div><\/div><div className="footerBottom">/;
if (!shopVisit.test(s)) throw new Error('footer shop visit block missing');
s = s.replace(shopVisit, '<div><b>Visit or call</b><a href="tel:+918383898233">83838 98233</a><a href="https://www.google.com/maps/search/?api=1&query=Haldiram%2C+Connaught+Place%2C+New+Delhi" target="_blank" rel="noreferrer">Connaught Place, near Haldiram’s, New Delhi</a></div></div><div className="footerBottom">');
fs.writeFileSync(file, s, 'utf8');
