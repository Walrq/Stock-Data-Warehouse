import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CompanyDetail from './pages/CompanyDetail';
import AddCompany from './pages/AddCompany';
import TradeData from './pages/TradeData';
import Research from './pages/Research';
import Screener from './pages/Screener'; // [SCREENER FEATURE]
import Analytics from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="company/:symbol" element={<CompanyDetail />} />
          <Route path="add-company" element={<AddCompany />} />
          <Route path="trades" element={<TradeData />} />
          <Route path="research" element={<Research />} />
          <Route path="screener" element={<Screener />} /> {/* [SCREENER FEATURE] */}
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
