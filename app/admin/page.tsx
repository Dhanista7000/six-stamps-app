import { getLiabilityReport } from "@/lib/actions";

export default async function AdminPage() {
  const report = await getLiabilityReport();
  
  const totalLiability = report.reduce((sum, row) => sum + Number(row.projected_exposure_rm), 0);
  const totalCards = report.reduce((sum, row) => sum + Number(row.outstanding_cards), 0);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-orange-500">Finance & Liability Report</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <h3 className="text-gray-400 text-sm mb-1">Total Projected Exposure</h3>
            <div className="text-4xl font-bold text-white">RM {totalLiability.toFixed(2)}</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <h3 className="text-gray-400 text-sm mb-1">Total Outstanding Cards</h3>
            <div className="text-4xl font-bold text-white">{totalCards}</div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 font-semibold text-gray-300">Stamps Collected</th>
                <th className="p-4 font-semibold text-gray-300">Outstanding Cards</th>
                <th className="p-4 font-semibold text-gray-300">Projected Exposure (RM)</th>
              </tr>
            </thead>
            <tbody>
              {report.map((row) => (
                <tr key={row.stamps_count} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-medium">{row.stamps_count} / 6</td>
                  <td className="p-4 text-gray-300">{row.outstanding_cards}</td>
                  <td className="p-4 text-gray-300 font-mono">RM {Number(row.projected_exposure_rm).toFixed(2)}</td>
                </tr>
              ))}
              {report.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    No outstanding cards found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
