import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart2, TrendingUp, TrendingDown, Zap, Database,
    RefreshCw, Activity, Trophy, Layers, ChevronUp, ChevronDown,
    Minus, Award, Table2, Code2
} from 'lucide-react';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

/* ── Helpers ── */
const fmt = (n, dec = 2) => n == null ? '—' : Number(n).toFixed(dec);
const fmtPct = (n) => {
    if (n == null) return <span className="text-muted-foreground">—</span>;
    const v = Number(n);
    return (
        <span className={v > 0 ? 'text-green-500' : v < 0 ? 'text-destructive' : 'text-muted-foreground'}>
            {v > 0 ? '+' : ''}{v.toFixed(2)}%
        </span>
    );
};
const fmtCap = (n) => {
    if (!n) return '—';
    const v = Number(n);
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e7)  return `₹${(v / 1e7).toFixed(1)}Cr`;
    return `₹${v.toLocaleString()}`;
};

/* ── Panel wrapper ── */
const Panel = ({ title, icon: Icon, iconColor = 'text-primary', badge, children, description }) => (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-primary/10 ${iconColor}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
            </div>
            {badge && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                    {badge}
                </span>
            )}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

/* ════════════════════════════════════════════
   PANEL 1 — Sector Heatmap
   SQL: GROUP BY sector, AVG(), MAX(CASE …)
   ════════════════════════════════════════════ */
