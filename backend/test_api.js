require('dotenv').config();
const { request } = require('undici');

const API_KEY = process.env.INDIAN_API_KEY;
if (!API_KEY) throw new Error('Missing INDIAN_API_KEY in environment variables');

request('https://stock.indianapi.in/historical_data?stock_name=RELIANCE&period=1yr&filter=invalid', { 
    headers: { 'X-Api-Key': API_KEY } 
})
.then(res => res.body.text())
.then(txt => require('fs').writeFileSync('test_resp.json', txt));
