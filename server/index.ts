import 'dotenv/config';
import { connectDatabase } from './db.js';
import { app } from './app.js';
async function start(){await connectDatabase();const port=Number(process.env.PORT||4000);app.listen(port,()=>console.log('API listening on http://localhost:'+port))}
start().catch(e=>{console.error('Server startup failed:',e);process.exit(1)});
