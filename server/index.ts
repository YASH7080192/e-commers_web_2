import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import { connectDatabase } from './db.js';
import { api } from './routes.js';
import { Category, Product } from './models.js';

const app=express();
const siteBase=(process.env.PUBLIC_SITE_URL||process.env.CLIENT_URL||'http://localhost:5173').replace(/\/$/,'');
const sitemapHandler=async(_req:express.Request,res:express.Response)=>{try{const [categories,products]=await Promise.all([Category.find({active:true}).select('slug').lean(),Product.find({active:true,inventoryVerified:true}).select('slug').lean()]);const paths=['/','/about','/contact','/faq','/shipping','/policies','/privacy','/terms','/search',...categories.map((x:any)=>'/category/'+x.slug),...products.map((x:any)=>'/product/'+x.slug)];const urls=paths.map(route=>'<url><loc>'+siteBase+route.replace(/&/g,'&amp;')+'</loc></url>').join('');res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>')}catch(error){res.status(500).type('text/plain').send('Sitemap unavailable')}};
app.get('/sitemap.xml',sitemapHandler);
app.get('/robots.txt',(_req,res)=>res.type('text/plain').send(['User-agent: *','Allow: /','Disallow: /admin','Disallow: /api/','Sitemap: '+siteBase+'/sitemap.xml'].join(String.fromCharCode(10))));

app.disable('x-powered-by');
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
const configuredOrigins=(process.env.CLIENT_URL||'http://localhost:5173,http://localhost:5174').split(',').map(value=>value.trim()).filter(Boolean);
app.use(cors({origin:(origin,callback)=>{const localDevelopment=process.env.NODE_ENV!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+):\d+$/.test(origin||'');if(!origin||configuredOrigins.includes(origin)||localDevelopment)return callback(null,true);return callback(new Error('Origin is not allowed by CORS'))},credentials:true}));
app.use(express.json({limit:'1mb'}));
app.use('/uploads/products',express.static(path.resolve(process.cwd(),'uploads','products'),{dotfiles:'deny',index:false,fallthrough:false,immutable:true,maxAge:'365d'}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}));
app.use('/api',rateLimit({windowMs:60*1000,limit:180,standardHeaders:true,legacyHeaders:false}),api);
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{if(err?.name==='ZodError')return res.status(400).json({error:'Invalid request data',details:err.issues?.map((i:any)=>({field:i.path.join('.'),message:i.message}))});if(err?.code===11000)return res.status(409).json({error:'This record already exists'});if(err instanceof multer.MulterError)return res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({error:err.code==='LIMIT_FILE_SIZE'?'Each image must be 8 MB or smaller':'Upload no more than five images at a time'});if(err?.message==='Only JPEG, PNG or WebP images are allowed')return res.status(400).json({error:err.message});const status=Number(err?.status)||500;if(status>=500)console.error(err);res.status(status).json({error:status>=500?'Internal server error':err.message||'Request failed'})});
async function start(){await connectDatabase();const port=Number(process.env.PORT||4000);app.listen(port,()=>console.log('API listening on http://localhost:'+port))}
start().catch(e=>{console.error('Server startup failed:',e);process.exit(1)});