const SectorHeatmap = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/sector-heatmap')
            .then(r => setData(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const maxAbs = Math.max(...data.map(d => Math.abs(d.avg_change_pct || 0)), 0.01);

    const tileColor = (pct) => {
        const v = Number(pct);
        const intensity = Math.min(Math.abs(v) / maxAbs, 1);
        if (v > 0) return `rgba(34, 197, 94, ${0.15 + intensity * 0.55})`;
        if (v < 0) return `rgba(239, 68, 68, ${0.15 + intensity * 0.55})`;
        return 'rgba(100,100,100,0.15)';
    };

    return (
        <Panel
            title="Sector Heatmap"
            icon={Layers}
            iconColor="text-emerald-400"
            badge="GROUP BY sector, AVG()"
            description="Average 1-day % change per sector. Intensity = magnitude."
        >
            {loading ? (
                <div className="text-muted-foreground text-sm text-center py-8">Loading…</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {data.map(s => (
                        <div
                            key={s.sector}
                            className="rounded-xl p-4 border border-white/5 transition-all duration-200 hover:scale-[1.02] cursor-default"
                            style={{ background: tileColor(s.avg_change_pct) }}
                        >
                            <div className="font-semibold text-sm text-foreground truncate">{s.sector}</div>
                            <div className={`text-2xl font-bold mt-1 ${Number(s.avg_change_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {Number(s.avg_change_pct) >= 0 ? '+' : ''}{fmt(s.avg_change_pct)}%
                            </div>
                            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                                <div>{s.company_count} companies</div>
                                <div className="text-green-500 truncate">▲ {s.best_ticker}</div>
                                <div className="text-red-400 truncate">▼ {s.worst_ticker}</div>
                                <div className="opacity-60">{fmtCap(s.total_market_cap)} total cap</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Panel>
    );
};

/* ════════════════════════════════════════════
   PANEL 2 — Sector Rankings (Window Functions)
   SQL: RANK() OVER (PARTITION BY sector ORDER BY …)
   ════════════════════════════════════════════ */
const SectorRankings = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSectors, setExpandedSectors] = useState({});

    useEffect(() => {
        api.get('/analytics/sector-rankings')
            .then(r => setData(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Group by sector
    const bySector = data.reduce((acc, row) => {
        if (!acc[row.sector]) acc[row.sector] = [];
        acc[row.sector].push(row);
        return acc;
    }, {});

    const toggleSector = (s) => setExpandedSectors(p => ({ ...p, [s]: !p[s] }));

    const rankBadge = (rank) => {
        if (rank === 1) return <span className="text-yellow-400 font-bold">🥇 #1</span>;
        if (rank === 2) return <span className="text-slate-300 font-bold">🥈 #2</span>;
        if (rank === 3) return <span className="text-orange-400 font-bold">🥉 #3</span>;
        return <span className="text-muted-foreground font-medium">#{rank}</span>;
    };

    return (
        <Panel
            title="Sector Rankings"
            icon={Trophy}
            iconColor="text-yellow-400"
            badge="RANK() OVER (PARTITION BY sector)"
            description="Each company ranked within its sector by 1-day price change."
        >
            {loading ? (
                <div className="text-muted-foreground text-sm text-center py-8">Loading…</div>
            ) : (
                <div className="space-y-2">
                    {Object.entries(bySector).map(([sector, rows]) => {
                        const open = expandedSectors[sector];
                        return (
                            <div key={sector} className="border border-border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSector(sector)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <span className="font-semibold text-sm text-foreground">{sector}</span>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{rows.length} companies</span>
                                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </button>
                                {open && (
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/20 text-muted-foreground uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-2">Rank</th>
                                                <th className="px-4 py-2">Ticker</th>
                                                <th className="px-4 py-2">Price</th>
                                                <th className="px-4 py-2">1D %</th>
                                                <th className="px-4 py-2">Vol Rank</th>
                                                <th className="px-4 py-2">MCap Rank</th>
                                                <th className="px-4 py-2">Overall Rank</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {rows.map(r => (
                                                <tr key={r.ticker} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-4 py-2">{rankBadge(r.sector_rank_change)}</td>
                                                    <td className="px-4 py-2 font-bold text-foreground">{r.ticker}</td>
                                                    <td className="px-4 py-2 text-foreground">₹{fmt(r.latest_close)}</td>
                                                    <td className="px-4 py-2">{fmtPct(r.change_1d_pct)}</td>
                                                    <td className="px-4 py-2 text-muted-foreground">#{r.sector_rank_volume}</td>
                                                    <td className="px-4 py-2 text-muted-foreground">#{r.sector_rank_mcap}</td>
                                                    <td className="px-4 py-2 text-primary font-medium">#{r.overall_rank}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Panel>
    );
};

/* ════════════════════════════════════════════
   PANEL 3 — Streak Detector (LAG Window Function)
   SQL: LAG(close_price) OVER (PARTITION BY company_id ORDER BY timestamp)
   ════════════════════════════════════════════ */
const StreakDetector = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/streaks')
            .then(r => setData(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const streakColor = (dir, days) => {
        if (dir === 'up')   return days >= 3 ? 'text-green-400' : 'text-green-600';
        if (dir === 'down') return days >= 3 ? 'text-red-400'   : 'text-red-600';
        return 'text-muted-foreground';
    };
    const streakIcon = (dir) => {
        if (dir === 'up')   return <TrendingUp className="w-4 h-4 text-green-400" />;
        if (dir === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    };
    const streakLabel = (dir, days) => {
        if (dir === 'up')   return `${days}-day winning streak`;
        if (dir === 'down') return `${days}-day losing streak`;
        return 'Flat';
    };

    return (
        <Panel
            title="Consecutive Streak Detector"
            icon={Activity}
            iconColor="text-sky-400"
            badge="LAG() OVER (PARTITION BY company_id)"
            description="Consecutive days each stock has been moving in the same direction."
        >
            {loading ? (
                <div className="text-muted-foreground text-sm text-center py-8">Loading…</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {data.map(r => (
                        <div
                            key={r.ticker}
                            className="bg-muted/20 border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-foreground text-sm">{r.ticker}</div>
                                {streakIcon(r.streak_dir)}
                            </div>
                            <div className={`text-2xl font-black ${streakColor(r.streak_dir, r.streak_days)}`}>
                                {r.streak_days}d
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 leading-tight">
                                {streakLabel(r.streak_dir, r.streak_days)}
                            </div>
                            <div className="text-xs text-foreground/60 mt-1">₹{fmt(r.latest_close)}</div>
                        </div>
                    ))}
                </div>
            )}
        </Panel>
    );
};

/* ════════════════════════════════════════════
   PANEL 4 — DB Objects (View + Procedure info)
   ════════════════════════════════════════════ */
const DbObjectsPanel = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/db-objects')
            .then(r => setData(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <Panel
            title="Database Objects"
            icon={Database}
            iconColor="text-violet-400"
            badge="information_schema"
            description="Live inventory of VIEWs and STORED PROCEDURES in the warehouse schema."
        >
            {loading ? (
                <div className="text-muted-foreground text-sm text-center py-8">Loading…</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Views */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Table2 className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-semibold text-foreground">Views ({data?.views?.length ?? 0})</span>
                        </div>
                        <div className="space-y-2">
                            {data?.views?.map(v => (
                                <div key={v.name} className="bg-muted/30 border border-border rounded-lg px-4 py-3">
                                    <div className="font-mono text-sm text-cyan-300">{v.name}</div>
                                    {v.name === 'vw_screener_base' && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Pre-joins companies + latest prices + technical indicators.
                                            Powers Screener and Analytics queries.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Procedures */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Code2 className="w-4 h-4 text-violet-400" />
                            <span className="text-sm font-semibold text-foreground">Procedures ({data?.procedures?.length ?? 0})</span>
                        </div>
                        <div className="space-y-2">
                            {data?.procedures?.map(p => (
                                <div key={p.name} className="bg-muted/30 border border-border rounded-lg px-4 py-3">
                                    <div className="font-mono text-sm text-violet-300">{p.name}</div>
                                    {p.name === 'sp_refresh_technicals' && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Recalculates MA50, MA200, RSI from raw stock_prices using LAG()
                                            and upserts results into technical_indicators.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Panel>
    );
};

/* ════════════════════════════════════════════
   PANEL 5 — Refresh Technicals (Stored Procedure)
   SQL: CALL sp_refresh_technicals(company_id)
   ════════════════════════════════════════════ */
const RefreshTechnicalsPanel = () => {
    const [companies, setCompanies] = useState([]);
    const [selected, setSelected]   = useState('');
    const [loading, setLoading]     = useState(false);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState(null);

    useEffect(() => {
        api.get('/companies')
            .then(r => {
                setCompanies(r.data.data || []);
                if (r.data.data?.length) setSelected(String(r.data.data[0].company_id));
            })
            .catch(() => {});
    }, []);

    const handleRefresh = useCallback(async () => {
        if (!selected) return;
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const r = await api.post('/analytics/refresh-technicals', { company_id: Number(selected) });
            setResult(r.data.data);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed');
        } finally {
            setLoading(false);
        }
    }, [selected]);

    return (
        <Panel
            title="Refresh Technical Indicators"
            icon={RefreshCw}
            iconColor="text-orange-400"
            badge="CALL sp_refresh_technicals(?)"
            description="Triggers the stored procedure to recalculate MA50, MA200 &amp; RSI from raw price data."
        >
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="space-y-1 flex-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Company</label>
                    <select
                        value={selected}
                        onChange={e => { setSelected(e.target.value); setResult(null); }}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                        {companies.map(c => (
                            <option key={c.company_id} value={c.company_id}>
                                {c.ticker} — {c.company_name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading || !selected}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Running…' : 'Run Procedure'}
                </button>
            </div>

            {error && (
                <div className="mt-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 bg-muted/30 border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-green-400" />
                        Procedure returned — technical_indicators updated
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'MA 50',   value: `₹${fmt(result.ma_50)}`,  color: 'text-sky-400' },
                            { label: 'MA 200',  value: `₹${fmt(result.ma_200)}`, color: 'text-violet-400' },
                            { label: 'RSI 14',  value: fmt(result.rsi),           color: 'text-orange-400' },
                            { label: 'Computed', value: new Date(result.computed_at).toLocaleTimeString(), color: 'text-muted-foreground' },
                        ].map(m => (
                            <div key={m.label} className="bg-card border border-border rounded-lg p-3 text-center">
                                <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                                <div className={`font-mono font-bold text-sm ${m.color}`}>{m.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Panel>
    );
};

/* ════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════ */
const Analytics = () => (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <BarChart2 className="w-7 h-7 text-primary" />
                    Analytics & Insights
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Advanced SQL features: Window Functions, GROUP BY aggregations, Views &amp; Stored Procedures.
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                {[
                    { label: 'RANK() OVER()', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                    { label: 'LAG() OVER()',  color: 'bg-sky-500/10    text-sky-400    border-sky-500/20'    },
                    { label: 'GROUP BY',      color: 'bg-green-500/10  text-green-400  border-green-500/20'  },
                    { label: 'CREATE VIEW',   color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                    { label: 'PROCEDURE',     color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                ].map(t => (
                    <span key={t.label} className={`text-xs font-mono px-2.5 py-1 rounded-full border ${t.color}`}>{t.label}</span>
                ))}
            </div>
        </div>

        {/* Panel 1: Heatmap */}
        <SectorHeatmap />

        {/* Panel 2: Sector Rankings */}
        <SectorRankings />

        {/* Panel 3: Streak Detector */}
        <StreakDetector />

        {/* Panels 4 & 5 side by side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <DbObjectsPanel />
            <RefreshTechnicalsPanel />
        </div>
    </div>
);

export default Analytics;
