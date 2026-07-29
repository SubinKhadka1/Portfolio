const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env.local', 'utf-8');
let url = '';
let key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const fileUrl = `${url}/storage/v1/object/public/site-data/portfolio.json`;

https.get(fileUrl, { headers: { Authorization: `Bearer ${key}` } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const pullups = json.gallery_designs.filter(d => d.category_id === 'cat-pullup');
    pullups.forEach(p => {
      console.log(`${p.title}: w=${p.metadata?.imageWidth} h=${p.metadata?.imageHeight} ar=${p.metadata?.aspectRatio}`);
    });
  });
}).on('error', console.error);
