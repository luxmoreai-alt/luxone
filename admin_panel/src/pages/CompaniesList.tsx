import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Key, Trash2 } from 'lucide-react';
import api from '../api/axios';

type Company = {
    id: number;
    company_name: string;
    company_email: string;
    contact_person: string;
    db_name: string;
    subscription_plan: string;
    status: 'Active' | 'Inactive' | string;
};

type CompanyListResponse = Company[] | { results?: Company[] };

type CompanyFormData = {
    company_name: string;
    company_email: string;
    contact_person: string;
    subscription_plan: string;
};

type NewCredentials = {
    email: string;
    password: string;
};

const initialFormData: CompanyFormData = {
    company_name: '',
    company_email: '',
    contact_person: '',
    subscription_plan: 'Basic',
};

export default function CompaniesList() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
    const [isDeploying, setIsDeploying] = useState(false);
    const [newCredentials, setNewCredentials] = useState<NewCredentials | null>(null);

    const fetchCompanies = async () => {
        setIsLoading(true);
        setError('');

        try {
            const res = await api.get<CompanyListResponse>('admin/companies');
            const payload = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.results)
                    ? res.data.results
                    : [];

            setCompanies(payload);
        } catch (err: unknown) {
            setCompanies([]);

            if (axios.isAxiosError(err) && err.response?.status === 401) {
                setError('Your admin session expired. Please log in again.');
                return;
            }

            setError('Failed to load companies.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchCompanies();
    }, []);

    const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsDeploying(true);

        try {
            const res = await api.post<{ credentials?: NewCredentials }>('admin/companies', formData);
            setNewCredentials(res.data.credentials ?? null);
            await fetchCompanies();
            setFormData(initialFormData);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                alert(typeof err.response?.data?.error === 'string' ? err.response.data.error : 'Failed to provision database.');
            } else {
                alert('Failed to provision database.');
            }
        } finally {
            setIsDeploying(false);
        }
    };

    const suspendCompany = async (id: number) => {
        if (!confirm("Suspend this tenant's access?")) {
            return;
        }

        try {
            await api.patch(`admin/company/${id}/suspend`);
            await fetchCompanies();
        } catch {
            alert('Failed to suspend tenant.');
        }
    };

    const activateCompany = async (id: number) => {
        if (!confirm("Activate this tenant's access?")) {
            return;
        }

        try {
            await api.patch(`admin/company/${id}/activate`);
            await fetchCompanies();
        } catch {
            alert('Failed to activate tenant.');
        }
    };

    const regenerateCredentials = async (id: number) => {
        if (!confirm('Generate a new secure superuser credential for this tenant?')) {
            return;
        }

        try {
            const res = await api.post<NewCredentials>(`admin/companies/${id}/generate-credential`);
            alert(`New Password Generated:\nEmail: ${res.data.email}\nPassword: ${res.data.password}\n\nPlease copy this now!`);
        } catch {
            alert('Failed to generate new credentials.');
        }
    };

    const removeCompany = async (id: number, name: string) => {
        if (!confirm(`Remove ${name} from the client list? This cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`admin/companies/${id}`);
            await fetchCompanies();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                alert(typeof err.response?.data?.error === 'string' ? err.response.data.error : 'Failed to delete company and tenant database.');
            } else {
                alert('Failed to delete company and tenant database.');
            }
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
                    <p className="text-slate-500 mt-1">Manage SaaS tenants and databases</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> New Tenant
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
                            <th className="py-4 px-6">Company</th>
                            <th className="py-4 px-6">Contact</th>
                            <th className="py-4 px-6">Database Name</th>
                            <th className="py-4 px-6">Plan</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="py-10 px-6 text-center text-slate-500">
                                    Loading companies...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={6} className="py-10 px-6 text-center text-red-600">
                                    {error}
                                </td>
                            </tr>
                        ) : companies.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-10 px-6 text-center text-slate-500">
                                    No companies found.
                                </td>
                            </tr>
                        ) : (
                            companies.map((company) => (
                                <tr key={company.id} className="hover:bg-slate-50">
                                    <td className="py-4 px-6">
                                        <Link to={`/companies/${company.id}`} className="font-semibold text-slate-800 hover:text-blue-600">
                                            {company.company_name}
                                        </Link>
                                        <div className="text-sm text-slate-500">{company.company_email}</div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-600">{company.contact_person}</td>
                                    <td className="py-4 px-6">
                                        <span className="font-mono text-sm bg-slate-100 text-slate-600 px-2 py-1 rounded">{company.db_name}</span>
                                    </td>
                                    <td className="py-4 px-6 text-slate-600">{company.subscription_plan}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {company.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end items-center gap-2">
                                            <button onClick={() => regenerateCredentials(company.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Regenerate Credentials">
                                                <Key className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => removeCompany(company.id, company.company_name)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Remove Client"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            {company.status === 'Active' ? (
                                                <button
                                                    onClick={() => suspendCompany(company.id)}
                                                    className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200"
                                                    title="Suspend"
                                                >
                                                    Suspend
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => activateCompany(company.id)}
                                                    className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"
                                                    title="Activate"
                                                >
                                                    Activate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Provision New Tenant</h2>
                            <p className="text-sm text-slate-500 mt-1">Creates a new PostgreSQL database and maps the CRM.</p>
                        </div>

                        {newCredentials ? (
                            <div className="p-6">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                                    <h3 className="text-emerald-800 font-semibold mb-2">Deployed Successfully!</h3>
                                    <p className="text-emerald-600 text-sm mb-4">Please copy these superuser credentials securely. They are not stored in plaintext.</p>
                                    <div className="bg-white p-3 rounded font-mono text-sm text-slate-800">
                                        <div>Email: <span className="font-bold">{newCredentials.email}</span></div>
                                        <div>Password: <span className="font-bold">{newCredentials.password}</span></div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setNewCredentials(null);
                                    }}
                                    className="w-full bg-slate-800 text-white rounded-lg py-2"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                                    <input type="text" required value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Email</label>
                                    <input type="email" required value={formData.company_email} onChange={(e) => setFormData({ ...formData, company_email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                                        <input type="text" required value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
                                        <select value={formData.subscription_plan} onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Basic</option>
                                            <option>Pro</option>
                                            <option>Enterprise</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setNewCredentials(null);
                                        }}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isDeploying} className={`px-6 py-2 bg-blue-600 text-white rounded-lg ${isDeploying ? 'opacity-70 cursor-wait' : 'hover:bg-blue-700'}`}>
                                        {isDeploying ? 'Deploying DB...' : 'Create Tenant'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
