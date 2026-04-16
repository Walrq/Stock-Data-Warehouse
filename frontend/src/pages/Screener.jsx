import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { screenerApi, externalApi } from '../services/api';
import {
    SlidersHorizontal, Search, TrendingUp, TrendingDown,
    Zap, RotateCcw, ArrowUpDown, ChevronDown, ChevronUp,
    DollarSign, BarChart2, Percent, Building2,
    Scale, LineChart, Activity, Trophy, Target
} from 'lucide-react';

const SIGNALS = [
    { value: '', label: 'No Signal Filter' },
    { value: 'golden_cross', label: '🟡 Golden Cross (MA50 > MA200)' },
    { value: 'death_cross', label: '💀 Death Cross (MA50 < MA200)' },
    { value: 'price_above_ma50', label: '📈 Price Above MA50 (Bullish)' },
    { value: 'price_below_ma50', label: '📉 Price Below MA50 (Bearish)' },
    { value: 'price_above_ma200', label: '🚀 Price Above MA200 (Long Bullish)' },
    { value: 'near_52w_high', label: '🔝 Near 52-Week High (Momentum)' },
    { value: 'near_52w_low', label: '🔻 Near 52-Week Low (Recovery)' },
    { value: 'volume_spike', label: '⚡ Volume Spike (2x Avg)' },
];

const SORT_OPTIONS = [
    { value: 'company_name', label: 'Company Name' },
    { value: 'latest_close', label: 'Price' },
    { value: 'latest_volume', label: 'Volume' },
    { value: 'change_1d_pct', label: '1-Day Change %' },
    { value: 'change_30d_pct', label: '30-Day Change %' },
    { value: 'market_cap', label: 'Market Cap' },
    { value: 'ma_50', label: 'MA 50' },
    { value: 'ma_200', label: 'MA 200' },
    { value: 'roe', label: 'ROE %' },
    { value: 'debt_equity', label: 'Debt/Equity' },
    { value: 'net_margin', label: 'Net Margin %' },
    { value: 'revenue_growth', label: 'Revenue Growth %' },
    { value: 'dist_52w_high_pct', label: 'Distance from 52W High' },
];

const defaultFilters = {
    min_price: '', max_price: '',
    min_volume: '', max_volume: '',
    min_change_1d: '', max_change_1d: '',
    min_change_30d: '',
    sector: '',
    min_market_cap: '', max_market_cap: '',
    min_roe: '', max_roe: '',
    min_debt_equity: '', max_debt_equity: '',
    min_net_margin: '', max_net_margin: '',
    min_revenue_growth: '', max_revenue_growth: '',
    max_dist_52w_high: '',
    min_price_vs_50dma: '', max_price_vs_50dma: '',
    signal: '',
    sort_by: 'company_name',
    sort_order: 'ASC'
};

/* ── Styled number input ── */
const FilterInput = ({ label, name, value, onChange, placeholder = '' }) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
    </div>
);

/* ── Styled select ── */
const FilterSelect = ({ name, value, onChange, children }) => (
    <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
        style={{ colorScheme: 'dark' }}
    >
        {children}
    </select>
);

/* ── Collapsible accordion filter section ── */
const FilterSection = ({ title, icon: Icon, iconColor = 'text-primary', defaultOpen = false, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
                    {title}
                </span>
                {open
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                }
            </button>
            {open && (
                <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border bg-card">
                    {children}
                </div>
            )}
        </div>
    );
};

