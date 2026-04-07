import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { companyApi, stockApi, indicatorApi } from '../services/api';
import StockChart from '../components/StockChart';
import IndicatorsChart from '../components/IndicatorsChart';

const CompanyDetail = () => {
    const { symbol } = useParams();
    const navigate = useNavigate();
    
    const [company, setCompany] = useState(null);
    const [stockData, setStockData] = useState([]);
    const [indicators, setIndicators] = useState([]);
    
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
        <div className="space-y-6">
            <button 
                onClick={() => navigate(-1)}
                className="text-dark-muted hover:text-white transition-colors text-sm font-medium mb-4 inline-block"
            >
                &larr; Back to Dashboard
            </button>

            {loading ? (
                <div className="text-center p-12 text-dark-muted">Loading Data...</div>
            ) : error ? (
                <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-xl">
                    {error}
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-white tracking-tight">{company.company_name}</h1>
                                <span className="px-3 py-1 bg-primary/20 text-primary font-bold rounded-lg border border-primary/20">
                                    {company.ticker}
                                </span>
                            </div>
                            <div className="flex gap-4 text-sm text-dark-muted font-medium mt-3">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success"></span> {company.sector || 'N/A Sector'}</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> {company.industry || 'N/A Industry'}</span>
                            </div>
                        </div>
                        
                        {/* Latest Price Snapshot */}
                        <div className="mt-6 md:mt-0 text-right">
                            <p className="text-sm font-medium text-dark-muted mb-1">Latest Close Price</p>
                            <h2 className="text-3xl font-bold text-white">
                                ₹{stockData.length > 0 ? Number(stockData[stockData.length - 1].close_price).toFixed(2) : '0.00'}
                            </h2>
                            <p className="text-sm text-success font-medium mt-1">Live from Market</p>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <StockChart data={stockData} />
                        <IndicatorsChart data={indicators} />
                    </div>

                    {/* Data Table */}
                    <div className="bg-dark-card border border-dark-bor rounded-2xl overflow-hidden shadow-sm mt-8">
                        <div className="p-6 border-b border-dark-bor">
                            <h2 className="text-lg font-bold text-white">Recent Daily Quotes (OHLCV)</h2>
                        </div>
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-left relative">
                                <thead className="bg-dark-bg text-dark-muted text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Date</th>
                                        <th className="px-6 py-4 font-medium">Open</th>
                                        <th className="px-6 py-4 font-medium">High</th>
                                        <th className="px-6 py-4 font-medium">Low</th>
                                        <th className="px-6 py-4 font-medium">Close</th>
                                        <th className="px-6 py-4 font-medium">Volume</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-bor">
                                    {[...stockData].reverse().slice(0, 30).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-dark-bg/50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-white text-sm">
                                                {new Date(row.timestamp).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-dark-muted">₹{Number(row.open_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm text-success">₹{Number(row.high_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm text-danger">₹{Number(row.low_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm font-bold text-white">₹{Number(row.close_price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-sm text-dark-muted">{Number(row.volume).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {stockData.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-dark-muted">No historical quotes available</td>
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
