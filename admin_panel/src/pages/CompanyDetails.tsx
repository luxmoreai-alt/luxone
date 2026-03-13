import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Target, Activity } from 'lucide-react';
import api from '../api/axios';

type CompanyUsageStats = {
    total_crm_users: number;
    total_leads: number;
    storage_used_mb: number;
};

type CompanyDetailsResponse = {
    id: number;
    company_name: string;
    company_email: string;
    contact_person: string;
    phone: string | null;
    subscription_plan: string;
    db_name: string;
    status: string;
    created_at: string;
    usage_stats?: Partial<CompanyUsageStats>;
};

const defaultUsageStats: CompanyUsageStats = {
    total_crm_users: 0,
    total_leads: 0,
    storage_used_mb: 0,
};

export default function CompanyDetails() {
    const { id } = useParams();
    const [company, setCompany] = useState<CompanyDetailsResponse | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await api.get<CompanyDetailsResponse>(`admin/companies/${id}`);
                setCompany(res.data);
                setError('');
            } catch {
                setError('Failed to load company info.');
            }
        };

        if (id) {
            void fetchCompany();
        } else {
            setError('Company ID is missing.');
        }
    }, [id]);

    if (error) return <div className="p-8 text-red-600">{error}</div>;
    if (!company) return <div className="p-8 text-slate-500">Loading...</div>;

    const usageStats = {
        ...defaultUsageStats,
        ...company.usage_stats,
    };

    const usageCards = [
        {
            title: 'Registered CRM Users',
            value: usageStats.total_crm_users,
            icon: Users,
            iconClass: 'bg-purple-100 text-purple-600',
        },
        {
            title: 'Leads Managed',
            value: usageStats.total_leads,
            icon: Target,
            iconClass: 'bg-amber-100 text-amber-600',
        },
        {
            title: 'Storage Used',
            value: `${usageStats.storage_used_mb.toFixed(2)} MB`,
            icon: Activity,
            iconClass: 'bg-blue-100 text-blue-600',
        },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <Link to="/companies" className="flex items-center text-blue-600 hover:text-blue-700 mb-6 font-medium text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Companies
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{company.company_name}</h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm">{company.db_name}</span>
                            &bull; {company.subscription_plan} Plan
                        </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${company.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {company.status}
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-100">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Contact Person</p>
                        <p className="text-slate-800 font-medium">{company.contact_person}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Email</p>
                        <p className="text-slate-800 font-medium">{company.company_email}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Phone</p>
                        <p className="text-slate-800 font-medium">{company.phone || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Created</p>
                        <p className="text-slate-800 font-medium">{new Date(company.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-4">Tenant CRM Usage Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {usageCards.map((card) => (
                    <div key={card.title} className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${card.iconClass}`}><card.icon className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">{card.title}</p>
                            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
