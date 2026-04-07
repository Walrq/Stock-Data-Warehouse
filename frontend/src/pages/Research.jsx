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
                <h1 className="text-3xl font-bold text-white tracking-tight">Research & Discover</h1>
                <p className="text-dark-muted mt-2">Instantly search your local warehouse or query global market feeds for new opportunities.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Panel 1: Local Search */}
                <div className="bg-dark-card border border-dark-bor rounded-2xl flex flex-col overflow-hidden shadow-sm h-full">
                    <div className="p-6 border-b border-dark-bor bg-dark-bg/50">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <Search className="w-5 h-5" />
                            <h2 className="text-lg font-bold text-white">Local Warehouse</h2>
                        </div>
                        <p className="text-xs text-dark-muted mb-4">Search tracked symbols and companies inside your local cache.</p>
                        
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search by name or symbol..."
                                value={localQuery}
                                onChange={(e) => setLocalQuery(e.target.value)}
                                className="w-full bg-dark-bg border border-dark-bor rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            />
                            <Search className="w-4 h-4 text-dark-muted absolute left-4 top-4" />
                        </div>
                    </div>
                    
                    <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
                        {localSearching ? (
                            <div className="p-6 text-center text-dark-muted text-sm">Searching...</div>
                        ) : localResults.length > 0 ? (
                            <ul className="space-y-1">
                                {localResults.map(co => (
                                    <li key={co.company_id}>
                                        <button 
                                            onClick={() => navigate(`/company/${co.ticker}`)}
                                            className="w-full text-left p-4 hover:bg-dark-bg rounded-xl transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-bold text-white">{co.ticker}</div>
                                                <div className="text-xs text-dark-muted">{co.company_name}</div>
                                            </div>
                                            <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">View &rarr;</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : localQuery.length > 0 ? (
                            <div className="p-6 text-center text-dark-muted text-sm">No exact matches found.</div>
                        ) : (
                            <div className="p-10 flex flex-col items-center justify-center text-center text-dark-muted h-full opacity-50">
                                <Search className="w-12 h-12 mb-3" />
                                <span className="text-sm">No companies tracked yet. Track from external feeds!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel 2: External Discover */}
                <div className="bg-dark-card border border-dark-bor rounded-2xl flex flex-col overflow-hidden shadow-sm h-full max-h-[700px]">
                    <div className="p-6 border-b border-dark-bor bg-dark-bg/50">
                        <div className="flex items-center gap-2 text-success mb-2">
                            <Zap className="w-5 h-5" />
                            <h2 className="text-lg font-bold text-white">Market Intelligence</h2>
                        </div>
                        <p className="text-xs text-dark-muted mb-4">Query external feeds to generate detailed reports on untracked entities.</p>
                        
                        <form onSubmit={handleExternalResearch} className="flex gap-2 relative">
                            <input 
                                type="text"
                                placeholder="Enter public ticker (e.g., RELIANCE)"
                                value={externalQuery}
                                onChange={(e) => setExternalQuery(e.target.value.toUpperCase())}
                                className="flex-1 bg-dark-bg border border-dark-bor rounded-xl px-4 py-3 text-white focus:outline-none focus:border-success focus:ring-1 focus:ring-success uppercase transition-colors"
                            />
                            <button 
                                type="submit"
                                disabled={externalSearching || !externalQuery}
                                className="bg-success text-white px-5 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                                {externalSearching ? 'Wait...' : 'Analyze'}
                            </button>
                        </form>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        {externalError && (
                            <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl flex gap-2 items-center text-sm font-medium mb-4">
                                <AlertCircle className="w-4 h-4" />
                                {externalError}
                            </div>
                        )}

                        {!externalProfile && !externalSearching && !externalError && (
                             <div className="flex flex-col items-center justify-center text-center text-dark-muted h-full opacity-50 mt-10">
                                <Zap className="w-12 h-12 mb-3" />
                                <span className="text-sm">Run analysis to build standard profile</span>
                             </div>
                        )}

                        {externalProfile && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{externalProfile.companyName || externalProfile.name || 'Unknown'}</h2>
                                        <span className="text-sm font-bold px-2 py-0.5 mt-1 inline-block bg-success/20 text-success rounded border border-success/30">
                                            {externalProfile.tickerId || externalProfile.symbol || externalProfile.ticker || externalQuery}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-dark-muted uppercase font-bold tracking-wider">Sector</div>
                                        <div className="text-sm text-white font-medium">{externalProfile.sector || 'N/A'}</div>
                                    </div>
                                </div>
                                
                                {externalProfile.companyProfile?.companyDescription && (
                                    <p className="text-sm text-dark-muted border-l-2 border-dark-bor pl-3 line-clamp-3">
                                        {externalProfile.companyProfile.companyDescription}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="bg-dark-bg p-3 rounded-xl border border-dark-bor">
                                         <div className="text-xs text-dark-muted mb-1">Market Cap</div>
                                         <div className="font-bold text-white">{externalProfile.keyMetrics?.marketCap || 'N/A'}</div>
                                    </div>
                                    <div className="bg-dark-bg p-3 rounded-xl border border-dark-bor">
                                         <div className="text-xs text-dark-muted mb-1">Current Price</div>
                                         <div className="font-bold text-white">{externalProfile.currentPrice?.NSE || externalProfile.currentPrice?.BSE || 'N/A'}</div>
                                    </div>
                                    <div className="bg-dark-bg p-3 rounded-xl border border-dark-bor">
                                         <div className="text-xs text-dark-muted mb-1">52W High</div>
                                         <div className="font-bold text-success">{externalProfile.yearHigh || 'N/A'}</div>
                                    </div>
                                    <div className="bg-dark-bg p-3 rounded-xl border border-dark-bor">
                                         <div className="text-xs text-dark-muted mb-1">52W Low</div>
                                         <div className="font-bold text-danger">{externalProfile.yearLow || 'N/A'}</div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-dark-bor">
                                    {trackSuccess ? (
                                        <div className="w-full flex items-center justify-center gap-2 py-3 bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold">
                                            <CheckCircle2 className="w-5 h-5" /> Saved to Warehouse! Redirecting...
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={trackCompany}
                                            disabled={tracking}
                                            className="w-full bg-primary hover:bg-primary-hover active:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
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
