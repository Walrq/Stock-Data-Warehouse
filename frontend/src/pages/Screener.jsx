import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { screenerApi } from '../services/api';
import { SlidersHorizontal, Search, TrendingUp, TrendingDown, Zap, RotateCcw, ArrowUpDown } from 'lucide-react';

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
];

const defaultFilters = {
    min_price: '', max_price: '',
    min_volume: '', max_volume: '',
    min_change_1d: '', max_change_1d: '',
    min_change_30d: '',
    sector: '',
    min_market_cap: '', max_market_cap: '',
    signal: '',
    sort_by: 'company_name',
    sort_order: 'ASC'
};

const FilterInput = ({ label, name, value, onChange, placeholder = '' }) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">{label}</label>
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-dark-bg border border-dark-bor rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
    </div>
);

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

    const runScreener = useCallback(async () => {
        setLoading(true);
        setRan(true);
        try {
            // Remove empty filters
            const activeParams = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '' && v !== null)
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

    // Load all on mount (no filters)
    useEffect(() => {
        runScreener();
    }, []);

    const resetFilters = () => {
        setFilters(defaultFilters);
    };

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
        const cls = v >= 0 ? 'text-success' : 'text-danger';
        return <span className={cls}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>;
    };
    const formatCap = (n) => {
        if (!n) return '—';
        const v = Number(n);
        if (v >= 1e12) return `₹${(v/1e12).toFixed(1)}T`;
        if (v >= 1e7) return `₹${(v/1e7).toFixed(0)}Cr`;
        return `₹${v.toLocaleString()}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <SlidersHorizontal className="w-7 h-7 text-primary" />
                        Stock Screener
                    </h1>
                    <p className="text-dark-muted mt-1 text-sm">Filter companies from your local warehouse using 18 financial metrics.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 border border-dark-bor text-dark-muted rounded-xl hover:text-white hover:border-white transition-colors text-sm font-medium">
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={runScreener} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-50">
                        <Search className="w-4 h-4" /> {loading ? 'Scanning...' : 'Run Screener'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* === FILTER SIDEBAR === */}
                <div className="xl:col-span-1 space-y-4">

                    {/* Price */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Price (₹)</h3>
                        <FilterInput label="Min Price" name="min_price" value={filters.min_price} onChange={handleChange} placeholder="e.g. 500" />
                        <FilterInput label="Max Price" name="max_price" value={filters.max_price} onChange={handleChange} placeholder="e.g. 5000" />
                    </div>

                    {/* Volume */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-warning" /> Volume</h3>
                        <FilterInput label="Min Volume" name="min_volume" value={filters.min_volume} onChange={handleChange} placeholder="e.g. 1000000" />
                        <FilterInput label="Max Volume" name="max_volume" value={filters.max_volume} onChange={handleChange} placeholder="e.g. 50000000" />
                    </div>

                    {/* Price Change */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingDown className="w-4 h-4 text-success" /> Price Change (%)</h3>
                        <FilterInput label="Min 1-Day %" name="min_change_1d" value={filters.min_change_1d} onChange={handleChange} placeholder="e.g. 2" />
                        <FilterInput label="Max 1-Day %" name="max_change_1d" value={filters.max_change_1d} onChange={handleChange} placeholder="e.g. -2" />
                        <FilterInput label="Min 30-Day %" name="min_change_30d" value={filters.min_change_30d} onChange={handleChange} placeholder="e.g. 10" />
                    </div>

                    {/* Market Cap */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-white">Market Cap</h3>
                        <FilterInput label="Min Cap (₹)" name="min_market_cap" value={filters.min_market_cap} onChange={handleChange} placeholder="e.g. 100000000000" />
                        <FilterInput label="Max Cap (₹)" name="max_market_cap" value={filters.max_market_cap} onChange={handleChange} placeholder="e.g. 5000000000000" />
                    </div>

                    {/* Sector */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-5 space-y-3">
                        <h3 className="text-sm font-bold text-white">Sector</h3>
                        <select
                            name="sector"
                            value={filters.sector}
                            onChange={handleChange}
                            className="w-full bg-dark-bg border border-dark-bor rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        >
                            <option value="">All Sectors</option>
                            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Technical Signal */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-5 space-y-3">
                        <h3 className="text-sm font-bold text-white">Technical Signal</h3>
                        <select
                            name="signal"
                            value={filters.signal}
                            onChange={handleChange}
                            className="w-full bg-dark-bg border border-dark-bor rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        >
                            {SIGNALS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-5 space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><ArrowUpDown className="w-4 h-4" /> Sort By</h3>
                        <select
                            name="sort_by"
                            value={filters.sort_by}
                            onChange={handleChange}
                            className="w-full bg-dark-bg border border-dark-bor rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        >
                            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <select
                            name="sort_order"
                            value={filters.sort_order}
                            onChange={handleChange}
                            className="w-full bg-dark-bg border border-dark-bor rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        >
                            <option value="ASC">Ascending</option>
                            <option value="DESC">Descending</option>
                        </select>
                    </div>

                </div>

                {/* === RESULTS TABLE === */}
                <div className="xl:col-span-3 bg-dark-card border border-dark-bor rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-dark-bor flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">Results</h2>
                        <span className="text-sm text-dark-muted font-medium">
                            {ran ? `${results.length} ${results.length === 1 ? 'company' : 'companies'} matched` : ''}
                        </span>
                    </div>

                    <div className="overflow-x-auto max-h-[720px]">
                        {loading ? (
                            <div className="p-12 text-center text-dark-muted">Scanning database...</div>
                        ) : results.length === 0 && ran ? (
                            <div className="p-12 text-center text-dark-muted">No companies matched your filter criteria.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-dark-bg text-dark-muted text-xs uppercase tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-5 py-4 font-medium">Company</th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('latest_close')}>
                                            Price {filters.sort_by === 'latest_close' ? (filters.sort_order === 'ASC' ? '↑' : '↓') : ''}
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('change_1d_pct')}>
                                            1D % {filters.sort_by === 'change_1d_pct' ? (filters.sort_order === 'ASC' ? '↑' : '↓') : ''}
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('change_30d_pct')}>
                                            30D % {filters.sort_by === 'change_30d_pct' ? (filters.sort_order === 'ASC' ? '↑' : '↓') : ''}
                                        </th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('latest_volume')}>
                                            Volume {filters.sort_by === 'latest_volume' ? (filters.sort_order === 'ASC' ? '↑' : '↓') : ''}
                                        </th>
                                        <th className="px-5 py-4 font-medium">52W High</th>
                                        <th className="px-5 py-4 font-medium">52W Low</th>
                                        <th className="px-5 py-4 font-medium">MA50</th>
                                        <th className="px-5 py-4 font-medium">MA200</th>
                                        <th className="px-5 py-4 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('market_cap')}>
                                            Mkt Cap {filters.sort_by === 'market_cap' ? (filters.sort_order === 'ASC' ? '↑' : '↓') : ''}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-bor">
                                    {results.map(row => (
                                        <tr
                                            key={row.company_id}
                                            onClick={() => navigate(`/company/${row.ticker}`)}
                                            className="hover:bg-dark-bg/60 transition-colors cursor-pointer"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-white text-sm">{row.ticker}</div>
                                                <div className="text-xs text-dark-muted truncate max-w-[160px]">{row.company_name}</div>
                                            </td>
                                            <td className="px-5 py-3 font-bold text-white text-sm">{formatPrice(row.latest_close)}</td>
                                            <td className="px-5 py-3 text-sm font-medium">{formatPct(row.change_1d_pct)}</td>
                                            <td className="px-5 py-3 text-sm font-medium">{formatPct(row.change_30d_pct)}</td>
                                            <td className="px-5 py-3 text-sm text-dark-muted">{formatNum(row.latest_volume)}</td>
                                            <td className="px-5 py-3 text-sm text-success">{formatPrice(row.high_52w)}</td>
                                            <td className="px-5 py-3 text-sm text-danger">{formatPrice(row.low_52w)}</td>
                                            <td className="px-5 py-3 text-sm text-dark-muted">{formatPrice(row.ma_50)}</td>
                                            <td className="px-5 py-3 text-sm text-dark-muted">{formatPrice(row.ma_200)}</td>
                                            <td className="px-5 py-3 text-sm text-dark-muted">{formatCap(row.market_cap)}</td>
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
