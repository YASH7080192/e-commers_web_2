import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './db.js';
import { User } from './models.js';
async function seed(){const {ADMIN_EMAIL,ADMIN_PASSWORD,ADMIN_NAME}=process.env;if(!ADMIN_EMAIL||!ADMIN_PASSWORD||ADMIN_PASSWORD.length<12)throw new Error('Set ADMIN_EMAIL and a 12+ character ADMIN_PASSWORD in .env first');await connectDatabase();const email=ADMIN_EMAIL.toLowerCase();const passwordHash=await bcrypt.hash(ADMIN_PASSWORD,12);await User.findOneAndUpdate({email},{$set:{name:ADMIN_NAME||'Shop Admin',email,passwordHash,role:'admin',disabled:false}},{upsert:true,new:true});console.log(`Admin account ready: ${email}`);process.exit(0)}seed().catch(e=>{console.error(e);process.exit(1)});
