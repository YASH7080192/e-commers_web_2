import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './models.js';
export type AuthRequest = Request & { user?: { id:string; role:string; email:string } };
export async function authenticate(req:AuthRequest,res:Response,next:NextFunction){try{const h=req.headers.authorization;if(!h?.startsWith('Bearer '))return res.status(401).json({error:'Sign in required'});const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET not configured');const payload=jwt.verify(h.slice(7),secret) as {id:string;role:string;email:string};const user=await User.findById(payload.id).select('role email disabled');if(!user||user.disabled)return res.status(401).json({error:'Account unavailable'});req.user={id:String(user._id),role:String(user.role),email:String(user.email)};next()}catch{return res.status(401).json({error:'Invalid or expired session'})}}
export function requireAdmin(req:AuthRequest,res:Response,next:NextFunction){if(req.user?.role!=='admin')return res.status(403).json({error:'Administrator access required'});next()}
