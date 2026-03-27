import { AppPlugin } from '@grafana/data';
import { DraftsPage } from './pages/DraftsPage';
import { ConflictPage } from './pages/ConflictPage';

export const plugin = new AppPlugin()
  .addPage({
    title: 'Drafts',
    icon: 'copy',
    component: DraftsPage,
  })
  .addPage({
    title: 'Conflict Resolve',
    icon: 'git-branch',
    component: ConflictPage,
  });
