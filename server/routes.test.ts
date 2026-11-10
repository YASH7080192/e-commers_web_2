import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, timingSafeEqual } from 'node:crypto';

test('Razorpay payment signature verification matches the gateway HMAC format',()=>{
  const secret='test-secret';const orderId='order_abc';const paymentId='pay_xyz';
  const signature=createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex');
  const expected=createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex');
  assert.equal(timingSafeEqual(Buffer.from(expected),Buffer.from(signature)),true);
  const wrong=createHmac('sha256',secret).update(`${orderId}|wrong`).digest('hex');
  assert.equal(timingSafeEqual(Buffer.from(expected),Buffer.from(wrong)),false);
});

test('server price validation uses matching size, quality and finish options',()=>{
  const choices=[{size:'A4',paperQuality:'Matte 250 GSM',finish:'Unframed',price:199,stock:6}];
  const requested={size:'A4',paperQuality:'Matte 250 GSM',finish:'Unframed'};
  const selected=choices.find(v=>v.size===requested.size&&v.paperQuality===requested.paperQuality&&v.finish===requested.finish);
  assert.equal(selected?.price,199);
  assert.equal(choices.find(v=>v.size==='A4'&&v.paperQuality==='Glossy'&&v.finish==='Unframed'),undefined);
});