const Screener = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(defaultFilters);
    const [results, setResults] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [ran, setRan] = useState(false);

    const handleChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpdatePrice = async (row) => {
        if (window.confirm("Are you sure, You are about to use api tokens")) {
            try {
                await externalApi.fetchHistorical({ name: row.company_name, company_id: row.company_id });
                runScreener();
            } catch (err) {
                console.error(err);
                alert("Failed to update prices.");
            }
        }
    };

    const runScreener = useCallback(async () => {
        setLoading(true);
        setRan(true);
        try {
            const activeParams = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v !== '' && v !== null)
            );
            const res = await screenerApi.run(activeParams);
            setResults(res.data.data);
            if (res.data.meta?.sectors) setSectors(res.data.meta.sectors);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters]);
    useEffect(() => { runScreener(); }, [runScreener]);

    const resetFilters = () => setFilters(defaultFilters);

    const toggleSort = (col) => {
        setFilters(prev => ({
            ...prev,
            sort_by: col,
            sort_order: prev.sort_by === col && prev.sort_order === 'ASC' ? 'DESC' : 'ASC'
        }));
    };

    const formatNum = (n) => n != null ? Number(n).toLocaleString('en-IN') : '—';
    const formatPrice = (n) => n != null ? `₹${Number(n).toFixed(2)}` : '—';
    const formatPct = (n) => {
        if (n == null) return '—';
        const v = Number(n);
        return <span className={v >= 0 ? 'text-green-500' : 'text-destructive'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>;
    };
    const formatCap = (n) => {
        if (!n) return '—';
        const v = Number(n);
        if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
        if (v >= 1e7) return `₹${(v / 1e7).toFixed(0)}Cr`;
        return `₹${v.toLocaleString()}`;
    };

    const SortIcon = ({ col }) => filters.sort_by === col
        ? <span className="text-primary ml-1">{filters.sort_order === 'ASC' ? '↑' : '↓'}</span>
        : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <SlidersHorizontal className="w-6 h-6 text-primary" />
                        Stock Screener
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Filter companies from your local warehouse using financial metrics.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:text-foreground hover:border-foreground transition-colors text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button
                        onClick={runScreener}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                    >
                        <Search className="w-4 h-4" /> {loading ? 'Scanning...' : 'Run Screener'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* === FILTER PANEL (accordion dropdowns) === */}
                <div className="xl:col-span-1 space-y-2">

                    <FilterSection title="Price (₹)" icon={DollarSign} iconColor="text-primary" defaultOpen>
                        <FilterInput label="Min Price" name="min_price" value={filters.min_price} onChange={handleChange} placeholder="e.g. 500" />
                        <FilterInput label="Max Price" name="max_price" value={filters.max_price} onChange={handleChange} placeholder="e.g. 5000" />
                    </FilterSection>

                    <FilterSection title="Volume" icon={BarChart2} iconColor="text-yellow-500">
                        <FilterInput label="Min Volume" name="min_volume" value={filters.min_volume} onChange={handleChange} placeholder="e.g. 1000000" />
                        <FilterInput label="Max Volume" name="max_volume" value={filters.max_volume} onChange={handleChange} placeholder="e.g. 50000000" />
                    </FilterSection>

                    <FilterSection title="Price Change (%)" icon={Percent} iconColor="text-green-500">
                        <FilterInput label="Min 1-Day %" name="min_change_1d" value={filters.min_change_1d} onChange={handleChange} placeholder="e.g. 2" />
                        <FilterInput label="Max 1-Day %" name="max_change_1d" value={filters.max_change_1d} onChange={handleChange} placeholder="e.g. -2" />
                        <FilterInput label="Min 30-Day %" name="min_change_30d" value={filters.min_change_30d} onChange={handleChange} placeholder="e.g. 10" />
                    </FilterSection>

                    <FilterSection title="Market Cap" icon={TrendingUp} iconColor="text-blue-400">
                        <FilterInput label="Min Cap (₹)" name="min_market_cap" value={filters.min_market_cap} onChange={handleChange} placeholder="e.g. 100000000000" />
                        <FilterInput label="Max Cap (₹)" name="max_market_cap" value={filters.max_market_cap} onChange={handleChange} placeholder="e.g. 5000000000000" />
                    </FilterSection>

                    <FilterSection title="ROE (%)" icon={TrendingUp} iconColor="text-emerald-400">
                        <FilterInput label="Min ROE %" name="min_roe" value={filters.min_roe} onChange={handleChange} placeholder="e.g. 15" />
                        <FilterInput label="Max ROE %" name="max_roe" value={filters.max_roe} onChange={handleChange} placeholder="e.g. 40" />
                    </FilterSection>

                    <FilterSection title="Debt / Equity" icon={Scale} iconColor="text-red-400">
                        <FilterInput label="Min D/E" name="min_debt_equity" value={filters.min_debt_equity} onChange={handleChange} placeholder="e.g. 0" />
                        <FilterInput label="Max D/E" name="max_debt_equity" value={filters.max_debt_equity} onChange={handleChange} placeholder="e.g. 1" />
                    </FilterSection>

                    <FilterSection title="Net Profit Margin (%)" icon={Percent} iconColor="text-cyan-400">
                        <FilterInput label="Min Margin %" name="min_net_margin" value={filters.min_net_margin} onChange={handleChange} placeholder="e.g. 10" />
                        <FilterInput label="Max Margin %" name="max_net_margin" value={filters.max_net_margin} onChange={handleChange} placeholder="e.g. 30" />
                    </FilterSection>

                    <FilterSection title="Revenue Growth 5Y (%)" icon={LineChart} iconColor="text-violet-400">
                        <FilterInput label="Min Growth %" name="min_revenue_growth" value={filters.min_revenue_growth} onChange={handleChange} placeholder="e.g. 10" />
                        <FilterInput label="Max Growth %" name="max_revenue_growth" value={filters.max_revenue_growth} onChange={handleChange} placeholder="e.g. 30" />
                    </FilterSection>

                    <FilterSection title="Distance from 52W High" icon={Target} iconColor="text-orange-400">
                        <FilterInput label="Max % below High" name="max_dist_52w_high" value={filters.max_dist_52w_high} onChange={handleChange} placeholder="e.g. 10 (within 10%)" />
                    </FilterSection>

                    <FilterSection title="Price vs 50-Day MA (%)" icon={Activity} iconColor="text-sky-400">
                        <FilterInput label="Min % above MA50" name="min_price_vs_50dma" value={filters.min_price_vs_50dma} onChange={handleChange} placeholder="e.g. 5" />
                        <FilterInput label="Max % above MA50" name="max_price_vs_50dma" value={filters.max_price_vs_50dma} onChange={handleChange} placeholder="e.g. 20" />
                    </FilterSection>

                    <FilterSection title="Sector" icon={Building2} iconColor="text-purple-400">
                        <FilterSelect name="sector" value={filters.sector} onChange={handleChange}>
                            <option value="">All Sectors</option>
                            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                        </FilterSelect>
                    </FilterSection>

                    <FilterSection title="Technical Signal" icon={Zap} iconColor="text-yellow-400">
                        <FilterSelect name="signal" value={filters.signal} onChange={handleChange}>
                            {SIGNALS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </FilterSelect>
                    </FilterSection>

                    <FilterSection title="Sort By" icon={ArrowUpDown} iconColor="text-muted-foreground" defaultOpen>
                        <FilterSelect name="sort_by" value={filters.sort_by} onChange={handleChange}>
                            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </FilterSelect>
                        <FilterSelect name="sort_order" value={filters.sort_order} onChange={handleChange}>
                            <option value="ASC">Ascending</option>
                            <option value="DESC">Descending</option>
                        </FilterSelect>
                    </FilterSection>

                </div>

                {/* === RESULTS TABLE === */}
                <div className="xl:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-border flex justify-between items-center">
                        <h2 className="text-base font-semibold text-foreground">Results</h2>
                        <span className="text-sm text-muted-foreground font-medium">
                            {ran ? `${results.length} ${results.length === 1 ? 'company' : 'companies'} matched` : ''}
                        </span>
                    </div>

                    <div className="overflow-x-auto max-h-[720px]">
                        {loading ? (
                            <div className="p-12 text-center text-muted-foreground">Scanning database...</div>
                        ) : results.length === 0 && ran ? (
                            <div className="p-12 text-center text-muted-foreground">No companies matched your filter criteria.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-card shadow-sm text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-10 outline outline-1 outline-border">
                                    <tr>
                                        <th className="px-5 py-4 font-medium">Company</th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('latest_close')}>
                                            Price <SortIcon col="latest_close" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('change_1d_pct')}>
                                            1D % <SortIcon col="change_1d_pct" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('change_30d_pct')}>
                                            30D % <SortIcon col="change_30d_pct" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('latest_volume')}>
                                            Volume <SortIcon col="latest_volume" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('market_cap')}>
                                            Market Cap <SortIcon col="market_cap" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('roe')}>
                                            ROE % <SortIcon col="roe" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('debt_equity')}>
                                            D/E <SortIcon col="debt_equity" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('net_margin')}>
                                            Net Margin % <SortIcon col="net_margin" />
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('revenue_growth')}>
                                            Rev Growth 5Y% <SortIcon col="revenue_growth" />
                                        </th>
                                        <th className="px-5 py-4 font-medium">Free Cash Flow</th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('dist_52w_high_pct')}>
                                            Dist 52W Hi % <SortIcon col="dist_52w_high_pct" />
                                        </th>
                                        <th className="px-5 py-4 font-medium">vs MA50 %</th>
                                        <th className="px-5 py-4 font-medium">Peer Rank</th>
                                        <th className="px-5 py-4 font-medium">
                                            Update Prices
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {results.map(row => (
                                        <tr
                                            key={row.company_id}
                                            onClick={() => navigate(`/company/${row.ticker}`)}
                                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-foreground text-sm">{row.ticker}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[160px]">{row.company_name}</div>
                                            </td>
                                            <td className="px-5 py-3 font-bold text-foreground text-sm">{formatPrice(row.latest_close)}</td>
                                            <td className="px-5 py-3 text-sm font-medium">{formatPct(row.change_1d_pct)}</td>
                                            <td className="px-5 py-3 text-sm font-medium">{formatPct(row.change_30d_pct)}</td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">{formatNum(row.latest_volume)}</td>
                                            <td className="px-5 py-3 text-sm font-medium text-foreground">{formatCap(row.market_cap)}</td>
                                            <td className="px-5 py-3 text-sm font-medium">
                                                {row.roe != null ? <span className="text-emerald-400">{Number(row.roe).toFixed(1)}%</span> : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium">
                                                {row.debt_equity != null ? (
                                                    <span className={Number(row.debt_equity) > 1 ? 'text-destructive' : 'text-green-500'}>
                                                        {Number(row.debt_equity).toFixed(2)}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium">
                                                {row.net_margin != null ? <span className="text-cyan-400">{Number(row.net_margin).toFixed(1)}%</span> : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium">
                                                {row.revenue_growth != null ? (
                                                    <span className={Number(row.revenue_growth) >= 0 ? 'text-violet-400' : 'text-destructive'}>
                                                        {Number(row.revenue_growth) >= 0 ? '+' : ''}{Number(row.revenue_growth).toFixed(1)}%
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">
                                                {row.free_cash_flow != null ? formatCap(row.free_cash_flow) : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium">
                                                {row.dist_52w_high_pct != null ? (
                                                    <span className={Number(row.dist_52w_high_pct) >= -5 ? 'text-green-500' : 'text-muted-foreground'}>
                                                        {Number(row.dist_52w_high_pct).toFixed(1)}%
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium">
                                                {row.price_vs_50dma_pct != null ? (
                                                    <span className={Number(row.price_vs_50dma_pct) >= 0 ? 'text-sky-400' : 'text-destructive'}>
                                                        {Number(row.price_vs_50dma_pct) >= 0 ? '+' : ''}{Number(row.price_vs_50dma_pct).toFixed(1)}%
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium">
                                                {row.peer_rank != null ? (
                                                    <span className={`font-bold ${
                                                        row.peer_rank <= 3 ? 'text-yellow-400' :
                                                        row.peer_rank <= 10 ? 'text-primary' : 'text-muted-foreground'
                                                    }`}>#{row.peer_rank}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-foreground">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdatePrice(row);
                                                    }}
                                                    className="px-3 py-1 bg-primary/20 text-primary hover:bg-primary/30 rounded font-medium transition-colors"
                                                >
                                                    Update
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Screener;
