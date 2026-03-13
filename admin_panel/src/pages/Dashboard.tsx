import { useEffect, useState } from 'react';
import { Users, Building, Activity, Target } from 'lucide-react';
import api from '../api/axios';

type DashboardStats = {
    total_clients: number;
    active_clients: number;
    inactive_clients: number;
    total_crm_users: number;
    total_leads: number;
};

const defaultStats: DashboardStats = {
    total_clients: 0,
    active_clients: 0,
    inactive_clients: 0,
    total_crm_users: 0,
    total_leads: 0,
};

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>(defaultStats);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get<Partial<DashboardStats>>('admin/dashboard');
                setStats({
                    ...defaultStats,
                    ...response.data,
                });
            } catch (error) {
                console.error('Failed to load dashboard stats:', error);
            }
        };

        void fetchStats();
    }, []);

    const cards = [
        { title: 'Total Companies', value: stats.total_clients, icon: Building, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Active Tenants', value: stats.active_clients, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { title: 'Total CRM Users', value: stats.total_crm_users, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
        { title: 'Total Leads Managed', value: stats.total_leads, icon: Target, color: 'text-amber-600', bg: 'bg-amber-100' },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Platform Overview</h1>
                <p className="text-slate-500 mt-1">Monitor all multi-tenant CRM activity</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => (
                    <div key={card.title} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                                <h3 className="text-3xl font-bold text-slate-800 mt-2">{card.value}</h3>
                            </div>
                            <div className={`p-3 rounded-lg ${card.bg}`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
