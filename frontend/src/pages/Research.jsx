import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { externalApi, companyApi } from '../services/api';

const Research = () => {
    const navigate = useNavigate();

    // Local DB Search State
    const [localQuery, setLocalQuery] = useState('');
    const [localResults, setLocalResults] = useState([]);
    const [localSearching, setLocalSearching] = useState(false);

    // External Research State
    const [externalQuery, setExternalQuery] = useState('');
    const [externalProfile, setExternalProfile] = useState(null);
    const [externalSearching, setExternalSearching] = useState(false);
    const [externalError, setExternalError] = useState('');
    const [tracking, setTracking] = useState(false);
    const [trackSuccess, setTrackSuccess] = useState(false);

    // Explicitly call search from an effect or direct event
    React.useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            setLocalSearching(true);
            try {
                const searchParam = localQuery ? { search: localQuery } : {};
                const res = await companyApi.getAll(searchParam);
                setLocalResults(res.data.data || []);
            } catch (err) {
                console.error("Local search error:", err);
            }
            setLocalSearching(false);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [localQuery]);

    // External Research
    const handleExternalResearch = async (e) => {
        e.preventDefault();
        if (!externalQuery) return;
        
        setExternalSearching(true);
        setExternalError('');
        setExternalProfile(null);
        setTrackSuccess(false);

        try {
            const res = await externalApi.fetchProfile({ name: externalQuery });
            setExternalProfile(res.data.data);
        } catch (err) {
             setExternalError(err.response?.data?.message || err.message || 'Entity not found.');
        } finally {
            setExternalSearching(false);
        }
    };

    // Track researched profile
    const trackCompany = async () => {
        setTracking(true);
        try {
            let marketCap = null;
            if (externalProfile.keyMetrics?.marketCap) {
                marketCap = typeof externalProfile.keyMetrics.marketCap === 'string' 
                            ? parseFloat(externalProfile.keyMetrics.marketCap.replace(/[^0-9.]/g,'')) 
                            : externalProfile.keyMetrics.marketCap;
            }

            const payload = {
                company_name: externalProfile.companyName || externalProfile.name || 'Unknown',
                ticker: externalProfile.tickerId || externalProfile.symbol || externalProfile.ticker || externalQuery,
                sector: externalProfile.sector || null,
                industry: externalProfile.industry || null,
                market_cap: marketCap
            };

            const res = await companyApi.add(payload);
            const newId = res.data.data.company_id;
            
            // Build historical stats
            await externalApi.fetchHistorical({ name: payload.ticker, company_id: newId });
            // Fetch news
            await externalApi.fetchNews({ company_id: newId });

            setTrackSuccess(true);
            
            setTimeout(() => {
                navigate(`/company/${payload.ticker}`);
            }, 1000);
            
        } catch (err) {
            setExternalError(err.response?.data?.message || 'Error tracking entity. Did you already track this ticker?');
        } finally {
            setTracking(false);
        }
    };


    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Research & Discover</h1>
                <p className="text-muted-foreground mt-2">Instantly search your local warehouse or query global market feeds for new opportunities.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Panel 1: Local Search */}
                <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-sm h-full">
                    <div className="p-6 border-b border-border bg-background/50">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <Search className="w-5 h-5" />
                            <h2 className="text-lg font-bold text-foreground">Local Warehouse</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Search tracked symbols and companies inside your local cache.</p>
                        
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search by name or symbol..."
                                value={localQuery}
                                onChange={(e) => setLocalQuery(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            />
                            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-4" />
                        </div>
                    </div>
                    
                    <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
                        {localSearching ? (
                            <div className="p-6 text-center text-muted-foreground text-sm">Searching...</div>
                        ) : localResults.length > 0 ? (
                            <ul className="space-y-1">
                                {localResults.map(co => (
                                    <li key={co.company_id}>
                                        <button 
                                            onClick={() => navigate(`/company/${co.ticker}`)}
                                            className="w-full text-left p-4 hover:bg-background rounded-xl transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-bold text-foreground">{co.ticker}</div>
                                                <div className="text-xs text-muted-foreground">{co.company_name}</div>
                                            </div>
                                            <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">View &rarr;</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : localQuery.length > 0 ? (
                            <div className="p-6 text-center text-muted-foreground text-sm">No exact matches found.</div>
                        ) : (
                            <div className="p-10 flex flex-col items-center justify-center text-center text-muted-foreground h-full opacity-50">
                                <Search className="w-12 h-12 mb-3" />
                                <span className="text-sm">No companies tracked yet. Track from external feeds!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel 2: External Discover */}
                <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-sm h-full max-h-[700px]">
                    <div className="p-6 border-b border-border bg-background/50">
                        <div className="flex items-center gap-2 text-green-500 mb-2">
                            <Zap className="w-5 h-5" />
                            <h2 className="text-lg font-bold text-foreground">Market Intelligence</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Query external feeds to generate detailed reports on untracked entities.</p>
                        
                        <form onSubmit={handleExternalResearch} className="flex gap-2 relative">
                            <input 
                                type="text"
                                placeholder="Enter public ticker (e.g., RELIANCE)"
                                value={externalQuery}
                                onChange={(e) => setExternalQuery(e.target.value.toUpperCase())}
                                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 uppercase transition-colors"
                            />
                            <button 
                                type="submit"
                                disabled={externalSearching || !externalQuery}
                                className="bg-green-500 text-foreground px-5 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                                {externalSearching ? 'Wait...' : 'Analyze'}
                            </button>
                        </form>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        {externalError && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex gap-2 items-center text-sm font-medium mb-4">
                                <AlertCircle className="w-4 h-4" />
                                {externalError}
                            </div>
                        )}

                        {!externalProfile && !externalSearching && !externalError && (
                             <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full opacity-50 mt-10">
                                <Zap className="w-12 h-12 mb-3" />
                                <span className="text-sm">Run analysis to build standard profile</span>
                             </div>
                        )}

                        {externalProfile && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground">{externalProfile.companyName || externalProfile.name || 'Unknown'}</h2>
                                        <span className="text-sm font-bold px-2 py-0.5 mt-1 inline-block bg-green-500/20 text-green-500 rounded border border-green-500/30">
                                            {externalProfile.tickerId || externalProfile.symbol || externalProfile.ticker || externalQuery}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Sector</div>
                                        <div className="text-sm text-foreground font-medium">{externalProfile.sector || 'N/A'}</div>
                                    </div>
                                </div>
                                
                                {externalProfile.companyProfile?.companyDescription && (
                                    <p className="text-sm text-muted-foreground border-l-2 border-border pl-3 line-clamp-3">
                                        {externalProfile.companyProfile.companyDescription}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="bg-background p-3 rounded-xl border border-border">
                                         <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
                                         <div className="font-bold text-foreground">{externalProfile.keyMetrics?.marketCap || 'N/A'}</div>
                                    </div>
                                    <div className="bg-background p-3 rounded-xl border border-border">
                                         <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                                         <div className="font-bold text-foreground">{externalProfile.currentPrice?.NSE || externalProfile.currentPrice?.BSE || 'N/A'}</div>
                                    </div>
                                    <div className="bg-background p-3 rounded-xl border border-border">
                                         <div className="text-xs text-muted-foreground mb-1">52W High</div>
                                         <div className="font-bold text-green-500">{externalProfile.yearHigh || 'N/A'}</div>
                                    </div>
                                    <div className="bg-background p-3 rounded-xl border border-border">
                                         <div className="text-xs text-muted-foreground mb-1">52W Low</div>
                                         <div className="font-bold text-destructive">{externalProfile.yearLow || 'N/A'}</div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    {trackSuccess ? (
                                        <div className="w-full flex items-center justify-center gap-2 py-3 bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold">
                                            <CheckCircle2 className="w-5 h-5" /> Saved to Warehouse! Redirecting...
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={trackCompany}
                                            disabled={tracking}
                                            className="w-full bg-primary hover:bg-primary/90 active:bg-blue-700 text-foreground py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                                        >
                                            {tracking ? 'Ingesting data...' : `Track ${externalQuery} Locally`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Research;
