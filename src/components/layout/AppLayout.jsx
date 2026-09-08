import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import Toast from '../common/Toast';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <Toast />
    </div>
  );
}
