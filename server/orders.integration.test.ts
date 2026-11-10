import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { api } from './routes.js';
import { connectDatabase } from './db.js';
import { Notification, Order, Product, User } from './models.js';

test('real Mongo COD checkout persists, prices server-side, deduplicates and appears in admin', { skip: process.env.RUN_ORDER_INTEGRATION !== 'true' || !process.env.MONGODB_URI }, async () => {
  process.env.JWT_SECRET ||= 'integration-test-secret-that-is-at-least-thirty-two-characters';
  await connectDatabase();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `checkout-${suffix}@example.test`;
  const adminEmail = `admin-${suffix}@example.test`;
  const app = express(); app.use(express.json()); app.use('/api', api);
  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => { const s=app.listen(0,'127.0.0.1',()=>resolve(s)); });
  const address=server.address(); assert.ok(address && typeof address!=='string'); const base=`http://127.0.0.1:${address.port}/api`;
  let productId=''; let customerId=''; let adminId=''; let orderId='';
  try {
    const product=await Product.create({name:`Flow Poster ${suffix}`,slug:`flow-poster-${suffix}`,description:'Integration test poster',category:'Motivation',images:['https://example.test/poster.jpg'],active:true,inventoryVerified:true,variants:[{size:'A4',paperQuality:'Matte 250 GSM',finish:'Unframed',price:199,stock:8}]}); productId=String(product._id);
    const register=await fetch(`${base}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Flow Customer',email,phone:'9876543210',password:'Test-Password-123'})});
    assert.equal(register.status,201); const registered:any=await register.json(); customerId=registered.user.id;
    const key=`checkout-${suffix}`; const requestBody={items:[{productId,variant:{size:'A4',paperQuality:'Matte 250 GSM',finish:'Unframed',price:1},quantity:2}],shippingAddress:{name:'Flow Customer',phone:'9876543210',email,line1:'10 Test Street, Connaught Place',city:'New Delhi',state:'Delhi',postalCode:'110001'},paymentMethod:'cod'};
    const headers={'Content-Type':'application/json',Authorization:`Bearer ${registered.token}`,'Idempotency-Key':key};
    const placed=await fetch(`${base}/orders`,{method:'POST',headers,body:JSON.stringify(requestBody)});assert.equal(placed.status,201);const first:any=await placed.json();orderId=first.order._id;
    assert.equal(first.order.items[0].unitPrice,199);assert.equal(first.order.total,477);assert.match(first.order.orderNumber,/^PJ-\d{4}-[A-F0-9]{16}$/);
    const duplicate=await fetch(`${base}/orders`,{method:'POST',headers,body:JSON.stringify(requestBody)});assert.equal(duplicate.status,200);const second:any=await duplicate.json();assert.equal(second.order._id,orderId);
    const savedProduct=await Product.findById(productId);assert.equal(savedProduct.variants[0].stock,6);
    const tracking=await fetch(`${base}/orders/track/${first.order.orderNumber}`);assert.equal(tracking.status,200);const tracked:any=await tracking.json();assert.equal(tracked.order.items[0].name,product.name);assert.equal(tracked.order.total,477);
    const admin=await User.create({name:'Flow Admin',email:adminEmail,phone:'9876543211',passwordHash:await bcrypt.hash('Admin-Password-123',10),role:'admin'});adminId=String(admin._id);
    const login=await fetch(`${base}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:adminEmail,password:'Admin-Password-123'})});assert.equal(login.status,200);const adminSession:any=await login.json();
    const dashboard=await fetch(`${base}/admin/dashboard`,{headers:{Authorization:`Bearer ${adminSession.token}`}});assert.equal(dashboard.status,200);const data:any=await dashboard.json();assert.ok(data.orders.some((order:any)=>order._id===orderId));
    const invalid=await fetch(`${base}/orders`,{method:'POST',headers:{...headers,'Idempotency-Key':`${key}-invalid`},body:JSON.stringify({...requestBody,items:[{...requestBody.items[0],quantity:9}]})});assert.equal(invalid.status,409);
  } finally {
    await Promise.all([orderId?Notification.deleteMany({order:orderId}):Promise.resolve(),orderId?Order.deleteOne({_id:orderId}):Promise.resolve(),productId?Product.deleteOne({_id:productId}):Promise.resolve(),customerId?User.deleteOne({_id:customerId}):Promise.resolve(),adminId?User.deleteOne({_id:adminId}):Promise.resolve()]);
    await new Promise<void>(resolve=>server.close(()=>resolve())); await mongoose.disconnect();
  }
});
