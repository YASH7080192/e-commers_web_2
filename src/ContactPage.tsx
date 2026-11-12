import { ArrowUpRight, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  return <main className="contactPage">
    <div className="eyebrow">VISIT OR CALL</div>
    <h1>We’re here to help.</h1>
    <p>Get in touch about a poster, a custom print, or a visit to our shop.</p>
    <div className="contactCards">
      <a className="contactCard" href="tel:+918383898233"><Phone/><span><small>CALL US</small><strong>83838 98233</strong></span><ArrowUpRight/></a>
      <a className="contactCard" href="https://www.google.com/maps/search/?api=1&query=Haldiram%2C+Connaught+Place%2C+New+Delhi"><MapPin/><span><small>FIND THE SHOP</small><strong>Connaught Place, near Haldiram’s, New Delhi</strong></span><ArrowUpRight/></a>
    </div>
  </main>;
}
