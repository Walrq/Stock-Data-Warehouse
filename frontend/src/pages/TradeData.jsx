import React, { useEffect, useState } from 'react';
import { tradeApi } from '../services/api';

const TradeData = () => {
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [limit, setLimit] = useState(50);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (isMounted) setLoading(true);
            try {
                const res = await tradeApi.getHistory({ limit });
                if (isMounted) setTrades(res.data.data);
            } catch (err) {
                console.error(err);
                if (isMounted) setError('Failed to fetch trade data.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        load();
        return () => { isMounted = false; };
    }, [limit]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Trade History</h1>
                    <p className="text-sm text-muted-foreground mt-1">Real-time log of market transactions across all tracked symbols.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">Show:</span>
                    <select 
                        className="bg-card border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:border-primary text-sm"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                    >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">Loading trades...</div>
                ) : error ? (
                    <div className="p-8 text-center text-destructive">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Transaction ID</th>
                                    <th className="px-6 py-4 font-medium">Timestamp</th>
                                    <th className="px-6 py-4 font-medium">Symbol</th>
                                    <th className="px-6 py-4 font-medium">Price</th>
                                    <th className="px-6 py-4 font-medium text-right">Quantity</th>
                                    <th className="px-6 py-4 font-medium text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {trades.map((trade) => {
                                    const totalValue = Number(trade.price) * Number(trade.quantity);
                                    return (
                                        <tr key={trade.trade_id} className="hover:bg-background/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-muted-foreground">TXN-{String(trade.trade_id).padStart(6, '0')}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {new Date(trade.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-primary">{trade.ticker}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">₹{Number(trade.price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right text-sm text-muted-foreground">{trade.quantity.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-green-500">₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                                {trades.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">
                                            No recent transactions logged in the database.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradeData;
