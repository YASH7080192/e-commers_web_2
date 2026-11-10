import 'dotenv/config';
import { connectDatabase } from './db.js';
import { Category, Product } from './models.js';

type SeedProduct = {
  name: string;
  category: string;
  description: string;
  quote: string;
  bg: string;
  image: string;
  prices: [number, number, number];
  tag?: string;
  featured?: boolean;
};

const imagePool = [
  'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85',
];

const products: SeedProduct[] = [
  ['Shree Ganesh Blessings', 'Bhakti', 'A warm devotional print for a peaceful entrance or pooja corner.', 'श्री गणेशाय नमः', '#e7c89f', 'Bestseller'],
  ['Mahadev Meditation', 'Bhakti', 'A calm Mahadev artwork that brings stillness to your everyday space.', 'हर हर महादेव', '#c8d2cf', 'Popular'],
  ['Radha Krishna Ras', 'Bhakti', 'Soft devotional colours for a loving home and thoughtful gifting.', 'राधे राधे', '#e6c6bd', 'Gift idea'],
  ['Hanuman Ji Courage', 'Bhakti', 'A bold Hanuman Ji poster made for a strong and positive wall.', 'जय बजरंग बली', '#d99961', ''],
  ['Durga Maa Shakti', 'Bhakti', 'A graceful Durga Maa print for strength, faith and festive décor.', 'या देवी सर्वभूतेषु', '#d7a09c', 'New'],
  ['Believe in Yourself', 'Motivational', 'A daily reminder to keep moving towards the work that matters.', 'BELIEVE IN YOURSELF', '#dfc6aa', 'Bestseller'],
  ['Small Steps Every Day', 'Motivational', 'Minimal typography for a home office, study or creative corner.', 'SMALL STEPS\\nEVERY DAY', '#d4dfca', ''],
  ['Make It Happen', 'Motivational', 'An energetic statement print for ambitious walls.', 'MAKE IT HAPPEN', '#e8b866', 'Popular'],
  ['Good Things Take Time', 'Motivational', 'A gentle reminder for slow mornings and long-term dreams.', 'GOOD THINGS\\nTAKE TIME', '#c8d4e0', ''],
  ['Dilli Dil Se', 'Bollywood', 'A love letter to the city, its stories and its unforgettable energy.', 'DILLI MERI JAAN', '#ead5b4', 'Delhi special'],
  ['Filmy Nights', 'Bollywood', 'A cinematic print for the movie lover’s room or media wall.', 'FILMY NIGHTS', '#332b2b', ''],
  ['Retro Cinema Club', 'Bollywood', 'Old-school cinema character for a nostalgic, playful space.', 'PICTURE ABHI BAAKI HAI', '#d9af75', ''],
  ['Anime Dreamscape', 'Anime', 'A colourful illustrated dreamscape for collectors and fans.', 'DREAM\\nBIGGER', '#b8c5e1', 'New'],
  ['Sakura Evening', 'Anime', 'A serene cherry-blossom scene with a soft Japanese poster palette.', 'SAKURA EVENING', '#e8c1c6', ''],
  ['Mecha Future', 'Anime', 'A graphic futuristic print for a gaming setup or studio wall.', 'ENTER THE FUTURE', '#8ca1b5', 'Popular'],
  ['Midnight Drift', 'Cars', 'A moody automotive print for garages, desks and modern rooms.', 'MIDNIGHT DRIFT', '#263342', 'Bestseller'],
  ['Classic Chrome', 'Cars', 'Timeless automobile styling in a clean editorial composition.', 'CLASSIC\\nCHROME', '#c6b8a4', ''],
  ['Open Road', 'Cars', 'A road-trip inspired print for people who always want one more mile.', 'THE OPEN ROAD', '#c99c68', ''],
  ['Monsoon Hills', 'Nature', 'Misty green hills to add a quiet, restorative mood to your room.', 'BREATHE DEEP', '#a8b7a3', ''],
  ['Desert Sun', 'Nature', 'Warm desert light and clean shapes for a modern, earthy wall.', 'FOLLOW THE SUN', '#d8ad78', ''],
  ['Ocean Quiet', 'Nature', 'A blue-toned coastal print for calm bedrooms and workspaces.', 'FIND YOUR HORIZON', '#9ebdca', ''],
  ['Forest After Rain', 'Nature', 'A lush forest scene that brings an outdoors feeling indoors.', 'AFTER THE RAIN', '#718b75', ''],
  ['Custom Family Memory', 'Custom', 'A thoughtful custom-photo print for birthdays, anniversaries and keepsakes.', 'YOUR MOMENT,\\nYOUR WALL', '#e4cdb9', 'Custom'],
  ['Custom Name Poster', 'Custom', 'Personalise a name, date or message for a meaningful gift.', 'MADE FOR YOU', '#d5c3a9', 'Custom'],
].map(([name, category, description, quote, bg, tag], index) => ({
  name,
  category,
  description,
  quote,
  bg,
  image: imagePool[index % imagePool.length],
  prices: [199 + (index % 4) * 20, 349 + (index % 4) * 30, 499 + (index % 4) * 40],
  tag: tag || undefined,
  featured: index < 6,
}));

const categoryNames = [...new Set(products.map(product => product.category))];

async function seed() {
  await connectDatabase();

  await Promise.all(categoryNames.map((name, sortOrder) => Category.findOneAndUpdate(
    { slug: name.toLowerCase() },
    { $set: { name, slug: name.toLowerCase(), active: true, sortOrder } },
    { upsert: true, new: true },
  )));

  for (const product of products) {
    const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [a4, a3, twelveByEighteen] = product.prices;
    await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: product.name,
          category: product.category,
          description: product.description,
          quote: product.quote,
          bg: product.bg,
          tag: product.tag,
          featured: product.featured,
          active: true,
          inventoryVerified: true,
          images: [product.image],
          variants: [
            { size: 'A4', paperQuality: 'Matte 250 GSM', finish: 'Unframed', price: a4, originalPrice: a4 + 100, stock: 30, active: true },
            { size: 'A3', paperQuality: 'Matte 250 GSM', finish: 'Unframed', price: a3, originalPrice: a3 + 150, stock: 20, active: true },
            { size: '12×18', paperQuality: 'Matte 250 GSM', finish: 'Unframed', price: twelveByEighteen, originalPrice: twelveByEighteen + 200, stock: 10, active: true },
          ],
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
  }

  console.log(`Seeded ${products.length} catalogue products across ${categoryNames.length} categories.`);
  process.exit(0);
}

seed().catch(error => {
  console.error('Catalogue seed failed:', error);
  process.exit(1);
});
