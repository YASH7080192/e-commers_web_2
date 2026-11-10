import nodemailer from 'nodemailer';
import { v2 as cloudinary } from 'cloudinary';
import { Notification, Order } from './models.js';
export async function sendOrderNotice(order:any){
  await Notification.create({type:'new-order',title:`New order ${order.orderNumber}`,message:`${order.customer.name} · ₹${order.total}`,order:order._id});
  if(process.env.SMTP_HOST&&process.env.ADMIN_NOTIFICATION_EMAIL){const tx=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT)===465,auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});await tx.sendMail({from:process.env.SMTP_USER||process.env.ADMIN_NOTIFICATION_EMAIL,to:process.env.ADMIN_NOTIFICATION_EMAIL,subject:`New order ${order.orderNumber}`,text:`${order.customer.name} · ${order.customer.phone}\nTotal ₹${order.total}\n${order.items.map((i:any)=>`${i.name} ${i.size} × ${i.quantity}`).join('\n')}`}).catch(e=>console.error('Admin email failed:',e.message));}
  if(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID&&process.env.ADMIN_WHATSAPP_TO){const api=process.env.WHATSAPP_API_VERSION||'v23.0';await fetch(`https://graph.facebook.com/${api}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:process.env.ADMIN_WHATSAPP_TO,type:'text',text:{body:`New order ${order.orderNumber}\n${order.customer.name} · ${order.customer.phone}\nTotal ₹${order.total}`}})}).catch(e=>console.error('WhatsApp failed:',e.message));}
}
export async function sendCustomerUpdate(order:any){if(process.env.SMTP_HOST&&order.customer.email){const tx=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT)===465,auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});await tx.sendMail({from:process.env.SMTP_USER||process.env.ADMIN_NOTIFICATION_EMAIL,to:order.customer.email,subject:`${order.orderNumber} order update`,text:`Namaste ${order.customer.name}, aapke order ${order.orderNumber} ka status ${order.status} ho gaya hai.`}).catch(e=>console.error('Customer email failed:',e.message));}}
async function mailer(){if(!process.env.SMTP_HOST)return null;return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT)===465,auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});}
export async function sendVerificationEmail(user:any){
  const tx=await mailer();if(!tx||!user.emailVerificationToken)return false;
  const url=`${process.env.CLIENT_URL||'http://localhost:5173'}/verify-email?token=${encodeURIComponent(user.emailVerificationToken)}`;
  await tx.sendMail({from:process.env.SMTP_USER||process.env.ADMIN_NOTIFICATION_EMAIL,to:user.email,subject:'Verify your Pandit Ji Poster Wali email',text:`Verify your email: ${url}`});
  return true;
}
export async function sendPasswordResetEmail(user:any){
  const tx=await mailer();if(!tx||!user.passwordResetToken)return false;
  const url=`${process.env.CLIENT_URL||'http://localhost:5173'}/reset-password?token=${encodeURIComponent(user.passwordResetToken)}`;
  await tx.sendMail({from:process.env.SMTP_USER||process.env.ADMIN_NOTIFICATION_EMAIL,to:user.email,subject:'Reset your Pandit Ji Poster Wali password',text:`Reset your password: ${url}`});
  return true;
}
export async function sendCustomRequestNotice(request:any, accessUrl:string, kind:'received'|'quotation'|'approved'|'changes'|'rejected'){
  const configured={email:Boolean(process.env.SMTP_HOST&&request.email),whatsapp:Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID&&(request.whatsapp||request.phone))};
  const subject=`Custom poster ${request.requestNumber}: ${kind==='quotation'?'quotation ready':kind}`;
  const quote=kind==='quotation'?`\nQuotation: ₹${request.finalPrice} · ${request.estimatedDelivery}\nPreview and respond securely: ${accessUrl}`:'';
  const orderInfo=request.order?.orderNumber?`\nConfirmed order: ${request.order.orderNumber}`:'';
  const body=`Namaste ${request.name},\nYour custom poster request ${request.requestNumber} is ${kind}.${quote}${orderInfo}\n\n${kind==='received'?'The shop will review your request and share design and price details. This is not an order confirmation.':'Open your secure request link for details.'}\n${accessUrl}`;
  let emailSent=false,whatsappSent=false;
  if(configured.email){try{const tx=await mailer();if(tx){await tx.sendMail({from:process.env.SMTP_USER||process.env.ADMIN_NOTIFICATION_EMAIL,to:request.email,subject,text:body});emailSent=true}}catch(error:any){console.error('Custom request email failed:',error.message)}}
  if(configured.whatsapp){try{const api=process.env.WHATSAPP_API_VERSION||'v23.0';const digits=(request.whatsapp||request.phone).replace(/\D/g,'');const to=digits.length===10?`91${digits}`:digits;const response=await fetch(`https://graph.facebook.com/${api}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{body}})});whatsappSent=response.ok;if(!response.ok)console.error('Custom request WhatsApp failed:',response.status)}catch(error:any){console.error('Custom request WhatsApp failed:',error.message)}}
  return {email:emailSent,whatsapp:whatsappSent,configured};
}
export function configureCloudinary(){if(process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET)cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});return cloudinary;}
export async function notifyOrderChange(orderId:string){const order=await Order.findById(orderId);if(order)await sendCustomerUpdate(order)}
