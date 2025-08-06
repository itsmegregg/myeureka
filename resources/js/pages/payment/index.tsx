import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import { BarChart, FileSpreadsheet, FileText, Loader2, PieChart, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useBranchStore } from "@/store/useBranch";
import { useDateRange } from "@/store/useDateRange";
import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/formats";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import { useTerminalStore } from "@/store/useTerminal";
import TerminalSelect from "@/components/public-components/terminal-select";

// TypeScript declaration is handled by the import
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import BarGraph from "./graphs/barGraph";
import PieGraph from "./graphs/pieGraph";
import { MergedPaymentData } from './graphs/types';
import { ScrollArea } from "@radix-ui/react-scroll-area";

interface PaymentData {
    payment_type: string;
    date: string;
    'Total Amount': number;
}

// New interface for grand totals
interface GrandTotalPaymentData {
    payment_type: string;
    total_amount: number;
}

export default function PaymentIndex() {
    const { selectedBranch } = useBranchStore();
    const { dateRange: selectedDateRange } = useDateRange();
    const { selectedStore } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isBarGraphOpen, setIsBarGraphOpen] = useState(false);
    const [isPieGraphOpen, setIsPieGraphOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    
    const handleBarGraphClick = () => {
        if (!isMerged) {
            setIsAlertOpen(true);
        } else if (mergedData.length > 0) {
            setIsBarGraphOpen(true);
        }
    };
    
    const handlePieGraphClick = () => {
        if (!isMerged) {
            setIsAlertOpen(true);
        } else if (mergedData.length > 0) {
            setIsPieGraphOpen(true);
        }
    };
    const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
    const [mergedData, setMergedData] = useState<MergedPaymentData[]>([]);
    const [grandTotalPaymentData, setGrandTotalPaymentData] = useState<GrandTotalPaymentData[]>([]); // New state
    const [isMerged, setIsMerged] = useState(false);
    const { selectedTerminal } = useTerminalStore();

    const fetchPaymentData = async () => {
        try {
            setIsLoading(true);
            setPaymentData([]); // Clear previous data
            setMergedData([]); // Clear previous merged data
            setGrandTotalPaymentData([]); // Clear previous grand total data

            const response = await axios.get('/api/sales/payment-details', {
                params: {
                    branch_name: selectedBranch?.branch_name ?? 'ALL',
                    from_date: selectedDateRange.from,
                    to_date: selectedDateRange.to,
                    store_name: selectedStore ?? 'ALL',
                    terminal_number: selectedTerminal ?? 'ALL',
                },
            });

            console.log("Api", selectedBranch?.branch_name, selectedStore, selectedDateRange.from, selectedDateRange.to);
            setPaymentData(response.data.data);
            if (isMerged) {
                mergeData();
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching payment data:', error);
            setIsLoading(false);
        }
    };

    const mergeData = () => {
        const merged: { [key: string]: MergedPaymentData } = {};
        const grandTotals: { [key: string]: number } = {};

        paymentData.forEach(item => {
            const dateKey = item.date;
            if (!merged[dateKey]) {
                merged[dateKey] = {
                    date: item.date,
                    concept: 'N/A',
                    branch: 'N/A',
                    cash: 0,
                    gcash: 0,
                    card: 0,
                    other: 0,
                    total: 0,
                };
            }

            // Aggregate for daily merged data (used for graphs and daily view)
            switch (item.payment_type) {
                case 'Cash':
                    merged[dateKey].cash += item['Total Amount'];
                    break;
                case 'GCash':
                    merged[dateKey].gcash += item['Total Amount'];
                    break;
                case 'Card':
                case 'Visa':
                case 'Mastercard':
                    merged[dateKey].card += item['Total Amount'];
                    break;
                default:
                    merged[dateKey].other += item['Total Amount'];
                    break;
            }
            merged[dateKey].total += item['Total Amount'];

            // Aggregate for grand totals by payment type (used for merged table view)
            if (grandTotals[item.payment_type]) {
                grandTotals[item.payment_type] += item['Total Amount'];
            } else {
                grandTotals[item.payment_type] = item['Total Amount'];
            }
        });

        setMergedData(Object.values(merged));
        
        // Convert grandTotals object to array of GrandTotalPaymentData
        const grandTotalArray: GrandTotalPaymentData[] = Object.entries(grandTotals).map(([type, amount]) => ({
            payment_type: type,
            total_amount: amount,
        }));
        setGrandTotalPaymentData(grandTotalArray);
    };

    useEffect(() => {
        if (isMerged && paymentData.length > 0) {
            mergeData();
        }
    }, [isMerged, paymentData]);

    const exportToPDF = () => {
        try {
            // Create a new PDF document in landscape orientation for better readability
            const doc = new jsPDF('landscape');
            
            // Add title
            doc.setFontSize(16);
            doc.text('Payment Details Report', 14, 20);
            
            // Add metadata
            doc.setFontSize(10);
            let yPos = 30;
            
            // Date range info
            if (selectedDateRange.from && selectedDateRange.to) {
                doc.text(`Date Range: ${format(selectedDateRange.from, 'MMM dd, yyyy')} to ${format(selectedDateRange.to, 'MMM dd, yyyy')}`, 14, yPos);
                yPos += 6;
            }
            
            // Branch filter info
            doc.text(`Branch: ${selectedBranch?.branch_name || 'All Branches'}`, 14, yPos);
            yPos += 6;
            
            // Store filter info
            doc.text(`Store: ${selectedStore || 'All Stores'}`, 14, yPos);
            yPos += 6;
            
            // Terminal filter info
            doc.text(`Terminal: ${selectedTerminal || 'All Terminals'}`, 14, yPos);
            yPos += 6;
            
            // Report type info
            doc.text(`Report Type: ${isMerged ? 'Merged' : 'Detailed'}`, 14, yPos);
            yPos += 10;
            
            // Define table columns based on merge status
            const tableColumn = isMerged
                ? ["Payment Type", "Grand Total"]
                : ["Date", "Payment Type", "Total Amount"];
            
            // Prepare table rows
            const tableRows: any = [];
            
            if (isMerged) {
                grandTotalPaymentData.forEach(item => {
                    const rowData = [
                        item.payment_type,
                        formatNumber(item.total_amount),
                    ];
                    tableRows.push(rowData);
                });
            } else {
                paymentData.forEach(item => {
                    const rowData = [
                        item.date,
                        item.payment_type,
                        formatNumber(item['Total Amount']),
                    ];
                    tableRows.push(rowData);
                });
            }
            
            // Generate the table using autoTable with black header style
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: yPos,
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [66, 66, 66], textColor: [255, 255, 255] },
                theme: 'grid',
                margin: { top: 10, left: 10, right: 10, bottom: 10 },
            });
            
            // Add pagination info at the bottom
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(
                    `Page ${i} of ${pageCount} | Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }
            
            // Generate file name with date range and filters
            const branchInfo = selectedBranch?.branch_name ? `_${selectedBranch.branch_name}` : '';
            const storeInfo = selectedStore ? `_${selectedStore}` : '';
            const terminalInfo = selectedTerminal ? `_Terminal${selectedTerminal}` : '';
            const reportType = isMerged ? '_Merged' : '_Detailed';
            const fileName = `Payment_Report${branchInfo}${storeInfo}${terminalInfo}${reportType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
            
            // Save the PDF
            doc.save(fileName);
        } catch (error) {
            console.error("Error exporting to PDF:", error);
            alert("Failed to export to PDF. Please try again.");
        }
    };

    const exportToExcel = () => {
        let dataToExport: any[] = [];

        if (isMerged) {
            dataToExport = grandTotalPaymentData.map(item => ({
                'Payment Type': item.payment_type,
                'Grand Total': item.total_amount,
            }));
        } else {
            dataToExport = paymentData.map(item => ({
                Date: item.date,
                'Payment Type': item.payment_type,
                'Total Amount': item['Total Amount'],
            }));
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payment Details");
        XLSX.writeFile(wb, "payment_details_report.xlsx");
    };

    return (
        <AppLayout>
            <Head title="Payment" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Payment" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <BranchSelect />
                                        <DateRangePickernew />
                                        <Checkbox id="merge" checked={isMerged} onCheckedChange={(checked) => setIsMerged(checked as boolean)} />
                                        <Label htmlFor="merge">Merge</Label>
                                        <TerminalSelect/>
                                        <Button onClick={fetchPaymentData}>
                                            <Search className="mr-2 h-4 w-4" />
                                            Search
                                        </Button>
                                    </div>
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={exportToExcel} 
                                            variant="ghost"
                                            disabled={isLoading || paymentData.length === 0}
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
                                            disabled={isLoading || paymentData.length === 0}
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
                                </div>
                                <div className="flex flex-col">
                                   
                                   <div className="flex gap-2">
                                   <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Merge Required</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Please check the "Merge" option to view the bar graph visualization.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogAction>OK</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                   
                                   <Dialog open={isBarGraphOpen} onOpenChange={setIsBarGraphOpen}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                onClick={handleBarGraphClick}
                                                className={isMerged && grandTotalPaymentData.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                                            >
                                                <BarChart className="mr-2 h-4 w-4" />
                                                Bar Graph   
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Payment Data Visualization</DialogTitle>
                                            </DialogHeader>
                                            <BarGraph data={isMerged ? grandTotalPaymentData : mergedData} />
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog open={isPieGraphOpen} onOpenChange={setIsPieGraphOpen}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                onClick={handlePieGraphClick}
                                                className={isMerged && grandTotalPaymentData.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                                            >
                                                <PieChart className="mr-2 h-4 w-4" />
                                                Pie Graph
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Payment Distribution</DialogTitle>
                                            </DialogHeader>
                                            <PieGraph data={isMerged ? grandTotalPaymentData : mergedData} />
                                        </DialogContent>
                                    </Dialog>
                                   </div>
                                </div>
                                <div className="rounded-md border">
                                    {isLoading ? (
                                        <div className="p-4 text-center">
                                            <p>Loading...</p>
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-[calc(90vh-250px)] w-full">
                                        <Table>
                                            <TableHeader className="sticky-header">
                                                <TableRow>
                                                    {isMerged ? (
                                                        <>
                                                            <TableHead>Payment Type</TableHead>
                                                            <TableHead>Grand Total</TableHead>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Payment Type</TableHead>
                                                            <TableHead>Total Amount</TableHead>
                                                        </>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {isMerged ? (
                                                    grandTotalPaymentData.map((item, index) => (
                                                        <TableRow key={index}>
                                                           <TableCell>{item.payment_type}</TableCell>
                                                            <TableCell>{formatNumber(item.total_amount)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    paymentData.map((item, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{item.date}</TableCell>
                                                            <TableCell>{item.payment_type}</TableCell>
                                                            <TableCell>{formatNumber(item['Total Amount'])}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                        </ScrollArea>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}