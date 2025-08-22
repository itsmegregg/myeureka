import { ReusableCard } from "@/components/reusable-components/dashboard-card";
import { CountAnimation } from "@/components/ui/count-animation";
import { formatCurrency, formatNumber } from "@/lib/formats";
import { UsersIcon } from "lucide-react";

interface SalesPerCustomerData {
    average_sales_per_customer: number;
    total_sales: number;
    total_guests: number;
}

interface AverageSalesPerCustomerProps {
    data: SalesPerCustomerData | null;
    loading: boolean;
    error: string | null;
}

export default function AverageSalesPerCustomer({ data, loading, error }: AverageSalesPerCustomerProps) {
    
    return (
      <ReusableCard 
        title="Average Sales Per Customer"
        icon={<UsersIcon className="h-4 w-4" />}
        loading={loading}
        error={error}
      >
        {data && (
          <div className="space-y-2 pt-2 px-6">
            <CountAnimation 
              number={data.average_sales_per_customer || 0} 
              className="text-2xl font-bold" 
              formatAsCurrency={true} 
            />
            <h1 className="text-xs text-muted-foreground">
             {formatCurrency(data.total_sales || 0)} / Total Guests: {formatNumber(data.total_guests)}
            </h1>
          </div>
        )}
      </ReusableCard>
    );
}