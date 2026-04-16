const axios = require('axios');

const BASE = 'http://localhost:5000';

const companies = [
    { name: "Reliance Industries Limited",          ticker: "RELIANCE"    },
    { name: "Tata Consultancy Services Limited",     ticker: "TCS"         },
    { name: "HDFC Bank Limited",                     ticker: "HDFCBANK"    },
    { name: "Infosys Limited",                       ticker: "INFY"        },
    { name: "ICICI Bank Limited",                    ticker: "ICICIBANK"   },
    { name: "Hindustan Unilever Limited",            ticker: "HINDUNILVR"  },
    { name: "State Bank of India",                   ticker: "SBIN"        },
    { name: "Bharti Airtel Limited",                 ticker: "BHARTIARTL"  },
    { name: "ITC Limited",                           ticker: "ITC"         },
    { name: "Larsen & Toubro Limited",               ticker: "LT"          },
    { name: "Axis Bank Limited",                     ticker: "AXISBANK"    },
    { name: "Kotak Mahindra Bank Limited",           ticker: "KOTAKBANK"   },
    { name: "Adani Enterprises Limited",             ticker: "ADANIENT"    },
    { name: "Adani Ports and Special Economic Zone", ticker: "ADANIPORTS"  },
    { name: "Wipro Limited",                         ticker: "WIPRO"       },
    { name: "Maruti Suzuki India Limited",           ticker: "MARUTI"      },
    { name: "Asian Paints Limited",                  ticker: "ASIANPAINT"  },
    { name: "Titan Company Limited",                 ticker: "TITAN"       },
    { name: "Bajaj Finance Limited",                 ticker: "BAJFINANCE"  },
    { name: "Sun Pharmaceutical Industries Limited", ticker: "SUNPHARMA"   },
];

async function seed() {
    // 1. Fetch existing tickers from DB
    const existingRes = await axios.get(`${BASE}/api/companies`);
    const existingTickers = new Set(existingRes.data.data.map(c => c.ticker));
    console.log(`\n📋 Already in DB: ${[...existingTickers].join(', ') || 'none'}\n`);

    const toAdd = companies.filter(c => !existingTickers.has(c.ticker));
    console.log(`➕ Will add ${toAdd.length} companies: ${toAdd.map(c => c.ticker).join(', ')}\n`);

    for (const co of toAdd) {
        console.log(`\n[${co.ticker}] Processing...`);
        try {
            // 2. Add basic record first so we get a company_id
            const addRes = await axios.post(`${BASE}/api/companies`, {
                company_name: co.name,
                ticker: co.ticker,
            });
            const newId = addRes.data.data.company_id;
            console.log(`   ✅ Company record created (id=${newId})`);

            // 3. Fetch & cache profile (1 API call — this caches into profile_data column)
            try {
                await axios.post(`${BASE}/api/external/profile`, { name: co.ticker, company_id: newId });
                console.log(`   ✅ Profile cached`);
            } catch (e) {
                console.log(`   ⚠️  Profile fetch failed: ${e.response?.data?.message || e.message}`);
            }

            // 4. Fetch historical prices
            try {
                await axios.post(`${BASE}/api/external/historical`, { name: co.ticker, company_id: newId });
                console.log(`   ✅ Historical data fetched`);
            } catch (e) {
                console.log(`   ⚠️  Historical fetch failed: ${e.response?.data?.message || e.message}`);
            }

            // 5. Fetch news
            try {
                await axios.post(`${BASE}/api/external/news`, { company_id: newId });
                console.log(`   ✅ News fetched`);
            } catch (e) {
                console.log(`   ⚠️  News fetch failed: ${e.response?.data?.message || e.message}`);
            }

            // Delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 1500));

        } catch (err) {
            if (err.response?.status === 409) {
                console.log(`   ℹ️  Already exists (409), skipping.`);
            } else {
                console.error(`   ❌ Failed: ${err.response?.data?.message || err.message}`);
            }
        }
    }

    console.log('\n\n🎉 Seeding complete!');
}

seed().catch(console.error);
