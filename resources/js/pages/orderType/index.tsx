import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Head } from "@inertiajs/react";
import axios from "axios";
import { format } from "date-fns";
import { BarChart, PieChart, Search, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BarGraph from "./graphs/barGraph";
import PieGraph from "./graphs/pieGraph";

interface OrderTypeData {
    date?: string;
    transaction_type: string;
    transaction_count: number;
}

export default function OrderType() {
    const { selectedBranch } = useBranchStore();
    const { dateRange } = useDateRange();
    const [data, setData] = useState<OrderTypeData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [merge, setMerge] = useState(true);
    const [isBarGraphOpen, setIsBarGraphOpen] = useState(false);
    const [isPieGraphOpen, setIsPieGraphOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleBarGraphClick = () => {
        if (merge) {
            setIsAlertOpen(true);
        } else if (data.length > 0) {
            setIsBarGraphOpen(true);
        }
    };

    const handlePieGraphClick = () => {
        if (merge) {
            setIsAlertOpen(true);
        } else if (data.length > 0) {
            setIsPieGraphOpen(true);
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const headers = merge ? ['Transaction Type', 'Count'] : ['Date', 'Transaction Type', 'Count'];
        const tableData = data.map((item) => 
            merge 
            ? [item.transaction_type, item.transaction_count]
            : [item.date ?? '', item.transaction_type, item.transaction_count]
        );

        autoTable(doc, {
            head: [headers],
            body: tableData,
            didDrawPage: function (data) {
                // Header
                doc.setFontSize(20);
                doc.setTextColor(40);
                doc.text("Order Type Report", data.settings.margin.left, 22);

                // Branch and Date
                doc.setFontSize(10);
                const branchText = `Branch: ${selectedBranch?.branch_name ?? 'ALL'}`;
                const dateText = `Date Range: ${dateRange.from ? format(dateRange.from, 'MM/dd/yyyy') : ''} - ${dateRange.to ? format(dateRange.to, 'MM/dd/yyyy') : ''}`;
                doc.text(branchText, data.settings.margin.left, 30);
                doc.text(dateText, data.settings.margin.left, 35);
            },
            margin: { top: 40 },
        });

        doc.save(`Order Type Report ${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const exportToExcel = () => {
        const excelData = data.map((item) => {
            if (merge) {
                return {
                    'Transaction Type': item.transaction_type,
                    'Count': item.transaction_count,
                };
            } else {
                return {
                    'Date': item.date,
                    'Transaction Type': item.transaction_type,
                    'Count': item.transaction_count,
                };
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Order Type Report');
        XLSX.writeFile(workbook, `Order Type Report ${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const handleSearch = async () => {
        if (!dateRange.from || !dateRange.to) {
            return;
        }
        setIsLoading(true);
        try {
            const response = await axios.get("/api/orderTypeDate", {
                params: {
                    branch_name: selectedBranch?.branch_name ?? "ALL",
                    from_date: format(dateRange.from, "yyyy-MM-dd"),
                    to_date: format(dateRange.to, "yyyy-MM-dd"),
                    merge: merge,
                },
            });
            setData(response.data.data);
        } catch (error) {
            console.error("Failed to fetch order types:", error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <AppLayout>
            <Head title="Order Type" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Order Type" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <BranchSelect />
                                        <DateRangePickernew />
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="merge"
                                                checked={merge}
                                                onCheckedChange={(checked) =>
                                                    setMerge(Boolean(checked))
                                                }
                                            />
                                            <Label htmlFor="merge">Merge Dates</Label>
                                        </div>
                                        <Button onClick={handleSearch} disabled={isLoading}>
                                            <Search className="mr-2 h-4 w-4" />
                                            {isLoading ? "Searching..." : "Search"}
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            onClick={exportToExcel} 
                                            variant="ghost"
                                            disabled={isLoading || data.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypeXls className="mr-2 h-4 w-4" />
                                            )}
                                            {isLoading ? "Generating..." : "Excel"}
                                        </Button>
                                        <Button
                                            onClick={exportToPDF}
                                            variant="ghost"
                                            disabled={isLoading || data.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypePdf className="mr-2 h-4 w-4" />
                                            )}
                                            {isLoading ? "Generating..." : "PDF"}
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Merge Required</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Please check the "Merge Dates" option to view graph visualizations.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogAction>OK</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        
                                    </div>
                                </div>

                                <div className="flex  gap-4">
                                <Dialog open={isBarGraphOpen} onOpenChange={setIsBarGraphOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleBarGraphClick}
                                                    className={!merge || data.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                                                >
                                                    <BarChart className="mr-2 h-4 w-4" />
                                                    Bar Graph
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Order Type Visualization</DialogTitle>
                                                </DialogHeader>
                                                <BarGraph data={data} />
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog open={isPieGraphOpen} onOpenChange={setIsPieGraphOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    onClick={handlePieGraphClick}
                                                    className={!merge || data.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                                                >
                                                    <PieChart className="mr-2 h-4 w-4" />
                                                    Pie Graph
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Order Type Distribution</DialogTitle>
                                                </DialogHeader>
                                                <PieGraph data={data} />
                                            </DialogContent>
                                        </Dialog>
                                </div>
                                <div className="rounded-md overflow-hidden border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {!merge && <TableHead>Date</TableHead>}
                                                <TableHead>Transaction Type</TableHead>
                                                <TableHead className="text-right">Count</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={merge ? 2 : 3}>
                                                        <Skeleton className="h-8 w-full" />
                                                    </TableCell>
                                                </TableRow>
                                            ) : data.length > 0 ? (
                                                data.map((item, index) => (
                                                    <TableRow key={index}>
                                                        {!merge && <TableCell>{item.date}</TableCell>}
                                                        <TableCell>{item.transaction_type || 'N/A'}</TableCell>
                                                        <TableCell className="text-right">
                                                            {item.transaction_count}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={merge ? 2 : 3}
                                                        className="text-center"
                                                    >
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
