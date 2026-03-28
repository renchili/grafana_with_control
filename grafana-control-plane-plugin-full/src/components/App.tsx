import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DraftsPage } from '../pages/DraftsPage';
import { ConflictPage } from '../pages/ConflictPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="drafts" replace />} />
      <Route path="drafts" element={<DraftsPage />} />
      <Route path="conflict" element={<ConflictPage />} />
    </Routes>
  );
};
