import { apiGet } from '../../lib/api';

interface AdminRoundDto {
  id: string;
  roundNo: number;
  status: string;
}

export default async function AdminPage() {
  const rounds = await apiGet<AdminRoundDto[]>('/admin/rounds', {
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    headers: {
      Authorization: `Bearer dev-admin`,
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <header className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <h1 className="text-3xl font-bold text-white/90">Admin Console</h1>
        <p className="text-sm text-white/60">Manage rounds, fees, and allowlist.</p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-white/80">Rounds</h2>
        <table className="mt-4 w-full text-left text-sm text-white/70">
          <thead className="text-white/50">
            <tr>
              <th className="py-2">Round</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              <tr key={round.id} className="border-t border-white/10">
                <td className="py-2 font-mono text-white/80">#{round.roundNo}</td>
                <td>{round.status}</td>
                <td className="text-right text-xs uppercase text-white/40">Manual actions via API</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
