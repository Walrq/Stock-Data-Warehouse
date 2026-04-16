require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

// Broader sector groupings based on the IndianAPI industry strings
const SECTOR_MAP = {
    'Oil & Gas Operations':        'Energy',
    'Coal':                        'Energy',
    'Electric Utilities':          'Energy',
    'Software & Programming':      'Technology',
    'Semiconductors':              'Technology',
    'IT Services & Consulting':    'Technology',
    'Telecommunications':          'Telecom',
    'Banks':                       'Finance',
    'Insurance':                   'Finance',
    'Finance - Investment Services':'Finance',
    'Finance - Rental & Leasing':  'Finance',
    'Finance - Credit Services':   'Finance',
    'Auto & Truck Manufacturers':  'Auto',
    'Auto & Truck Parts':          'Auto',
    'Auto & Truck Dealers':        'Auto',
    'Pharmaceuticals':             'Healthcare',
    'Biotechnology & Drugs':       'Healthcare',
    'Medical Equipment & Supplies':'Healthcare',
    'Consumer Goods':              'Consumer Goods',
    'Food - Major Diversified':    'Consumer Goods',
    'Personal & Household Products':'Consumer Goods',
    'Household Appliances':        'Consumer Goods',
    'Tobacco Products':            'Consumer Goods',
    'Fabricated Plastic & Rubber': 'Materials',
    'Iron & Steel':                'Materials',
    'Chemicals - Plastics & Rubber':'Materials',
    'Specialty Chemicals':         'Materials',
    'Cement & Aggregates':         'Materials',
    'Construction - Raw Materials':'Materials',
    'Construction Services':       'Infrastructure',
    'Engineering & Construction':  'Infrastructure',
    'Industrial Machinery':        'Industrials',
    'Aerospace & Defense':         'Industrials',
    'Conglomerates':               'Conglomerates',
    'Diversified Industrials':     'Conglomerates',
    'Retail - Specialty':          'Retail',
    'Retail - Department & Discount':'Retail',
    'Retail (Technology)':         'Retail',
    'Hotels & Motels':             'Consumer Services',
    'Air Transport':               'Consumer Services',
    'Broadcasting & Cable TV':     'Media',
    'Entertainment':               'Media',
    'Printing & Publishing':       'Media',
    'Real Estate':                 'Real Estate',
    'REIT - Retail':               'Real Estate',
};

async function backfillSectors() {
    // Fetch all companies with profile data
    const [rows] = await db.query(`
        SELECT company_id, ticker,
            JSON_UNQUOTE(JSON_EXTRACT(profile_data, '$.industry')) AS industry_raw
        FROM companies 
        WHERE profile_data IS NOT NULL
    `);

    console.log(`\nBackfilling ${rows.length} companies...\n`);

    let updated = 0;
    for (const row of rows) {
        const industry = row.industry_raw || null;
        const sector   = (industry && SECTOR_MAP[industry]) || industry || null;

        await db.query(
            'UPDATE companies SET sector = ?, industry = ? WHERE company_id = ?',
            [sector, industry, row.company_id]
        );
        console.log(`  ${row.ticker.padEnd(14)} industry="${industry}" → sector="${sector}"`);
        updated++;
    }

    console.log(`\n✅ Backfilled ${updated} companies\n`);

    // Verify heatmap query will work
    const [sectors] = await db.query(`SELECT DISTINCT sector FROM companies WHERE sector IS NOT NULL ORDER BY sector`);
    console.log('Distinct sectors:', sectors.map(s => s.sector));

    process.exit(0);
}

backfillSectors().catch(e => { console.error(e.message); process.exit(1); });
