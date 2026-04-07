import React, { useEffect, useState } from 'react';
import { tradeApi } from '../services/api';

const TradeData = () => {
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [limit, setLimit] = useState(50);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const res = await tradeApi.getHistory({ limit });
            setTrades(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch trade data.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrades();
    }, [limit]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Trade History</h1>
                    <p className="text-sm text-dark-muted mt-1">Real-time log of market transactions across all tracked symbols.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-muted font-medium">Show:</span>
                    <select 
                        className="bg-dark-card border border-dark-bor rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary text-sm"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                    >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            <div className="bg-dark-card border border-dark-bor rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-dark-muted">Loading trades...</div>
                ) : error ? (
                    <div className="p-8 text-center text-danger">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-dark-bg text-dark-muted text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Transaction ID</th>
                                    <th className="px-6 py-4 font-medium">Timestamp</th>
                                    <th className="px-6 py-4 font-medium">Symbol</th>
                                    <th className="px-6 py-4 font-medium">Price</th>
                                    <th className="px-6 py-4 font-medium text-right">Quantity</th>
                                    <th className="px-6 py-4 font-medium text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-bor">
                                {trades.map((trade) => {
                                    const totalValue = Number(trade.price) * Number(trade.quantity);
                                    return (
                                        <tr key={trade.id} className="hover:bg-dark-bg/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-dark-muted">TXN-{String(trade.id).padStart(6, '0')}</td>
                                            <td className="px-6 py-4 text-sm text-dark-muted">
                                                {new Date(trade.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-primary">{trade.symbol}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-white">₹{Number(trade.price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right text-sm text-dark-muted">{trade.quantity.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-success">₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                                {trades.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-dark-muted">
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
