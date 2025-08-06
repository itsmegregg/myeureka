import { ReusableCard } from "@/components/reusable-components/dashboard-card";

import { ShoppingCartIcon } from "lucide-react";
import { CountAnimation } from "@/components/ui/count-animation";

interface AverageTxPerDayData {
    average_transaction_per_day: number;
    total_transaction: number;
    total_days: number;
}

interface AverageTxPerDayProps {
    data: AverageTxPerDayData | null;
    loading: boolean;
    error: string | null;
}

export default function AverageTxPerDay({ data, loading, error }: AverageTxPerDayProps) {
    return (
        <ReusableCard
            title="Average Transactions Per Day"
            icon={<ShoppingCartIcon className="w-4 h-4" />}
            loading={loading}
            error={error}
            className="w-full"
        >
            {data && (
                <div className="space-y-2 pt-2 px-6">
                    {/* <h1 className="text-2xl font-bold">
                        {formatNumber(data.average_transaction_per_day || 0)}
                    </h1> */}

                    <CountAnimation number={data.average_transaction_per_day || 0} className="text-2xl font-bold" formatAsCurrency={false}/>
                    <div className="text-sm text-muted-foreground">
                        {data.total_transaction.toLocaleString()} transactions over {data.total_days} days
                    </div>
                </div>
            )}
        </ReusableCard>
    );
}
