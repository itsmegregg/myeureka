import BranchSelect from "@/components/public-components/branch-select";
import PickerMonth from "@/components/public-components/month-picker";
import TextHeader from "@/components/reusable-components/text-header";
import AppLayout from "@/layouts/app-layout";
import AverageSalesPerCustomer from "./components/card/average-sales-per-customer";
import AverageSalesPerDay from "./components/card/average-sales-per-day";
import AverageTxPerDay from "./components/card/average-tx-per-day";
import TotalSales from "./components/card/total-sales";
import { Head } from "@inertiajs/react";
import PaymentTypeChart from "./components/chart/paymentTypeChart";
import { useBranchStore } from "@/store/useBranch";
import { useMonthPicker } from "@/store/useMonthPicker";
import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import TotalSalesPerDayChart from "./components/chart/totalSalesPerDayChart";


interface DashboardData {
    average_sales_per_customer: {
        average_sales_per_customer: number;
        total_sales: number;
        total_guests: number;
    } | null;
    average_sales_per_day: {
        average_sales: number;
        total_sales: number;
        total_days: number;
    } | null;
    average_tx_per_day: {
        average_transaction_per_day: number;
        total_transaction: number;
        total_days: number;
    } | null;
    total_sales: {
        total_sales: number;
        period: {
            month: string;
            formatted_month: string;
            branch: string;
            concept: string;
        };
    } | null;
    daily_sales: {
        total_sales: number;
        date_formatted: string;
    }[] | null;
    payment_types: {
        payment_type: string;
        amount: string;
    }[] | null;
}

export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const { selectedMonth } = useMonthPicker();
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();

    useEffect(() => {
        fetchDashboardData();
    
    }, [selectedMonth, selectedBranch, selectedStore]);


    useEffect(() => {
        handleUpdate();
    }, []);
    // Create a unique key based on the branch and month to force re-render
    const dashboardKey = `dashboard-${selectedBranch?.branch_name ?? 'ALL'}-${selectedMonth ? format(selectedMonth, 'yyyy-MM') : 'current'}`;

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const params = {
                month: selectedMonth ? format(selectedMonth, 'yyyy-MM') : null,
                branch_name: selectedBranch?.branch_name ?? "ALL",
                concept_name: selectedStore ?? "ALL",
            };
            
            console.log("Fetching dashboard data with params:", params);
            const response = await axios.get('/api/dashboard/summary', { params });
            setDashboardData(response.data.data);
            console.log("Dashboard data received:", response.data.data);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    // Special function to refresh data without showing loading state
    const refreshDashboardDataSilently = async () => {
        try {
            const params = {
                month: selectedMonth ? format(selectedMonth, 'yyyy-MM') : null,
                branch_name: selectedBranch?.branch_name ?? "ALL",
                concept_name: selectedStore ?? "ALL",
            };
            
            console.log("Silently refreshing dashboard data with params:", params);
            const response = await axios.get('/api/dashboard/summary', { params });
            setDashboardData(response.data.data);
            console.log("Dashboard data refreshed silently:", response.data.data);
        } catch (err) {
            console.error('Error silently refreshing dashboard data:', err);
            // Don't show errors to user or set error state for silent refresh
        }
    };

    const handleUpdate = async () => {
        try {
            setIsUpdating(true); // Show loading state for update only
            toast.loading('Running update commands...', { id: 'update-toast' });
            
            // Get yesterday's date in YYYY-MM-DD format
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const formattedDate = format(yesterday, 'yyyy-MM-dd');
            
            console.log('Calling API to run update commands with date:', formattedDate);
            
            // Call our API endpoint with date
            const response = await axios.post('/api/run-command', {
                date: formattedDate
            });
            
            console.log('API response:', response.data);
            
            // Show success message
            toast.success('Both commands ran successfully!', { id: 'update-toast' });
            
            // Refresh data silently without showing loading state
            await refreshDashboardDataSilently();
        } catch (err) {
            console.error('Error running update command:', err);
            toast.error('Failed to run update command.', { id: 'update-toast' });
        } finally {
            setIsUpdating(false); // Hide updating state
        }
    };

    return (
        <AppLayout>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center lg:flex-row lg:items-center">
                <TextHeader title="Dashboard" />
                <div className="flex flex-col md:flex-row gap-2 md:gap-2 lg:gap-2">
                    <BranchSelect/>
                    <PickerMonth/>
                </div>
            </div>

            <div className="flex flex-col gap-4 py-6" key={dashboardKey}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AverageSalesPerCustomer 
                        data={dashboardData?.average_sales_per_customer || null} 
                        loading={loading} 
                        error={error} 
                    />
                    <AverageSalesPerDay 
                        data={dashboardData?.average_sales_per_day || null} 
                        loading={loading} 
                        error={error} 
                    />
                    <AverageTxPerDay 
                        data={dashboardData?.average_tx_per_day || null} 
                        loading={loading} 
                        error={error} 
                    />
                    <TotalSales 
                        data={dashboardData?.total_sales || null} 
                        loading={loading} 
                        error={error} 
                    />
                </div>
                <div className="flex lg:flex-row md:flex-col sm:w-full md:gap-4 lg:gap-4">
                    <div className="sm:w-full lg:w-2/3 h-[600px]">
                        <TotalSalesPerDayChart 
                            data={dashboardData?.daily_sales || null}
                            loading={loading}
                            error={error}
                        />
                    </div>
                    <div className="sm:w-full lg:w-1/3 h-[600px]">
                        <PaymentTypeChart
                            data={dashboardData?.payment_types || null}
                            loading={loading}
                            error={error}
                        />
                    </div>
                </div>
            </div>

       
        </AppLayout>
    );
}