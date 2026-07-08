import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { companyApi, stockApi, indicatorApi, externalApi } from '../services/api';
import StockChart from '../components/StockChart';
import IndicatorsChart from '../components/IndicatorsChart';
import { Activity, Briefcase, ChevronRight, Hash, Target, TrendingUp, AlertTriangle, Cpu, CircleDollarSign } from 'lucide-react';

/* --- Helper Components for Dashboard --- */

const CircularProgress = ({ value, label, max = 100, color = "#6366f1" }) => {
    // If value is NaN or null, default to 0
    const safeValue = isNaN(value) || value === null ? 0 : parseFloat(value);
    const safeMax = isNaN(max) || max === null || max === 0 ? 100 : parseFloat(max);
    
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    // Cap progress
    const progress = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
                <svg width="100" height="100" className="rotate-[-90deg]">
                    <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                    <circle cx="50" cy="50" r={radius} stroke={color} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-bold text-foreground text-sm">{safeValue.toFixed(2)}%</span>
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium text-center">{label}</p>
        </div>
    );
};

const RangeBar = ({ title, current, min, max }) => {
    const sCurrent = parseFloat(current) || 0;
    const sMin = parseFloat(min) || 0;
    const sMax = parseFloat(max) || Math.max(sCurrent, 1);
    
    // Calculate percentage
    let percentage = 0;
    if (sMax > sMin) {
        percentage = ((sCurrent - sMin) / (sMax - sMin)) * 100;
    }
    percentage = Math.max(0, Math.min(100, percentage));

    return (
        <div className="space-y-1.5 w-full">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{sMin.toFixed(2)}</span>
                <span className="text-foreground">{title}</span>
                <span>{sMax.toFixed(2)}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
                <div 
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out rounded-full" 
                    style={{ width: `${percentage}%` }}
                ></div>
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow border-2 border-primary transition-all duration-1000 ease-out" 
                    style={{ left: `calc(${percentage}% - 6px)` }}
                ></div>
            </div>
        </div>
    );
};

const InfoCard = ({ label, value, icon: Icon, colorClass = "text-primary bg-primary/10 border-primary/20" }) => (
    <div className="bg-muted/30 p-3 rounded-xl border border-border flex items-center gap-3">
        {Icon && (
            <div className={`p-2 rounded-lg border ${colorClass}`}>
                <Icon className="w-4 h-4" />
            </div>
        )}
        <div className="overflow-hidden">
             <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{label}</div>
             <div className="font-semibold text-foreground text-sm truncate">{value || 'N/A'}</div>
        </div>
    </div>
);


/* --- Main Component --- */

