import { ReusableCard } from "@/components/reusable-components/dashboard-card";
import { CountAnimation } from "@/components/ui/count-animation";
import { formatCurrency, formatNumber } from "@/lib/formats";
import { TrendingUp } from "lucide-react";

interface AverageSalesPerDayData {
    average_sales: number;
    total_sales: number;
    total_days: number;
}

interface AverageSalesPerDayProps {
    data: AverageSalesPerDayData | null;
    loading: boolean;
    error: string | null;
}

export default function AverageSalesPerDay({ data, loading, error }: AverageSalesPerDayProps) {
    return (
        <ReusableCard
            title="Average Sales Per Day"
            icon={<TrendingUp className="w-4 h-4" />}
            loading={loading}
            error={error}
            className="w-full"
        >
            {data && (
                <div className="space-y-2 pt-2 px-6">
                    {/* <h1 className="text-2xl font-bold">
                        {formatCurrency(data.average_sales || 0)}
                    </h1> */}
                    <CountAnimation number={data.average_sales || 0} className="text-2xl font-bold" formatAsCurrency={true}/>
                    <h1 className="text-xs text-zinc-400">
                        Total Sales: {formatCurrency(data.total_sales || 0)} / Total Days: {formatNumber(data.total_days)}
                    </h1>
                </div>
            )}
        </ReusableCard>
    );
}
