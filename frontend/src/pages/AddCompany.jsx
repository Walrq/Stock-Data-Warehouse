import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyApi, externalApi } from '../services/api';

const AddCompany = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        company_name: '',
        ticker: ''
    });
    
    const [status, setStatus] = useState({ loading: false, error: null, success: false });

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.name === 'ticker' ? e.target.value.toUpperCase() : e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, error: null, success: false });
        
        try {
            // 1. Add Company
            const res = await companyApi.add(formData);
            const newCompany = res.data.data;
            
            // 2. Fetch historical data for this company
            await externalApi.fetchHistorical({
                name: newCompany.ticker,
                company_id: newCompany.company_id
            });
            await externalApi.fetchNews({
                company_id: newCompany.company_id
            });
            // 3. Track and Cache Rich Profile Data
            await externalApi.fetchProfile({
                name: newCompany.ticker,
                company_id: newCompany.company_id
            });

            setStatus({ loading: false, error: null, success: true });
            
            // Redirect after 1.5 seconds
            setTimeout(() => {
                navigate(`/company/${newCompany.ticker}`);
            }, 1500);
            
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setStatus({ loading: false, error: errorMessage, success: false });
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Add New Company</h1>
                <p className="text-muted-foreground mt-2">Track a new stock ticker in the data warehouse. Historical data will be automatically fetched upon creation.</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8">
                {status.success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl font-medium">
                        Successfully added company and retrieved historical data! Redirecting...
                    </div>
                )}
                
                {status.error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl font-medium">
                        Error: {status.error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Company Name *</label>
                            <input 
                                required
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleChange}
                                placeholder="Reliance Industries Limited"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Ticker Symbol *</label>
                            <input 
                                required
                                name="ticker"
                                value={formData.ticker}
                                onChange={handleChange}
                                placeholder="RELIANCE"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end gap-3 mt-8">
                        <button 
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 rounded-xl font-medium border border-border text-foreground hover:bg-background transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={status.loading}
                            className="bg-primary hover:bg-primary/90 text-foreground px-8 py-3 rounded-xl font-medium transition-colors border border-primary disabled:opacity-50"
                        >
                            {status.loading ? 'Adding...' : 'Add Company & Fetch Data'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCompany;