const CompanyDetail = () => {
    const { symbol } = useParams();
    const navigate = useNavigate();
    
    const [company, setCompany] = useState(null);
    const [stockData, setStockData] = useState([]);
    const [indicators, setIndicators] = useState([]);
    const [externalData, setExternalData] = useState(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // 1. Get Company Details
                const coRes = await companyApi.getOne(symbol);
                const coData = coRes.data.data;
                setCompany(coData);

                // 2. Get Stock Prices
                const stockRes = await stockApi.getHistorical(coData.company_id);
                setStockData(stockRes.data.data);

                // 3. Get Indicators
                const indRes = await indicatorApi.getIndicators(coData.company_id);
                setIndicators(indRes.data.data);

                // 4. Get Rich External Profile Data from DB, fetch only if missing (self-healing cache)
                try {
                    if (coData.profile_data) {
                        const parsed = typeof coData.profile_data === 'string' ? JSON.parse(coData.profile_data) : coData.profile_data;
                        setExternalData(parsed);
                    } else {
                        // Fallback: If company exists but has no profile_data, fetch and auto-cache it via backend
                        const extRes = await externalApi.fetchProfile({ name: coData.ticker, company_id: coData.company_id });
                        setExternalData(extRes.data?.data || null);
                    }
                } catch (e) {
                    console.warn("Profile processing failed", e);
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch company data. Make sure it exists.');
                setLoading(false);
            }
        };
        fetchAllData();
    }, [symbol]);

    return (
        <div className="space-y-6 pb-12">
            <button 
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-4 inline-block"
            >
                &larr; Back to Dashboard
            </button>

            {loading ? (
                <div className="text-center p-12 text-muted-foreground">Loading Detailed Data...</div>
            ) : error ? (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-xl">
                    {error}
                </div>
            ) : (
                <>
                    {/* Compact Header matching image (Logo, Name, Industry, Latest Price) */}
                    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-foreground tracking-tight">{company.company_name}</h1>
                                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-md border border-primary/20">
                                    {company.ticker}
                                </span>
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground font-medium mt-1">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> {company.sector || externalData?.sector || 'N/A Sector'}</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> {company.industry || externalData?.industry || 'N/A Industry'}</span>
                            </div>
                        </div>
                        
                        {/* Latest Price Snapshot */}
                        <div className="mt-4 md:mt-0 md:text-right">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Latest Close Price</p>
                            <h2 className="text-3xl font-bold text-foreground">
                                ₹{stockData.length > 0 ? Number(stockData[stockData.length - 1].close_price).toFixed(2) : (externalData?.currentPrice?.NSE || externalData?.currentPrice?.BSE || '0.00')}
                            </h2>
                            <p className="text-xs text-green-500 font-medium mt-1">Live from Market</p>
                        </div>
                    </div>

                    {/* Dashboard Masonry Grid Inspired by Visual Aesthetic */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        
                        {/* Column 1: Financials & Vitals (4 cols wide) */}
                        <div className="md:col-span-4 space-y-6">
                            
                            {/* Vitals & Range Card */}
                            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-warning" /> 
                                    Price Performance
                                </h3>
                                
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">1D % Change</p>
                                            <h4 className={`text-xl font-bold ${parseFloat(externalData?.percentChange) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                                                {parseFloat(externalData?.percentChange) >= 0 ? '+' : ''}
                                                {externalData?.percentChange || '0.00'}%
                                            </h4>
                                        </div>
                                    </div>

                                    {/* 52W Range Progress Bar */}
                                    <div className="pt-2">
                                        <p className="text-xs text-muted-foreground mb-2 font-bold uppercase tracking-wider">52 Week Range</p>
                                        <RangeBar 
                                            title="Current"
                                            current={externalData?.currentPrice?.NSE || externalData?.currentPrice?.BSE || 0}
                                            min={externalData?.yearLow || 0}
                                            max={externalData?.yearHigh || 0}
                                        />
                                    </div>
                                    
                                </div>
                            </div>

                            {/* Info Card Grid */}
                            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-primary" />
                                    Key Metrics
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoCard 
                                        icon={CircleDollarSign} 
                                        colorClass="text-green-500 bg-green-500/10 border-green-500/20"
                                        label="Market Cap" 
                                        value={
                                            externalData?.keyMetrics?.marketCap || 
                                            externalData?.marketCap || 
                                            (() => {
                                                if (!externalData?.keyMetrics) return company.market_cap;
                                                for (const cat of Object.values(externalData.keyMetrics)) {
                                                    const m = cat.find(x => x.key === 'marketCap' || x.displayName?.toLowerCase().includes('market cap'));
                                                    if (m && m.value) return m.value;
                                                }
                                                return company.market_cap;
                                            })()
                                        } 
                                    />
                                    <InfoCard 
                                        icon={TrendingUp} 
                                        colorClass="text-purple-500 bg-purple-500/10 border-purple-500/20"
                                        label="P/E Ratio" 
                                        value={(() => {
                                            if (!externalData?.keyMetrics) return 'N/A';
                                            for (const cat of Object.values(externalData.keyMetrics)) {
                                                const m = cat.find(x => 
                                                    x.displayName?.toLowerCase().includes('p/e ') || 
                                                    x.displayName?.toLowerCase() === 'p/e' ||
                                                    x.key?.toLowerCase().startsWith('ppere')
                                                );
                                                if (m && m.value) return Number(m.value).toFixed(2);
                                            }
                                            return 'N/A';
                                        })()} 
                                    />
                                    <InfoCard 
                                        icon={Hash} 
                                        colorClass="text-orange-500 bg-orange-500/10 border-orange-500/20"
                                        label="Div Yield" 
                                        value={(() => {
                                            if (!externalData?.keyMetrics) return 'N/A';
                                            for (const cat of Object.values(externalData.keyMetrics)) {
                                                const m = cat.find(x => x.displayName?.toLowerCase().includes('dividend yield') || x.key?.toLowerCase().includes('dividendyield'));
                                                if (m && m.value && m.value !== 'null') return Number(m.value).toFixed(2) + '%';
                                            }
                                            return 'N/A';
                                        })()} 
                                    />
                                    <InfoCard 
                                        icon={Target} 
                                        colorClass="text-blue-500 bg-blue-500/10 border-blue-500/20"
                                        label="EPS" 
                                        value={(() => {
                                            if (!externalData?.keyMetrics) return 'N/A';
                                            for (const cat of Object.values(externalData.keyMetrics)) {
                                                const m = cat.find(x => x.displayName?.toLowerCase().includes('eps normalized') || x.displayName?.toLowerCase().includes('eps basic'));
                                                if (m && m.value && m.value !== 'null') return Number(m.value).toFixed(2);
                                            }
                                            return 'N/A';
                                        })()} 
                                    />
                                </div>
                            </div>
                            
                            {/* Circular Charts Card - Returns/Technical Data */}
                            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-indigo-400" />
                                    Technical Signals
                                </h3>
                                <div className="flex flex-row justify-around items-center pt-2">
                                    <CircularProgress 
                                        value={parseFloat(externalData?.percentChange || 0) * 10} 
                                        max={100} 
                                        label="Momentum" 
                                        color="oklch(0.6231 0.1880 259.8145)" // primary color
                                    />
                                    <CircularProgress 
                                        value={externalData?.riskMeter ? parseFloat(externalData.riskMeter) : 45} 
                                        max={100} 
                                        label="Risk Profile" 
                                        color="oklch(0.6368 0.2078 25.3313)" // destructive red
                                    />
                                </div>
                            </div>

                        </div>
                        
                        {/* Column 2: Charts & Details (8 cols wide) */}
                        <div className="md:col-span-8 flex flex-col gap-6">
                            
                            {/* Profile Description */}
                            {externalData?.companyProfile?.companyDescription && (
                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                                    <h3 className="text-sm font-semibold text-foreground mb-2">About Company</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {externalData.companyProfile.companyDescription}
                                    </p>
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Briefcase className="w-24 h-24" />
                                    </div>
                                </div>
                            )}

                            {/* Wide Chart Area */}
                            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1">
                                <div className="p-4 border-b border-border bg-muted/30">
                                    <h2 className="text-sm font-bold text-foreground">Price History</h2>
                                </div>
                                <div className="flex-1 p-4 bg-background">
                                    <StockChart data={stockData} />
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1">
                                <div className="p-4 border-b border-border bg-muted/30">
                                    <h2 className="text-sm font-bold text-foreground">Technical Indicators</h2>
                                </div>
                                <div className="flex-1 p-4 bg-background">
                                    <IndicatorsChart data={indicators} />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mt-8">
                        <div className="p-5 border-b border-border">
                            <h2 className="text-sm font-semibold text-foreground">Recent Daily Quotes (OHLCV)</h2>
                        </div>
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-left relative">
                                <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Date</th>
                                        <th className="px-6 py-4 font-medium">Open</th>
                                        <th className="px-6 py-4 font-medium">High</th>
                                        <th className="px-6 py-4 font-medium">Low</th>
                                        <th className="px-6 py-4 font-medium">Close</th>
                                        <th className="px-6 py-4 font-medium">Volume</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {[...stockData].reverse().slice(0, 30).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-3 font-medium text-foreground text-sm">
                                                {new Date(row.timestamp).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-muted-foreground">₹{Number(row.open_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm text-green-500">₹{Number(row.high_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm text-destructive">₹{Number(row.low_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm font-bold text-foreground">₹{Number(row.close_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm text-muted-foreground">{Number(row.volume).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {stockData.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">No historical quotes available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CompanyDetail;
