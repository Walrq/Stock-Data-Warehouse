import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyApi } from '../services/api';
import MetricCard from '../components/MetricCard';
import { Briefcase } from 'lucide-react';

const Dashboard = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await companyApi.getAll();
                setCompanies(res.data.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch companies. Ensure backend is running.');
                setLoading(false);
            }
        };

        fetchCompanies();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
                    <p className="text-sm text-muted-foreground mt-1">Monitor your tracked companies and market activity.</p>
                </div>
                <button
                    onClick={() => navigate('/add-company')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer text-sm"
                >
                    + New Company
                </button>
            </div>

            {/* Metrics — only Total Companies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Companies" value={companies.length} icon={Briefcase} />
            </div>

            {/* Companies List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border">
                    <h2 className="text-base font-semibold text-foreground">Tracked Companies</h2>
                    <p className="text-sm text-muted-foreground mt-1">Select a company to view historical stock prices and insights.</p>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading companies...</div>
                ) : error ? (
                    <div className="p-8 text-center text-destructive">{error}</div>
                ) : companies.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No companies found. Click "+ New Company" to add one.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Company Name</th>
                                    <th className="px-6 py-4 font-medium">Symbol</th>
                                    <th className="px-6 py-4 font-medium">Price</th>
                                    <th className="px-6 py-4 font-medium">1D %</th>
                                    <th className="px-6 py-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {companies.map((co) => (
                                    <tr key={co.company_id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground">{co.company_name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-primary/15 text-primary text-xs font-bold rounded-md border border-primary/20">
                                                {co.ticker}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {co.latest_close != null ? `₹${Number(co.latest_close).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {co.change_1d_pct != null
                                                ? <span className={Number(co.change_1d_pct) >= 0 ? 'text-green-500' : 'text-destructive'}>
                                                    {Number(co.change_1d_pct) >= 0 ? '+' : ''}{Number(co.change_1d_pct).toFixed(2)}%
                                                  </span>
                                                : <span className="text-muted-foreground">—</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/company/${co.ticker}`)}
                                                className="text-primary hover:text-primary/80 transition-colors cursor-pointer text-sm font-medium"
                                            >
                                                View Details →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
