import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Companies', path: '/companies', icon: Building2 },
        { name: 'Subscriptions', path: '#', icon: CreditCard },
        { name: 'Settings', path: '#', icon: Settings },
    ];

    return (
        <div className="w-64 bg-slate-900 min-h-screen text-slate-300 flex flex-col">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">SaaS Admin</h2>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path) && item.path !== '#';
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mb-4">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
}
