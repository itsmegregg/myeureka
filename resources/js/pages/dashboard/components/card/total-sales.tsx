import { ReusableCard } from "@/components/reusable-components/dashboard-card";

import { DollarSign } from "lucide-react";
import { CountAnimation } from "@/components/ui/count-animation";

interface TotalSalesData {
    total_sales: number;
    period: {
        month: string;
        formatted_month: string;
        branch: string;
        concept: string;
    };
}

interface TotalSalesProps {
    data: TotalSalesData | null;
    loading: boolean;
    error: string | null;
}

export default function TotalSales(props: TotalSalesProps) {
    const { data, loading, error } = props;

        return (
            <ReusableCard
            title="Total Sales"
            icon={<DollarSign className="w-4 h-4" />}
            loading={loading}
            error={error}
            className="w-full"
        >
            {data && (
                <div className="space-y-2 pt-2 px-6">
                    {/* <h1 className="text-2xl font-bold">
                        {formatCurrency(data.total_sales || 0)}
                    </h1> */}
                    <CountAnimation number={data.total_sales || 0} className="text-2xl font-bold" formatAsCurrency={true}/>
                    <h1 className="text-xs text-zinc-400">
                        Period: {data.period?.formatted_month}
                    </h1>
                </div>
            )}
        </ReusableCard>
    );
}
