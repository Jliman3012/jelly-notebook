import { apiGet } from '../lib/api';
import { formatMultiplier } from '../lib/utils';

interface LeaderboardEntry {
  wallet: string;
  multiplier: number;
  payout: number;
}

export async function Leaderboard() {
  const entries = await apiGet<LeaderboardEntry[]>('/rounds/leaderboard');
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
      <h3 className="text-lg font-semibold text-white/90">Recent High-Rollers</h3>
      <ul className="mt-4 space-y-3 text-sm text-white/70">
        {entries.map((entry) => (
          <li key={`${entry.wallet}-${entry.payout}`} className="flex items-center justify-between">
            <span className="font-mono text-white/60">
              {entry.wallet.slice(0, 4)}...{entry.wallet.slice(-4)}
            </span>
            <span className="text-white/80">{formatMultiplier(entry.multiplier)}</span>
            <span className="font-semibold text-primary-foreground">{entry.payout.toFixed(2)} USDC</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
