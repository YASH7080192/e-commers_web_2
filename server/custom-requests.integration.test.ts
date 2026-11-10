import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import path from 'node:path';
import { unlink, stat } from 'node:fs/promises';
import { api } from './routes.js';
import { connectDatabase } from './db.js';
import { CustomRequest, Notification, Order, User } from './models.js';

const isolatedDb=/^mongodb:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/pjpw_custom_qa_[a-zA-Z0-9_]+(?:\?.*)?$/.test(process.env.MONGODB_URI||'');
test('custom poster request, private preview, approval and idempotent COD order workflow', {skip:process.env.RUN_CUSTOM_INTEGRATION!=='true'||!isolatedDb}, async()=>{
  process.env.JWT_SECRET='isolated-custom-request-test-secret-at-least-32-chars';
  await connectDatabase();
  const suffix=`${Date.now()}-${Math.random().toString(16).slice(2)}`;const email=`custom-${suffix}@example.test`;
  const app=express();app.use(express.json());app.use('/api',api);app.use((err:any,_req:any,res:any,_next:any)=>res.status(err.status||400).json({error:err.message}));
  const server=await new Promise<ReturnType<typeof app.listen>>(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value))});const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}/api`;
  let adminId='',requestId='',orderId='',requestNumberValue='',original='',preview='';
  try{
    const admin=await User.create({name:'Isolated Custom QA Admin',email:`admin-${email}`,passwordHash:await bcrypt.hash('not-used-in-this-test',10),role:'admin'});adminId=String(admin._id);const token=(await import('jsonwebtoken')).default.sign({id:adminId,role:'admin',email:admin.email},process.env.JWT_SECRET);const headers={Authorization:`Bearer ${token}`};
    const unauth=await fetch(`${base}/admin/custom-requests`);assert.equal(unauth.status,401);
    const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC','base64');
    const form=new FormData();for(const [key,value] of Object.entries({name:'QA Customer',phone:'+91 98765 43210',whatsapp:'+91 98765 43211',email,category:'QA only',title:'QA family poster',size:'A3',paperQuality:'Matte 250 GSM',finish:'Matte finish',frame:'No frame',quantity:'2',address:'10 QA Street, Connaught Place',city:'New Delhi',state:'Delhi',postalCode:'110001',instructions:'QA only workflow',consent:'true'}))form.append(key,value);form.append('image',new File([image],'reference.png',{type:'image/png'}));
    const created=await fetch(`${base}/custom-requests`,{method:'POST',body:form});assert.equal(created.status,201);const data:any=await created.json();requestNumberValue=data.requestNumber;requestId=String(await CustomRequest.findOne({requestNumber:data.requestNumber}).then((r:any)=>r._id));assert.match(data.requestNumber,/^PJC-\d{4}-[A-F0-9]{10}$/);assert.equal(data.status,'New');assert.equal(data.notification.email,false);assert.equal(data.notification.whatsapp,false);
    const stored=await CustomRequest.findById(requestId).select('+accessHashes');assert.ok(stored);original=stored.originalImage;assert.equal(stored.consent,true);assert.equal(stored.quantity,2);assert.equal(stored.status,'New');const originalWithoutAdmin=await fetch(`${base}/admin/custom-requests/${requestId}/original`);assert.equal(originalWithoutAdmin.status,401);const originalForAdmin=await fetch(`${base}/admin/custom-requests/${requestId}/original`,{headers});assert.equal(originalForAdmin.status,200);assert.match(originalForAdmin.headers.get('content-type')||'',/image\/png/);
    const list=await fetch(`${base}/admin/custom-requests?search=${encodeURIComponent(data.requestNumber)}`,{headers});assert.equal(list.status,200);const listBody:any=await list.json();assert.equal(listBody.pagination.total,1);assert.equal(listBody.requests[0].title,'QA family poster');
    const review=await fetch(`${base}/admin/custom-requests/${requestId}`,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'review',internalNotes:'QA review note'})});assert.equal(review.status,200);
    const previewForm=new FormData();previewForm.append('preview',new File([image],'final.png',{type:'image/png'}));const uploaded=await fetch(`${base}/admin/custom-requests/${requestId}/preview`,{method:'POST',headers,body:previewForm});assert.equal(uploaded.status,201);preview=(await CustomRequest.findById(requestId))!.finalPreview;
    const quote=await fetch(`${base}/admin/custom-requests/${requestId}`,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'quote',finalPrice:550,estimatedDelivery:'5 working days',designCategory:'QA design',design:'QA preview ready'})});assert.equal(quote.status,200);const quoteBody:any=await quote.json();assert.equal(quoteBody.request.status,'Quotation Sent');assert.equal(quoteBody.notification.email,false);assert.ok(quoteBody.accessUrl);
    const quoteToken=new URL(quoteBody.accessUrl).searchParams.get('access')!;const portal=await fetch(`${base}/custom-requests/access/${quoteToken}`);assert.equal(portal.status,200);const portalBody:any=await portal.json();assert.equal(portalBody.request.finalPrice,550);assert.match(portalBody.request.finalPreview,/\/api\/custom-requests\/access\//);
    assert.ok((await stat(path.resolve(process.cwd(),'..','.panditji-private-custom-requests',preview))).isFile());const publicImage=await fetch(`http://127.0.0.1:${address.port}${portalBody.request.finalPreview}`);assert.equal(publicImage.status,200,await publicImage.clone().text());assert.match(publicImage.headers.get('content-type')||'',/image\/png/);
    const approved=await fetch(`${base}/custom-requests/access/${quoteToken}/decision`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:'approve',feedback:'Approved QA'})});assert.equal(approved.status,200);assert.equal((await approved.json() as any).status,'Approved');
    const confirmed=await fetch(`${base}/admin/custom-requests/${requestId}/confirm`,{method:'POST',headers});assert.equal(confirmed.status,201);const orderData:any=await confirmed.json();orderId=String(orderData.order._id);assert.equal(orderData.duplicate,false);assert.equal(orderData.order.total,1179);assert.equal(orderData.order.paymentMethod,'cod');assert.equal(String(orderData.order.customRequest),requestId);
    const repeated=await fetch(`${base}/admin/custom-requests/${requestId}/confirm`,{method:'POST',headers});assert.equal(repeated.status,200);assert.equal((await repeated.json() as any).duplicate,true);
    const orders=await fetch(`${base}/admin/orders?search=${orderData.order.orderNumber}`,{headers});assert.equal(orders.status,200);assert.ok(((await orders.json() as any).orders).some((order:any)=>order.orderNumber===orderData.order.orderNumber));
    const saved=await CustomRequest.findById(requestId);assert.equal(String(saved.order),orderId);assert.equal(saved.status,'Confirmed');
    const production=await fetch(`${base}/admin/custom-requests/${requestId}`,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({status:'Printing'})});assert.equal(production.status,200);assert.equal((await Order.findById(orderId))!.status,'Printing');
  }finally{
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    const files=[original,preview].filter(Boolean);await Promise.all(files.map(file=>unlink(path.resolve(process.cwd(),'..','.panditji-private-custom-requests',file)).catch(()=>{})));
    await Promise.all([requestNumberValue?Notification.deleteMany({title:{$regex:requestNumberValue}}):Promise.resolve(),orderId?Notification.deleteMany({order:orderId}):Promise.resolve(),orderId?Order.deleteOne({_id:orderId}):Promise.resolve(),requestId?CustomRequest.deleteOne({_id:requestId}):Promise.resolve(),adminId?User.deleteOne({_id:adminId}):Promise.resolve()]);
    await mongoose.disconnect();
  }
});
