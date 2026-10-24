import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import './index.css';
import { CompetitorListPage } from './pages/CompetitorListPage';
import { TimelinePage } from './pages/TimelinePage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CompetitorListPage />} />
          <Route path="competitors/:id" element={<TimelinePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
