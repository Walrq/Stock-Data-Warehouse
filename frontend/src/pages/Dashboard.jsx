import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyApi } from '../services/api';
import MetricCard from '../components/MetricCard';
import { Users, TrendingUp, Activity, Briefcase } from 'lucide-react';

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
                <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                <button 
                  onClick={() => navigate('/add-company')}
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer"
                >
                    + New Company
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard title="Total Companies" value={companies.length} icon={Briefcase} />
                <MetricCard title="Active Trades" value="24,593" icon={Activity} />
                <MetricCard title="Daily Volume" value="1.2M" icon={Users} trend={{ isPositive: true, value: 12.5 }} />
                <MetricCard title="Avg Portfolio Growth" value="+4.2%" icon={TrendingUp} trend={{ isPositive: true, value: 4.2 }} />
            </div>

            {/* Companies List */}
            <div className="bg-dark-card border border-dark-bor rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-dark-bor">
                    <h2 className="text-lg font-bold text-white">Tracked Companies</h2>
                    <p className="text-sm text-dark-muted mt-1">Select a company to view historical stock prices and insights.</p>
                </div>
                
                {loading ? (
                    <div className="p-8 text-center text-dark-muted">Loading companies...</div>
                ) : error ? (
                    <div className="p-8 text-center text-danger">{error}</div>
                ) : companies.length === 0 ? (
                    <div className="p-8 text-center text-dark-muted">No companies found. Click "New Company" to add one.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-dark-bg text-dark-muted text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Company Name</th>
                                    <th className="px-6 py-4 font-medium">Symbol</th>
                                    <th className="px-6 py-4 font-medium">Sector</th>
                                    <th className="px-6 py-4 font-medium">Industry</th>
                                    <th className="px-6 py-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-bor">
                                {companies.map((co) => (
                                    <tr key={co.company_id} className="hover:bg-dark-bg/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{co.company_name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/20">
                                                {co.ticker}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-dark-muted">{co.sector || '-'}</td>
                                        <td className="px-6 py-4 text-dark-muted">{co.industry || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => navigate(`/company/${co.ticker}`)}
                                                className="text-primary hover:text-white transition-colors cursor-pointer text-sm font-medium"
                                            >
                                                View Details &rarr;
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
