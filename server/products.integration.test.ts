import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { api } from './routes.js';
import { connectDatabase } from './db.js';
import { Product, User } from './models.js';

const isolatedDb = /^mongodb:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/pjpw_product_qa_[a-zA-Z0-9_]+(?:\?.*)?$/.test(process.env.MONGODB_URI || '');
test('admin product management and local multi-image flow in an isolated QA database', { skip: process.env.RUN_PRODUCT_INTEGRATION !== 'true' || !isolatedDb }, async () => {
  process.env.JWT_SECRET = 'isolated-product-flow-test-secret-32-chars';
  process.env.DISABLE_STARTER_CATALOG = 'true';
  await connectDatabase();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `product-admin-${suffix}@example.test`;
  const slug = `qa-only-product-${suffix}`;
  const app = express(); app.use(express.json());
  app.use('/uploads/products', express.static(path.resolve(process.cwd(), 'uploads', 'products'), { dotfiles: 'deny', index: false }));
  app.use('/api', api);
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 400).json({ error: error.message }));
  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`;
  let adminId = ''; let productId = ''; let imagePaths: string[] = [];
  try {
    const admin = await User.create({ name: 'Isolated QA Admin', email: adminEmail, passwordHash: 'not-used-in-this-test', role: 'admin' }); adminId = String(admin._id);
    const token = jwt.sign({ id: adminId, role: 'admin', email: adminEmail }, process.env.JWT_SECRET);
    const headers = { Authorization: `Bearer ${token}` };
    const unauthorized = await fetch(`${base}/admin/products`); assert.equal(unauthorized.status, 401);

    const pngFixture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
    const uploadForm = new FormData();
    uploadForm.append('images', new File([pngFixture], 'qa-fixture-1.png', { type: 'image/png' }));
    uploadForm.append('images', new File([pngFixture], 'qa-fixture-2.png', { type: 'image/png' }));
    const uploaded = await fetch(`${base}/admin/uploads`, { method: 'POST', headers, body: uploadForm });
    assert.equal(uploaded.status, 201); const uploadedData: any = await uploaded.json(); assert.equal(uploadedData.storage, 'local'); assert.equal(uploadedData.images.length, 2); imagePaths = uploadedData.images;
    assert.ok(imagePaths.every((image: string) => /^\/uploads\/products\/[a-f0-9-]+\.png$/.test(image)));
    const fetchedImage = await fetch(`http://127.0.0.1:${address.port}${imagePaths[0]}`); assert.equal(fetchedImage.status, 200); assert.match(fetchedImage.headers.get('content-type') || '', /image\/png/);

    const spoofForm = new FormData(); spoofForm.append('images', new File(['<html>not an image</html>'], 'spoof.png', { type: 'image/png' }));
    const spoof = await fetch(`${base}/admin/uploads`, { method: 'POST', headers, body: spoofForm }); assert.equal(spoof.status, 400);

    const create = await fetch(`${base}/admin/products`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: `QA ONLY IMAGE FIXTURE ${suffix}`, slug, description: 'Temporary isolated product workflow test fixture.', category: 'QA TEST ONLY', sku: `QA-${suffix}`,
      images: imagePaths, active: true, inventoryVerified: true,
      variants: [
        { size: 'A4', paperQuality: 'Matte 250 GSM', finish: 'Unframed', frame: '', price: 249, originalPrice: 499, stock: 12, sku: `QA-A4-${suffix}`, active: true },
        { size: 'A3', paperQuality: 'Glossy 300 GSM', finish: 'Framed', frame: 'Black', price: 699, originalPrice: 799, stock: 3, sku: `QA-A3-${suffix}`, active: true },
      ], seoTitle: 'QA only', seoDescription: 'Temporary isolated QA fixture',
    }) });
    assert.equal(create.status, 201); const created: any = await create.json(); productId = created.product._id;
    assert.equal(created.product.images[0], imagePaths[0]); assert.equal(created.product.variants.length, 2);

    const categoryList = await fetch(`${base}/admin/products?category=${encodeURIComponent('QA TEST ONLY')}&active=true&page=1&pageSize=1`, { headers });
    assert.equal(categoryList.status, 200); const categoryData: any = await categoryList.json(); assert.equal(categoryData.pagination.total, 1); assert.equal(categoryData.products[0]._id, productId);
    const search = await fetch(`${base}/products?search=${encodeURIComponent('QA ONLY IMAGE FIXTURE')}`); assert.equal(search.status, 200); const searchData: any = await search.json(); assert.ok(searchData.products.some((product: any) => product._id === productId));
    const detail = await fetch(`${base}/products/${slug}`); assert.equal(detail.status, 200); const detailData: any = await detail.json(); assert.deepEqual(detailData.product.images, imagePaths);

    const reordered = [imagePaths[1], imagePaths[0]];
    const update = await fetch(`${base}/admin/products/${productId}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({
      description: 'Updated QA fixture details.', images: reordered,
      variants: [
        { ...created.product.variants[0], price: 279, originalPrice: 499, stock: 9 },
        { ...created.product.variants[1], price: 749, stock: 2 },
        { size: 'A2', paperQuality: 'Matte 250 GSM', finish: 'Unframed', frame: '', price: 399, stock: 5, sku: `QA-A2-${suffix}`, active: true },
      ], seoTitle: 'QA updated title',
    }) });
    assert.equal(update.status, 200); const updated: any = await update.json(); assert.deepEqual(updated.product.images, reordered); assert.equal(updated.product.variants[0].price, 279); assert.equal(updated.product.variants[0].stock, 9); assert.equal(updated.product.variants.length, 3); assert.equal(updated.product.active, true); assert.equal(updated.product.inventoryVerified, true);
    const updatedDetail = await fetch(`${base}/products/${slug}`); assert.equal(updatedDetail.status, 200, JSON.stringify(await updatedDetail.clone().json())); const updatedData: any = await updatedDetail.json(); assert.equal(updatedData.product.description, 'Updated QA fixture details.'); assert.equal(updatedData.product.images[0], imagePaths[1]);

    const archived = await fetch(`${base}/admin/products/${productId}`, { method: 'DELETE', headers }); assert.equal(archived.status, 200);
    const hidden = await fetch(`${base}/products?search=${encodeURIComponent('QA ONLY IMAGE FIXTURE')}`); const hiddenData: any = await hidden.json(); assert.ok(!hiddenData.products.some((product: any) => product._id === productId));
    const inactiveList = await fetch(`${base}/admin/products?active=false&search=${encodeURIComponent(suffix)}`, { headers }); const inactiveData: any = await inactiveList.json(); assert.ok(inactiveData.products.some((product: any) => product._id === productId));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (productId) await Product.deleteOne({ _id: productId });
    if (adminId) await User.deleteOne({ _id: adminId });
    await Promise.all(imagePaths.map(image => unlink(path.resolve(process.cwd(), 'uploads', 'products', path.basename(image))).catch(() => {})));
    await mongoose.disconnect();
  }
});
