import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useBranchStore } from "@/store/useBranch";
import { useStore } from "@/store/useStore";
import { useDateRange } from "@/store/useDateRange";
import axios from "axios";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import { Search, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import TerminalSelect from "@/components/public-components/terminal-select";
import { useTerminalStore } from "@/store/useTerminal";

// Define the type for grand totals
interface GrandTotals {
    total_gross_sales: number;
    total_net_sales_after_void: number;
    total_service_charge: number;
    total_void_amount: number;
    number_of_transactions: number;
    number_of_guests: number;
    PWD_Discount: number;
    Senior_Discount: number;
    National_Athletes_Discount: number;
    Solo_Parent_Discount: number;
    Valor_Discount: number;
    Other_Discounts: number;
}

// Define the type for daily sales data
interface DailySalesData {
    branch_name: string;
    store_name: string;
    terminal_no: string;
    date: string;
    si_from: number;
    si_to: number;
    old_grand_total: number;
    new_grand_total: number;
    number_of_transactions: number;
    number_of_guests: number;
    total_service_charge: number;
    total_gross_sales: number;
    total_net_sales_after_void: number;
    total_void_amount: number;
    PWD_Discount: number;
    Senior_Discount: number;
    National_Athletes_Discount: number;
    Solo_Parent_Discount: number;
    Valor_Discount: number;
    Other_Discounts: number;
    z_read_counter: number;
}

// Define the type for the API response
interface DailySalesApiResponse {
    status: string;
    data: DailySalesData[];
    grand_totals: GrandTotals;
    message?: string;
}

export default function DailySalesIndex() {
    // State for daily sales data
    const [dailySalesData, setDailySalesData] = useState<DailySalesData[]>([]);
    const [grandTotals, setGrandTotals] = useState<GrandTotals | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [exportLoading, setExportLoading] = useState<boolean>(false);

    // Get branch, store, and date range from Zustand stores
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { dateRange: selectedDateRange } = useDateRange();
    const { selectedTerminal } = useTerminalStore();

    // Format currency values
    const formatAmount = (amount: number): string => {
        return new Intl.NumberFormat('en-PH').format(amount);
    };

    // Load data when component mounts

    const fetchDailySalesData = async () => {
        try {
            setLoading(true);

            // Prepare request parameters
            const params = {
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                store_name: selectedStore ?? 'ALL',
                terminal_number: selectedTerminal ?? 'ALL'
            };
            
            console.log('Requesting with params:', params);
            
            const response = await axios.get<DailySalesApiResponse>('/api/daily-sales', { params });
            
            if (response.data.status === 'success') {
                setDailySalesData(response.data.data);
                setGrandTotals(response.data.grand_totals);
                console.log('Daily Sales data:', response.data.data);
                console.log('Grand Totals:', response.data.grand_totals);
            } else {
                console.error('Error fetching data:', response.data.message);
            }
        } catch (error) {
            console.error('Error fetching daily sales data:', error);
        } finally {
            setLoading(false);
        }
    };



    // Export to Excel function
    const handleExportExcel = async () => {
        try {
            setExportLoading(true);
            
            // Use existing data from the state
            let allData = [...dailySalesData];
            
            // If data is empty, try to fetch it
            if (allData.length === 0) {
                const params = {
                    branch_name: selectedBranch?.branch_name ?? 'ALL',
                    from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                    to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                    store_name: selectedStore ?? 'ALL',
                    terminal_number: selectedTerminal ?? 'ALL'
                };
                
                const response = await axios.get<DailySalesApiResponse>('/api/daily-sales', { params });
                
                if (response.data.status === 'success') {
                    allData = response.data.data;
                    setGrandTotals(response.data.grand_totals);
                } else {
                    throw new Error('Failed to fetch complete data for Excel export');
                }
            }
            
            // Prepare data for export
            const exportData = allData.map((item: DailySalesData) => ({
                'Branch': item.branch_name,
                'Store': item.store_name,
                'Terminal': item.terminal_no,
                'Date': item.date,
                'SI From': item.si_from,
                'SI To': item.si_to,
                'Z-Read Counter': item.z_read_counter,
                'Old Grand Total': item.old_grand_total,
                'New Grand Total': item.new_grand_total,
                'Gross Sales': item.total_gross_sales,
                'Net Sales': item.total_net_sales_after_void,
                '# of Transactions': item.number_of_transactions,
                '# of Guests': item.number_of_guests,
                'Service Charge': item.total_service_charge,
                'Void Amount': item.total_void_amount,
                'PWD Discount': item.PWD_Discount,
                'Senior Discount': item.Senior_Discount,
                'National Athletes Discount': item.National_Athletes_Discount,
                'Solo Parent Discount': item.Solo_Parent_Discount,
                'Valor Discount': item.Valor_Discount,
                'Other Discounts': item.Other_Discounts,
                
            }));
            
            // Create Excel workbook
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            
            // Add grand totals to the worksheet if available
            if (grandTotals) {
                const grandTotalRow = [
                    'Grand Totals:', '', '', '', '', '', '', '', '', // Empty cells to align with columns
                    formatAmount(Number(grandTotals.total_gross_sales)),
                    formatAmount(Number(grandTotals.total_net_sales_after_void)),
                    grandTotals.number_of_transactions,
                    grandTotals.number_of_guests,
                    grandTotals.total_service_charge,
                    grandTotals.total_void_amount,
                    grandTotals.PWD_Discount,
                    grandTotals.Senior_Discount,
                    grandTotals.National_Athletes_Discount,
                    grandTotals.Solo_Parent_Discount,
                    grandTotals.Valor_Discount,
                    grandTotals.Other_Discounts,
               
                ];
                XLSX.utils.sheet_add_aoa(worksheet, [grandTotalRow], { origin: -1 }); // Append at the end
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Sales Report');
            
            // Generate file name with date range and filters
            const fromDate = selectedDateRange?.from ? format(selectedDateRange.from, 'yyyyMMdd') : format(new Date(), 'yyyyMMdd');
            const toDate = selectedDateRange?.to ? format(selectedDateRange.to, 'yyyyMMdd') : fromDate;
            const branchInfo = selectedBranch?.branch_name ? `_${selectedBranch.branch_name}` : '';
            const storeInfo = selectedStore ? `_${selectedStore}` : '';
            const terminalInfo = selectedTerminal ? `_Terminal${selectedTerminal}` : '';
            const fileName = `Daily_Sales_Report${branchInfo}${storeInfo}${terminalInfo}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
                
            // Export file
            XLSX.writeFile(workbook, fileName);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
        } finally {
            setExportLoading(false);
        }
    };

    // Export to PDF function
    const handleExportPdf = async () => {
        try {
            setExportLoading(true);
            
            // Use existing data from the state
            let allData = [...dailySalesData];
            
            // If data is empty, try to fetch it
            if (allData.length === 0) {
                const params = {
                    branch_name: selectedBranch?.branch_name ?? 'ALL',
                    from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                    to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                    store_name: selectedStore ?? 'ALL',
                    terminal_number: selectedTerminal ?? 'ALL'
                };
                
                const response = await axios.get<DailySalesApiResponse>('/api/daily-sales', { params });
                
                if (response.data.status === 'success') {
                    allData = response.data.data;
                    setGrandTotals(response.data.grand_totals);
                } else {
                    throw new Error('Failed to fetch complete data for PDF export');
                }
            }
            
            // Define columns for table with individual discount columns
            const headers = [
                'Branch', 'Store', 'Terminal', 'Date', 'SI From', 'SI To', 'Z-Read Counter',
                'Old Grand Total', 'New Grand Total', 'Gross Sales', 'Net Sales', 'No. of Transactions',
                'Void Amount', 'Guests', 'PWD Discount', 'Senior Discount', 'National Athletes Discount',
                'Solo Parent Discount', 'Valor Discount', 'Other Discounts'
            ];
            
            // Determine page format based on column count and data length
            let pageFormat: string | [number, number] = 'a4';
            const pageOrientation = 'landscape';
            
            // Dynamically adjust paper size based on both columns and rows
            if (headers.length >= 20) { // We have many columns
                if (allData.length > 100) {
                    // Many columns and many rows - use a custom size (wider than a2)
                    pageFormat = [841.89, 1189.06]; // A0 dimensions in mm (very large)
                } else if (allData.length > 50) {
                    pageFormat = 'a1'; // Larger than a2
                } else {
                    pageFormat = 'a2'; // Larger than a3
                }
            } else if (headers.length >= 15) { // Medium number of columns
                if (allData.length > 100) {
                    pageFormat = 'a1';
                } else if (allData.length > 50) {
                    pageFormat = 'a2';
                } else {
                    pageFormat = 'a3';
                }
            } else { // Fewer columns
                if (allData.length > 100) {
                    pageFormat = 'a2';
                } else if (allData.length > 50) {
                    pageFormat = 'a3';
                } // else keep 'a4' as default
            }
            
            // Create a new PDF document with dynamic page size
            const doc = new jsPDF({
                orientation: pageOrientation as 'portrait' | 'landscape',
                unit: 'mm',
                format: pageFormat
            });
            
            // Add title
            doc.setFontSize(16);
            doc.text('Daily Sales Report', 14, 20);
            
            // Add metadata
            doc.setFontSize(10);
            let yPos = 30;
            
            // Date range info with better formatting
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
            yPos += 10;
            
            // Add data length info
            doc.text(`Total Records: ${allData.length}`, 14, yPos);
            yPos += 10;
            
            // Create detailed data for PDF table with proper formatting
            const tableData = allData.map((item: DailySalesData) => [
                item.branch_name,
                item.store_name,
                item.terminal_no,
                item.date,
                item.si_from,
                item.si_to,
                item.z_read_counter,
                formatAmount(Number(item.old_grand_total)),
                formatAmount(Number(item.new_grand_total)),
                formatAmount(item.total_gross_sales),
                formatAmount(item.total_net_sales_after_void),
                item.number_of_transactions,
                formatAmount(item.total_void_amount),
                item.number_of_guests,
                formatAmount(item.PWD_Discount),
                formatAmount(item.Senior_Discount),
                formatAmount(item.National_Athletes_Discount),
                formatAmount(item.Solo_Parent_Discount),
                formatAmount(item.Valor_Discount),
                formatAmount(item.Other_Discounts)
            ]);
            
            // Adjust font size based on data length and page size
            let fontSize = 8;
            if (allData.length > 50) {
                fontSize = 7; // Smaller font for more data
            } else if (allData.length <= 10) {
                fontSize = 9; // Larger font for less data
            }
            
            // Define column styles for optimized widths
            const columnStyles: {[key: string]: any} = {};
            
            // Assign appropriate widths to each column type
            headers.forEach((header, index) => {
                // Text columns (like Branch, Store) get more width
                if (['Branch', 'Store', 'Terminal'].includes(header)) {
                    columnStyles[index] = { cellWidth: 'auto', minCellWidth: 15 };
                }
                // Date columns
                else if (['Date'].includes(header)) {
                    columnStyles[index] = { cellWidth: 18 };
                }
                // Numeric columns with potentially large values
                else if (['Old Grand Total', 'New Grand Total', 'Gross Sales', 'Net Sales', 'Void Amount'].includes(header)) {
                    columnStyles[index] = { cellWidth: 20, halign: 'right' };
                }
                // Discount columns (usually smaller numbers)
                else if (header.includes('Discount')) {
                    columnStyles[index] = { cellWidth: 16, halign: 'right' };
                }
                // Default for other columns
                else {
                    columnStyles[index] = { cellWidth: 14, halign: 'center' };
                }
            });
            
            // Add the table with black header style and grid lines
            autoTable(doc, {
                head: [headers],
                body: tableData,
                startY: yPos,
                styles: { fontSize: fontSize, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [66, 66, 66], textColor: [255, 255, 255] },
                theme: 'grid',
                margin: { top: 10, left: 10, right: 10, bottom: 15 }, // Increased bottom margin for pagination
                tableWidth: 'auto',
                columnStyles: columnStyles,
                didDrawPage: (data) => {
                    // Add page number at the bottom of each page
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                    const totalPages = doc.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.text(
                        `Page ${data.pageNumber} of ${totalPages} | Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
                        data.settings.margin.left,
                        pageHeight - 5,
                        { align: 'left' }
                    );
                }
            });

            // Add grand totals to the PDF if available
            if (grandTotals) {
                const grandTotalHeaders = [
                    'Grand Totals:', '', '', '', '', '', '', '', '', // Empty cells for alignment
                    'Gross Sales', 'Net Sales', 'Transactions', 'Void Amount', 'Guests', 'PWD', 'Senior', 'National Athletes', 'Solo Parent', 'Valor', 'Other'
                ];
                const grandTotalValues = [
                    '', '', '', '', '', '', '', '', '', // Empty cells for alignment
                    formatAmount(grandTotals.total_gross_sales),
                    formatAmount(grandTotals.total_net_sales_after_void),
                    grandTotals.number_of_transactions,
                    formatAmount(grandTotals.total_void_amount),
                    grandTotals.number_of_guests,
                    formatAmount(grandTotals.PWD_Discount),
                    formatAmount(grandTotals.Senior_Discount),
                    formatAmount(grandTotals.National_Athletes_Discount),
                    formatAmount(grandTotals.Solo_Parent_Discount),
                    formatAmount(grandTotals.Valor_Discount),
                    formatAmount(grandTotals.Other_Discounts)
                ];

                autoTable(doc, {
                    head: [grandTotalHeaders],
                    body: [grandTotalValues],
                    startY: (doc as any).lastAutoTable.finalY + 10, // Position below the main table
                    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', fontStyle: 'bold' },
                    headStyles: { fillColor: [66, 66, 66], textColor: [255, 255, 255] },
                    theme: 'grid',
                    margin: { left: 10, right: 10 },
                    tableWidth: 'auto',
                });
            }
            
            // Generate file name with date range and filters
            const fromDate = selectedDateRange?.from ? format(selectedDateRange.from, 'yyyyMMdd') : format(new Date(), 'yyyyMMdd');
            const toDate = selectedDateRange?.to ? format(selectedDateRange.to, 'yyyyMMdd') : fromDate;
            const branchInfo = selectedBranch?.branch_name ? `_${selectedBranch.branch_name}` : '';
            const storeInfo = selectedStore ? `_${selectedStore}` : '';
            const terminalInfo = selectedTerminal ? `_Terminal${selectedTerminal}` : '';
            const fileName = `Daily_Sales_Report${branchInfo}${storeInfo}${terminalInfo}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
            
            // Save the PDF
            doc.save(fileName);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert("Failed to export to PDF. Please try again.");
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Daily Sales" />
            <div className="flex flex-col">
                           <div className="@container/main flex flex-1 flex-col gap-2">
                               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                                   <div className="px-4 lg:px-6">
                                       <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                           <TextHeader title="Daily Sales Report" />
                                           <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                               <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect/>
                                        <DateRangePickernew/>
                                        <TerminalSelect/>
                                        <Button onClick={fetchDailySalesData} disabled={loading}>
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="mr-2 h-4 w-4" />
                                                    Search
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={handleExportExcel} 
                                            variant="ghost"
                                            disabled={exportLoading || dailySalesData.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {exportLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypeXls className="mr-2 h-4 w-4" />
                                            )}
                                            {exportLoading ? "Generating..." : "Excel"}
                                        </Button>
                                        <Button
                                            onClick={handleExportPdf}
                                            variant="ghost"
                                            disabled={exportLoading || dailySalesData.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {exportLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypePdf className="mr-2 h-4 w-4" />
                                            )}
                                            {exportLoading ? "Generating..." : "PDF"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="rounded-md border">
                                   
                                    <Table>
                                        <TableHeader className="sticky-header">
                                            <TableRow>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">Branch</TableHead>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">Store</TableHead>
                                                <TableHead className="min-w-[100px] whitespace-nowrap">Terminal</TableHead>
                                                <TableHead className="min-w-[100px] whitespace-nowrap">Date</TableHead>
                                                <TableHead className="min-w-[100px] whitespace-nowrap">SI From</TableHead>
                                                <TableHead className="min-w-[100px] whitespace-nowrap">SI To</TableHead>
                                                <TableHead className="min-w-[120px] whitespace-nowrap">Z-Read Counter</TableHead>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">Old Grand Total</TableHead>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">New Grand Total</TableHead>
                                                <TableHead className="min-w-[120px] whitespace-nowrap">Gross Sales</TableHead>
                                                <TableHead className="min-w-[120px] whitespace-nowrap">Net Sales</TableHead>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">No. of Transactions</TableHead>
                                                <TableHead className="min-w-[120px] whitespace-nowrap">Void Amount</TableHead>
                                                <TableHead className="min-w-[100px] whitespace-nowrap">Guests</TableHead>
                                                <TableHead className="min-w-[120px] whitespace-nowrap">PWD Discount</TableHead>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">Senior Discount</TableHead>
                                                <TableHead className="min-w-[200px] whitespace-nowrap">National Athletes Discount</TableHead>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">Solo Parent Discount</TableHead>
                                                <TableHead className="min-w-[120px] whitespace-nowrap">Valor Discount</TableHead>
                                                <TableHead className="min-w-[150px] whitespace-nowrap">Other Discounts</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={20} className="h-40 text-center">
                                                        <div className="flex justify-center items-center">
                                                            <Loader2 className="h-8 w-8 animate-spin" />
                                                            <span className="ml-2">Loading data...</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : dailySalesData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={20} className="h-40 text-center text-gray-500">
                                                        No data available. Please adjust your search criteria.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                dailySalesData.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="whitespace-nowrap">{item.branch_name}</TableCell>
                                                        <TableCell className="whitespace-nowrap">{item.store_name}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{item.terminal_no}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{item.date}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{item.si_from}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{item.si_to}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{item.z_read_counter}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(Number(item.old_grand_total))}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(Number(item.new_grand_total))}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.total_gross_sales)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.total_net_sales_after_void)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{item.number_of_transactions}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.total_void_amount)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{item.number_of_guests}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.PWD_Discount)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.Senior_Discount)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.National_Athletes_Discount)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.Solo_Parent_Discount)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.Valor_Discount)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-center">{formatAmount(item.Other_Discounts)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}

{grandTotals && (dailySalesData.length > 0) && (
                                     
                                     <TableRow className="bg-gray-100 font-bold">
                                         <TableCell colSpan={9} className="text-right">Grand Totals:</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.total_gross_sales)}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.total_net_sales_after_void)}</TableCell>
                                         <TableCell className="text-center">{grandTotals.number_of_transactions}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.total_void_amount)}</TableCell>
                                         <TableCell className="text-center">{grandTotals.number_of_guests}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.PWD_Discount)}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.Senior_Discount)}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.National_Athletes_Discount)}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.Solo_Parent_Discount)}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.Valor_Discount)}</TableCell>
                                         <TableCell className="text-center">{formatAmount(grandTotals.Other_Discounts)}</TableCell>
                                     </TableRow>
                             )}
                                        </TableBody>
                                    </Table>
                                    
                                </div>
                                <div className="flex justify-end px-2 py-4 border-t">
                                    <div className="text-sm text-gray-700">
                                        Total Records: <span className="font-medium">{dailySalesData.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
