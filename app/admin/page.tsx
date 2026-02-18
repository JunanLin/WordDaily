import { validateRole } from '@/lib/security'
import { getTranslations } from 'next-intl/server'

export default async function AdminPage() {
    // Only admins can access this page
    await validateRole(['admin'])
    const t = await getTranslations('admin')

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-white/60">Secure access granted. Only administrators can see this content.</p>

            <div className="grid grid-cols-1 gap-4">
                <div className="card">
                    <h2 className="text-xl font-semibold mb-2">Security Audit Logs</h2>
                    <p className="text-sm text-white/40 mb-4">View recent security events and unauthorized access attempts.</p>
                    {/* Security log component would go here */}
                    <button className="btn-primary w-full" disabled>View Logs (Available Soon)</button>
                </div>

                <div className="card">
                    <h2 className="text-xl font-semibold mb-2">User Management</h2>
                    <p className="text-sm text-white/40 mb-4">Manage user roles and permissions.</p>
                    <button className="btn-secondary w-full" disabled>Manage Users (Available Soon)</button>
                </div>
            </div>
        </div>
    )
}
