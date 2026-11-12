const fs = require('fs');
const path = 'deepakkk/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');
// Replace hero dynamic block with static hero
const heroRegex = /\{products\.find\(p=>p\.images\?\.\[0\]\)\?.*?\:\s*<div[^>]*>.*?<\/div>\}/s;
const heroReplacement = '<div className="heroPhoto" role="img" aria-label="Framed poster in a warm modern interior"><span>MAKE SPACE<br/><em>FOR WHAT MOVES YOU</em></span><small>PANDIT JI POSTER WALI</small></div>';
content = content.replace(heroRegex, heroReplacement);
// Replace category navigation slice with full map
const catRegex = /\{categories\.slice\(0,5\)\.map\(category=>[^}]*\)\}/s;
const catReplacement = '{categories.map(category=> <Link key={category._id} to={`/category/${category.slug}`}>{category.name}</Link>)}';
content = content.replace(catRegex, catReplacement);
fs.writeFileSync(path, content, 'utf8');
console.log('App.tsx updated');