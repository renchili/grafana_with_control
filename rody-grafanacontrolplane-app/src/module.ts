import { AppPlugin } from '@grafana/data';
import { DraftsPage } from './pages/DraftsPage';

export const plugin = new AppPlugin()
  .addPage({
    title: 'Drafts',
    path: '/drafts',
    component: DraftsPage,
  });
