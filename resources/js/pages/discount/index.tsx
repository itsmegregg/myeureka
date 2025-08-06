import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import AppLayout from "@/layouts/app-layout";
import { useBranchStore } from "@/store/useBranch";
import { useDateRange } from "@/store/useDateRange";
import { useStore } from "@/store/useStore";
import { Head } from "@inertiajs/react";
import axios from "axios";
import { format } from 'date-fns';
import { Search, FileSpreadsheet, FileText, BarChart as BarChartIcon, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/formats";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import BarChartComponent from "./graphs/barChart";
import PieChartComponent from "./graphs/pieChart";
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import { useTerminalStore } from "@/store/useTerminal";
import TerminalSelect from "@/components/public-components/terminal-select";

interface DiscountProps {
    transaction_date: string;
    discount_code: string;
    total_discount: number;
    [key: string]: string | number; // Add index signature to match DiscountData interface
}

// Grand total is no longer provided by the API, we'll calculate it ourselves
interface GrandTotalProps {
    total: number;
}

interface Store {
    id: string;
    name: string;
}

export default function DiscountIndex() {
    const [isLoading, setIsLoading] = useState(false);
    const [rawDiscountData, setRawDiscountData] = useState<DiscountProps[]>([]);
    const [processedDiscountData, setProcessedDiscountData] = useState<DiscountProps[]>([]);
    const [grandTotal, setGrandTotal] = useState<number>(0);
    const [viewByDate, setViewByDate] = useState<boolean>(false);

    const { selectedBranch } = useBranchStore();
    const { dateRange: selectedDateRange } = useDateRange();
    const { selectedStore } = useStore();
    const { selectedTerminal } = useTerminalStore();

    // Function to process data based on viewByDate setting
    const processData = (data: DiscountProps[], byDate: boolean) => {
      
        if (!byDate) {
            // Aggregate data by discount_code (sum across all dates)
            const aggregatedData = data.reduce((acc: Record<string, DiscountProps>, item) => {
                const { discount_code, total_discount } = item;
                
                if (!acc[discount_code]) {
                    acc[discount_code] = {
                        transaction_date: 'All Dates',
                        discount_code,
                        total_discount: 0
                    };
                }
                
                acc[discount_code].total_discount += Number(total_discount);
                return acc;
            }, {});
            
            return Object.values(aggregatedData);
        }
        return data;
    };

    const [isBarChartOpen, setIsBarChartOpen] = useState(false);
    const [isPieChartOpen, setIsPieChartOpen] = useState(false);

    // Effect to reprocess data when viewByDate changes
    useEffect(() => {
        if (rawDiscountData.length > 0) {
            const processed = processData(rawDiscountData, viewByDate);
            setProcessedDiscountData(processed);
            
            // Calculate grand total
            const total = processed.reduce((sum: number, item: DiscountProps) => sum + Number(item.total_discount), 0);
            setGrandTotal(total);
        }
    }, [rawDiscountData, viewByDate]);

    const getDiscountData = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get('/api/sales/discount-report', {
                params: {
                    branch_name: selectedBranch?.branch_name ?? 'ALL',
                    from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                    to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                    store_name: typeof selectedStore === 'object' && selectedStore !== null && 'id' in selectedStore ? (selectedStore as Store).id : selectedStore,
                    terminal_number: selectedTerminal ?? 'ALL',
                },
            });
            const data = response.data.data;
            setRawDiscountData(data);
            
            // Process data based on current viewByDate setting
            const processed = processData(data, viewByDate);
            setProcessedDiscountData(processed);
            
            // Calculate grand total
            const total = processed.reduce((sum: number, item: DiscountProps) => sum + Number(item.total_discount), 0);
            setGrandTotal(total);
        } catch (error) {
            console.error('Error fetching discount data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        
        // Add header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Discount Report', 14, 22);
        
        // Add date range
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const fromDate = selectedDateRange.from ? format(selectedDateRange.from, 'MMM d, yyyy') : 'Start Date';
        const toDate = selectedDateRange.to ? format(selectedDateRange.to, 'MMM d, yyyy') : 'End Date';
        doc.text(`Date Range: ${fromDate} - ${toDate}`, 14, 30);
        
        // Add branch info if selected
        if (selectedBranch) {
            doc.text(`Branch: ${selectedBranch.name}`, 14, 38);
        }
        
        let tableData;
        let headers;
        
        if (viewByDate) {
            tableData = processedDiscountData.map(item => [
                item.transaction_date,
                item.discount_code,
                formatNumber(item.total_discount)
            ]);
            
            // Add grand total row
            tableData.push(['', 'GRAND TOTAL', formatNumber(grandTotal)]);

            headers = [
                'Date',
                'Discount Type',
                'Total Amount'
            ];
        } else {
            tableData = processedDiscountData.map(item => [
                item.discount_code,
                formatNumber(item.total_discount)
            ]);
            
            // Add grand total row
            tableData.push(['GRAND TOTAL', formatNumber(grandTotal)]);

            headers = [
                'Discount Type',
                'Total Amount'
            ];
        }

        autoTable(doc, {
            startY: 45, // Start the table below the header
            head: [headers],
            body: tableData,
            margin: { top: 45 },
            didDrawPage: function (data) {
                // Add page numbers
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.text(
                    'Page ' + doc.getNumberOfPages(),
                    pageSize.width - 20,
                    pageHeight - 10
                );
            }
        });

        // Format the filename with date range
        const fromDateStr = selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : 'start-date';
        const toDateStr = selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : 'end-date';
        const fileName = `Discount-report-${fromDateStr}-to-${toDateStr}.pdf`;
        
        doc.save(fileName);
    };

    const exportToExcel = () => {
        // Prepare data for Excel with formatted amounts
        let excelData;
        
        if (viewByDate) {
            excelData = processedDiscountData.map(item => ({
                'Date': item.transaction_date,
                'Discount Type': item.discount_code,
                'Total Amount': item.total_discount
            }));
            
            // Add grand total row
            excelData.push({
                'Date': '',
                'Discount Type': 'GRAND TOTAL',
                'Total Amount': grandTotal
            });
        } else {
            excelData = processedDiscountData.map(item => ({
                'Discount Type': item.discount_code,
                'Total Amount': item.total_discount
            }));
            
            // Add grand total row
            excelData.push({
                'Discount Type': 'GRAND TOTAL',
                'Total Amount': grandTotal
            });
        }
        
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Discount Report');
        
        // Format the filename with date range
        const fromDateStr = selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : 'start-date';
        const toDateStr = selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : 'end-date';
        const fileName = `Discount-report-${fromDateStr}-to-${toDateStr}.xlsx`;
        
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <AppLayout>
            <Head title="Discount" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Discount" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4 items-center">
                                    <div className="flex flex-wrap items-center gap-2 ">
                                        <BranchSelect />
                                        <DateRangePickernew />
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="view-by-date" 
                                                checked={viewByDate} 
                                                onCheckedChange={(checked) => setViewByDate(!!checked)} 
                                            />
                                            <Label htmlFor="view-by-date">View data by date</Label>
                                        </div>
                                        <TerminalSelect/>
                                        <Button onClick={getDiscountData} disabled={isLoading}>
                                            {isLoading ? 'Loading...' : (
                                                <>
                                                    <Search className="h-4 w-4 mr-2" />
                                                    Search
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       
                                        <Button 
                                            onClick={exportToExcel}
                                            variant="ghost"
                                            disabled={processedDiscountData.length === 0 || isLoading}
                                            className="flex items-center gap-2"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypeXls className="h-4 w-4" />
                                            )}
                                            {isLoading ? "Generating..." : "Excel"}
                                        </Button>
                                        <Button 
                                            onClick={exportToPDF}
                                            variant="ghost"
                                            disabled={processedDiscountData.length === 0 || isLoading}
                                            className="flex items-center gap-2"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypePdf className="h-4 w-4" />
                                            )}
                                            {isLoading ? "Generating..." : "PDF"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                <h1>Export Graphs</h1>
                                <div className="flex gap-2">
                                <Button 
                                            variant="outline" 
                                            className="gap-2"
                                            disabled={processedDiscountData.length === 0 || isLoading}
                                            onClick={() => setIsBarChartOpen(true)}
                                        >
                                            <BarChartIcon className="h-4 w-4" />
                                            Bar Chart
                                        </Button>
                                        <Dialog open={isBarChartOpen} onOpenChange={setIsBarChartOpen}>
                                            <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Discount Distribution - Bar Chart</DialogTitle>
                                                </DialogHeader>
                                                <div className="w-full h-[500px]">
                                                    <BarChartComponent data={processedDiscountData} viewByDate={viewByDate} />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        <Button 
                                            variant="outline" 
                                            className="gap-2"
                                            disabled={processedDiscountData.length === 0 || isLoading}
                                            onClick={() => setIsPieChartOpen(true)}
                                        >
                                            <PieChartIcon className="h-4 w-4" />
                                            Pie Chart
                                        </Button>
                                        <Dialog open={isPieChartOpen} onOpenChange={setIsPieChartOpen}>
                                            <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Discount Distribution - Pie Chart</DialogTitle>
                                                </DialogHeader>
                                                <div className="w-full h-[500px]">
                                                    <PieChartComponent data={processedDiscountData} viewByDate={viewByDate} />
                                                </div>
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
                                        <>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {viewByDate && <TableHead>Date</TableHead>}
                                                        <TableHead>Discount Type</TableHead>
                                                        <TableHead className="text-right">Total Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {processedDiscountData.length > 0 ? (
                                                        processedDiscountData.map((item, index) => (
                                                            <TableRow key={index}>
                                                                {viewByDate && <TableCell>{item.transaction_date}</TableCell>}
                                                                <TableCell>{item.discount_code}</TableCell>
                                                                <TableCell className="text-right">{formatNumber(item.total_discount)}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={viewByDate ? 3 : 2} className="text-center">
                                                                No data available
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    {processedDiscountData.length > 0 && (
                                                        <TableRow className="font-bold">
                                                            {viewByDate && <TableCell></TableCell>}
                                                            <TableCell>GRAND TOTAL</TableCell>
                                                            <TableCell className="text-right">{formatNumber(grandTotal)}</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>

                                        </>
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