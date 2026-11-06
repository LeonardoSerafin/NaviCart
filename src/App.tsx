import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import StoreCatalogPage from './pages/StoreCatalogPage';
import MyListsPage from './pages/MyListsPage';
import ListDetailPage from './pages/ListDetailPage';
import AccountPage from './pages/AccountPage';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Macro Screen 1: Home */}
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomePage />} />
            {/* Screen 1.1: Store Catalog & List Assignment */}
            <Route path="store/:storeId" element={<StoreCatalogPage />} />

            {/* Macro Screen 2: My Lists */}
            <Route path="lists" element={<MyListsPage />} />
            {/* Screen 2.1: List Detail & In-Store Navigation */}
            <Route path="lists/:listId" element={<ListDetailPage />} />

            {/* Macro Screen 3: Account */}
            <Route path="account" element={<AccountPage />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
