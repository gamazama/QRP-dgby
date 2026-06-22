import { createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './pages/AppLayout';
import { BuildPage } from './pages/BuildPage';
import { LibraryPage } from './pages/LibraryPage';
import { StylesPage } from './pages/StylesPage';
import { PresentPage } from './pages/PresentPage';
import { ViewPage } from './pages/ViewPage';

// Hash history: GitHub Pages has no SPA rewrite, so deep links / refresh on a
// browser-history route would 404. Hash routing avoids that without a 404.html hack.
export const router = createHashRouter([
  // Patient playback link — standalone, no app chrome.
  { path: 'view', element: <ViewPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/build" replace /> },
      { path: 'build', element: <BuildPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'styles', element: <StylesPage /> },
      { path: 'present', element: <PresentPage /> },
    ],
  },
]);
