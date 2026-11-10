import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { request } from './api';

const ErrorNote=({message}:{message:string})=><div className="notice">{message}</div>;
export function ForgotPassword(){
  const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{const r=await request<{message:string}>('/auth/password-reset/request',{method:'POST',body:JSON.stringify({email})});setMessage(r.message)}catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}};
  return <main className="authPage"><section className="authCard"><div className="eyebrow">ACCOUNT SECURITY</div><h1>Forgot password?</h1><p>Enter your account email. If SMTP is configured, reset instructions will be delivered.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>{error&&<ErrorNote message={error}/>} {message&&<div className="notice">{message}</div>}<button className="btn btn-dark full" disabled={busy}>{busy?'Submitting…':'Request reset link'}</button></form><p><Link to="/login">Back to sign in</Link></p></section></main>;
}
export function ResetPassword(){
  const [params]=useSearchParams(),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(password!==confirm){setError('Passwords do not match');return}setBusy(true);setError('');try{await request('/auth/password-reset/confirm',{method:'POST',body:JSON.stringify({token:params.get('token')||'',password})});setMessage('Password updated. You can now sign in.')}catch(e){setError(e instanceof Error?e.message:'Reset failed')}finally{setBusy(false)}};
  return <main className="authPage"><section className="authCard"><div className="eyebrow">ACCOUNT SECURITY</div><h1>Set a new password</h1>{message?<><div className="notice">{message}</div><Link className="btn btn-dark full" to="/login">Sign in</Link></>:<form onSubmit={submit}><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required autoComplete="new-password"/></label><label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required autoComplete="new-password"/></label>{error&&<ErrorNote message={error}/>}<button className="btn btn-dark full" disabled={busy}>{busy?'Saving…':'Reset password'}</button></form>}</section></main>;
}
export function VerifyEmail(){
  const [params]=useSearchParams(),[state,setState]=useState<'idle'|'loading'|'success'|'error'>('idle'),[error,setError]=useState('');
  const verify=async()=>{setState('loading');try{await request(`/auth/verify-email?token=${encodeURIComponent(params.get('token')||'')}`);setState('success')}catch(e){setError(e instanceof Error?e.message:'Verification failed');setState('error')}};
  return <main className="authPage"><section className="authCard"><div className="eyebrow">ACCOUNT SECURITY</div><h1>Email verification</h1>{state==='success'?<><div className="notice">Email verified successfully.</div><Link className="btn btn-dark full" to="/login">Continue to sign in</Link></>:<><p>Verify your email address to complete account setup.</p>{error&&<ErrorNote message={error}/>}<button className="btn btn-dark full" onClick={()=>void verify()} disabled={state==='loading'}>{state==='loading'?'Verifying…':'Verify email'}</button></>}</section></main>;
}
