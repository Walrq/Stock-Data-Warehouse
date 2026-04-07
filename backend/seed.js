const axios = require('axios');

const companies = [
  { name: "Tata Consultancy Services Limited", ticker: "TCS" },
  { name: "HDFC Bank Limited", ticker: "HDFCBANK" },
  { name: "Infosys Limited", ticker: "INFY" },
  { name: "ICICI Bank Limited", ticker: "ICICIBANK" },
  { name: "Hindustan Unilever Limited", ticker: "HINDUNILVR" },
  { name: "State Bank of India", ticker: "SBIN" },
  { name: "Bharti Airtel Limited", ticker: "BHARTIARTL" },
  { name: "ITC Limited", ticker: "ITC" },
  { name: "Larsen & Toubro Limited", ticker: "LT" },
  { name: "Axis Bank Limited", ticker: "AXISBANK" },
  { name: "Kotak Mahindra Bank Limited", ticker: "KOTAKBANK" },
  { name: "Maruti Suzuki India Limited", ticker: "MARUTI" }
];

async function seed() {
    for (const co of companies) {
        console.log(`Processing ${co.ticker}...`);
        
        try {
            // 1. Fetch profile
            let profile;
            let finalName = co.name;
            let finalTicker = co.ticker;
            let sector = null;
            let industry = null;
            let marketCap = null;

            try {
                const profileRes = await axios.post('http://localhost:5000/api/external/profile', { name: co.ticker });
                profile = profileRes.data.data;
                
                finalName = profile.companyName || profile.name || co.name;
                finalTicker = profile.tickerId || profile.symbol || profile.ticker || co.ticker;
                sector = profile.sector || null;
                industry = profile.industry || null;
                
                if (profile.keyMetrics?.marketCap) {
                    marketCap = typeof profile.keyMetrics.marketCap === 'string' 
                                ? parseFloat(profile.keyMetrics.marketCap.replace(/[^0-9.]/g,'')) 
                                : profile.keyMetrics.marketCap;
                }
            } catch (err) {
                console.log(`   (Warning: Could not fetch profile for ${co.ticker}. Proceeding with base data)`);
            }

            const payload = {
                company_name: finalName,
                ticker: finalTicker,
                sector: sector,
                industry: industry,
                market_cap: marketCap
            };

            // 2. Add via API
            const addRes = await axios.post('http://localhost:5000/api/companies', payload);
            const newId = addRes.data.data.company_id;

            // 3. Fetch historical
            console.log(`   Fetching historical data...`);
            await axios.post('http://localhost:5000/api/external/historical', { name: payload.ticker, company_id: newId });

            // 4. Fetch news
            console.log(`   Fetching news...`);
            await axios.post('http://localhost:5000/api/external/news', { company_id: newId });

            console.log(`✅ Successfully populated ${co.ticker}\n`);
            
            // Artificial delay to prevent API rate limits
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            console.error(`❌ Failed for ${co.ticker}:`, err.response?.data || err.message, '\n');
        }
    }
    console.log("Seeding complete!");
}

seed();
