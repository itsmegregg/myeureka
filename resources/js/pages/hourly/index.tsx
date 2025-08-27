import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import AppLayout from "@/layouts/app-layout";
import { useBranchStore } from "@/store/useBranch";
import { useDateRange } from "@/store/useDateRange";
import { useProduct } from "@/store/useProduct";
import { useStore } from "@/store/useStore";
import { Head } from "@inertiajs/react";
import axios from "axios";
import { format } from "date-fns";
import { BarChart, FileSpreadsheet, FileText, PieChart, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BarGraph from "./graphs/barGraph";
import PieGraph from "./graphs/pieGraph";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import TerminalSelect from "@/components/public-components/terminal-select";
import { useTerminalStore } from "@/store/useTerminal";
import { formatCurrency, formatNumber } from "@/lib/formats";

interface HourlyProps {
    hour: number;
    hour_range: string;
    no_trans: number;
    no_void: string; // Still string based on example '0', '1', '2'
    sales_value: number;
    discount_amount: number;
}

export default function HourlyIndex() {
    const [hourlyData, setHourlyData] = useState<HourlyProps[]>([]);
    const [isBarGraphOpen, setIsBarGraphOpen] = useState(false);
    const [isPieGraphOpen, setIsPieGraphOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { selectedBranch } = useBranchStore();
    const { dateRange: selectedDateRange } = useDateRange();
    const { selectedProduct } = useProduct();
    const { selectedStore } = useStore();
    const { selectedTerminal } = useTerminalStore();

    const fetchAllData = async () => {  
        // Prepare parameters for API call
        const paramsData: any = {
            branch_name: selectedBranch?.branch_name ?? 'ALL',
            from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
            to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
            store_name: selectedStore ?? 'ALL',
            terminal_number: selectedTerminal ?? 'ALL',
        };
        // console.log("Api", selectedBranch?.branch_name, selectedStore, selectedDateRange.from, selectedDateRange.to); // Remove after debugging
        if (selectedProduct) {
            paramsData.product_code = selectedProduct;
        }
        
        // Fetch all data for export
        try {
            setLoading(true);
            const response = await axios.get('/api/sales/hourly-report', {
                params: paramsData,
            });
            if (response.data.status === 'success') {
                setHourlyData(response.data.data);
            } else {
                setError('Failed to fetch data');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const data = hourlyData.map((item) => ({
            hour_range: item.hour_range,
            no_trans: formatNumber(item.no_trans),
            no_void: formatNumber(item.no_void),
            sales_value: `P ${Number(item.sales_value).toFixed(2)}`,
            discount: `P ${Number(item.discount_amount).toFixed(2)}`,
        }));
    
        const headers = ['Hour Range', 'No. of Transactions', 'No. of Void', 'Sales Value', 'Discount'];
        const tableData = data.map((item) => [
            item.hour_range,
            item.no_trans,
            item.no_void,
            item.sales_value,
            item.discount,
        ]);
    
        autoTable(doc, {
            head: [headers],
            body: tableData,
        });
    
        doc.save(`Hourly Report ${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };
    const exportToExcel = () => {
        const data = hourlyData.map((item) => ({
            hour_range: item.hour_range,
            no_trans: formatNumber(item.no_trans),
            no_void: formatNumber(item.no_void),
            sales_value: formatCurrency(Number(item.sales_value)),
            discount: formatCurrency(Number(item.discount_amount)),
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hourly Report');
        XLSX.writeFile(workbook, `Hourly Report ${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <AppLayout>
            <Head title="Hourly" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Hourly" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        <DateRangePickernew />
                                       
                                        <Button
                                            onClick={fetchAllData}
                                            disabled={loading}
                                        >
                                            <Search className="h-4 w-4" />
                                            Search
                                        </Button>
                                    </div>
                                
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={exportToExcel} 
                                            variant="ghost"
                                            disabled={loading || hourlyData.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {loading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypeXls className="mr-2 h-4 w-4" />
                                            )}
                                            {loading ? "Generating..." : "Excel"}
                                        </Button>
                                        <Button
                                            onClick={exportToPDF}
                                            variant="ghost"
                                            disabled={loading || hourlyData.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {loading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypePdf className="mr-2 h-4 w-4" />
                                            )}
                                            {loading ? "Generating..." : "PDF"}
                                        </Button>
                                    </div>


                                </div>

                                <div className="flex gap-4">
                                    <Dialog open={isBarGraphOpen} onOpenChange={setIsBarGraphOpen}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                variant="outline"
                                                className={hourlyData.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                                                onClick={() => hourlyData.length > 0 && setIsBarGraphOpen(true)}
                                            >
                                                <BarChart className="mr-2 h-4 w-4" />
                                                Bar Graph
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[900px] lg:max-w-[1000px] max-h-[600px] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Hourly Sales Analysis</DialogTitle>
                                            </DialogHeader>
                                            <BarGraph data={hourlyData.map(item => ({
                                                hour: item.hour_range,
                                                sales: item.sales_value,
                                                voids: parseFloat(item.no_void),
                                                transactions: item.no_trans,
                                                discounts: item.discount_amount
                                            }))} />
                                        </DialogContent>
                                    </Dialog>
                                    
                                    <Dialog open={isPieGraphOpen} onOpenChange={setIsPieGraphOpen}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                variant="outline"
                                                className={hourlyData.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                                                onClick={() => hourlyData.length > 0 && setIsPieGraphOpen(true)}
                                            >
                                                <PieChart className="mr-2 h-4 w-4" />
                                                Pie Chart
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Sales Distribution by Hour</DialogTitle>
                                            </DialogHeader>
                                            <PieGraph data={hourlyData.map(item => ({
                                                hour: item.hour_range,
                                                sales: item.sales_value
                                            }))} />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Hour Range</TableHead>
                                                <TableHead>No. of Transactions</TableHead>
                                                <TableHead>No. of Void</TableHead>
                                                <TableHead>Sales Value</TableHead>
                                                <TableHead>Discount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {hourlyData.length > 0 ? (
                                                <>
                                                    {hourlyData.map((data, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{data.hour_range}</TableCell>
                                                            <TableCell>{formatNumber(data.no_trans)}</TableCell>
                                                            <TableCell>{formatNumber(data.no_void)}</TableCell>
                                                            <TableCell>{formatCurrency(Number(data.sales_value))}</TableCell>
                                                            <TableCell>{formatCurrency(Number(data.discount_amount))}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="font-bold">
                                                        <TableCell>Total</TableCell>
                                                        <TableCell>{formatNumber(hourlyData.reduce((acc, curr) => acc + Number(curr.no_trans), 0))}</TableCell>
                                                        <TableCell>{formatNumber(hourlyData.reduce((acc, curr) => acc + Number(curr.no_void), 0))}</TableCell>
                                                        <TableCell>{formatCurrency(hourlyData.reduce((acc, curr) => acc + Number(curr.sales_value), 0))}</TableCell>
                                                        <TableCell>{formatCurrency(hourlyData.reduce((acc, curr) => acc + Number(curr.discount_amount), 0))}</TableCell>
                                                    </TableRow>
                                                </>
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">
                                                        No data available.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}