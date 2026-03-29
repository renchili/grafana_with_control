import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { DraftsPage } from '../pages/DraftsPage';
import { ConflictPage } from '../pages/ConflictPage';
import { PublishCenterPage } from '../pages/PublishCenterPage';
import { GovernancePage } from '../pages/GovernancePage';
import { DatasourceChangesPage } from '../pages/DatasourceChangesPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="drafts" replace />} />
      <Route path="drafts" element={<DraftsPage />} />
      <Route path="publish-center" element={<PublishCenterPage />} />
      <Route path="conflict" element={<ConflictPage />} />
      <Route path="governance" element={<GovernancePage />} />
      <Route path="datasource-changes" element={<DatasourceChangesPage />} />
    </Routes>
  );
};
