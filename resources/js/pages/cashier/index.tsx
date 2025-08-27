import React, { useState, useEffect, useCallback } from "react";
import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import { Search, ChevronDown, ChevronUp, Loader2, FileDown, FileText } from "lucide-react";
import * as XLSX from "xlsx";
// Import jsPDF with autoTable support
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { format } from "date-fns";
import axios from "axios";
import { useBranchStore } from "@/store/useBranch";
import { useStore } from "@/store/useStore";
import { useDateRange } from "@/store/useDateRange";
import { useCashierStore } from "@/store/useCashier";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import CashierSelect from "@/components/public-components/cashier-select";


interface SalesDetail {
    payment_type: string;
    amount: number;
}

interface CashierData {
    branch_name: string;
    store_name: string;
    date: string;
    terminal_number: string;
    cashier_name: string;
    total_gross_amount: number;
    total_net_amount: number;
    total_service_charge: number;
    total_less_vat: number;
    total_void_amount: number;
    tx_count: number;
    sales_details: SalesDetail[];
}

interface CashierApiResponse {
    status: string;
    data: CashierData[];
    payment_types: string[];
    total_records: number;
}

export default function CashierIndex() {
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { dateRange } = useDateRange();
    const { selectedCashier } = useCashierStore();

    const [cashierData, setCashierData] = useState<CashierData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [exportLoading, setExportLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    
    const fetchCashierData = useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to) {
            setError("Please select a date range");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const params = {
                from_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
                to_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                store_name: typeof selectedStore === 'object' && selectedStore !== null 
                    ? (selectedStore as { id: string }).id 
                    : (selectedStore || 'ALL'),
                cashier_name: selectedCashier ?? 'ALL',
            };

            console.log('API request params:', params); // Debug log to see what's being sent
            
            const response = await axios.get<CashierApiResponse>("/api/cashier", { params });
            
            if (response.data.status === "success") {
                setCashierData(response.data.data);
            } else {
                setError("Failed to fetch data");
            }
        } catch (err) {
            console.error("Error fetching cashier data:", err);
            setError("An error occurred while fetching data");
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedBranch, selectedStore, selectedCashier]);

    const handleSearch = () => {
        fetchCashierData();
    };

    const toggleRowExpansion = (rowId: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [rowId]: !prev[rowId]
        }));
    };

    // Helper function to format currency
    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };
    
    // Helper function to format currency with P instead of PHP or peso sign
    const formatAmountWithP = (amount: number) => {
        return `P${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    };

    const handleExportExcel = async () => {
        setExportLoading(true);
        try {
            // Format data for Excel
            const excelData = cashierData.map(data => {
                // Create a flattened base record with type that allows dynamic keys
                const baseRecord: Record<string, string | number> = {
                    'Branch': data.branch_name,
                    'Store': data.store_name,
                    'Date': data.date,
                    'Terminal': data.terminal_number,
                    'Cashier': data.cashier_name,
                    'Gross Amount': data.total_gross_amount,
                    'Net Amount': data.total_net_amount,
                    'Service Charge': data.total_service_charge,
                    'Less VAT': data.total_less_vat,
                    'Void Amount': data.total_void_amount,
                    'Tx Count': data.tx_count
                };
                
                // Add payment details as separate columns
                data.sales_details.forEach(detail => {
                    baseRecord[`${detail.payment_type}`] = detail.amount;
                });
                
                return baseRecord;
            });
            
            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Cashier Report');
            
            // Generate file name with date range
            const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'data';
            const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
            const fileName = `cashier_report_${fromDate}_to_${toDate}.xlsx`;
            
            // Export the Excel file
            XLSX.writeFile(workbook, fileName);
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            setError('Failed to export data to Excel');
        } finally {
            setExportLoading(false);
        }
    };
    
    const handleExportPdf = async () => {
        setExportLoading(true);
        try {
            // Create a new PDF document
            const doc = new jsPDF('landscape', 'mm', 'a4');
            
            // Add title
            doc.setFontSize(16);
            doc.text('Cashier Report', 14, 15);
            
            // Add date range
            const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
            const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
            doc.setFontSize(10);
            doc.text(`From: ${fromDate} To: ${toDate}`, 14, 22);
            
            // Branch and Store filter info
            const branchInfo = `Branch: ${selectedBranch?.branch_name || 'ALL'}`;
            const storeInfo = `Store: ${typeof selectedStore === 'object' ? (selectedStore as { id: string }).id : (selectedStore || 'ALL')}`;
            doc.text(branchInfo + ' | ' + storeInfo, 14, 28);
            
            // Set starting Y position for the first table
            let yPosition = 35;
            
            // For each cashier, create a main row table followed by payment details
            for (let i = 0; i < cashierData.length; i++) {
                const row = cashierData[i];
                
                // Create main cashier row table
                autoTable(doc, {
                    head: [['Branch', 'Store', 'Date', 'Terminal', 'Cashier', 'Gross Amount', 'Net Amount', 'Service Charge', 'Less VAT', 'Void Amount', 'Tx Count']],
                    body: [[
                        row.branch_name,
                        row.store_name,
                        row.date,
                        row.terminal_number,
                        row.cashier_name,
                        formatAmountWithP(row.total_gross_amount),
                        formatAmountWithP(row.total_net_amount),
                        formatAmountWithP(row.total_service_charge),
                        formatAmountWithP(row.total_less_vat),
                        formatAmountWithP(row.total_void_amount),
                        row.tx_count.toString()
                    ]],
                    startY: yPosition,
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 4 },
                    columnStyles: {
                        5: { halign: 'right' },
                        6: { halign: 'right' },
                        7: { halign: 'right' },
                        8: { halign: 'right' },
                        9: { halign: 'right' },
                        10: { halign: 'right' }
                    },
                    tableWidth: 'auto'
                });
                
                // Update Y position to be just below the main table
                yPosition = (doc as any).lastAutoTable.finalY + 5;
                
                // Add Payment Details text
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text('Payment Details:', 20, yPosition);
                yPosition += 5;
                
                // Check if there are payment details
                if (row.sales_details && row.sales_details.length > 0) {
                    // Create a header array for the payment details - all payment types
                    const paymentHeaders = ['Payment Type', 'Amount'];
                    
                    // Create data for payment details as rows
                    const paymentData = row.sales_details.map(detail => [
                        detail.payment_type,
                        formatAmountWithP(detail.amount)
                    ]);
                    
                    // Create a more horizontal layout for payment details
                    // Organize payment details in rows of multiple columns
                    const paymentColumns = row.sales_details.map(detail => [
                        `${detail.payment_type}:`,
                        formatAmountWithP(detail.amount)
                    ]).flat();
                    
                    // Calculate how many pairs per row (for landscape, 3 payment types per row = 6 columns)
                    const columnsPerRow = 6; // 3 payment types with their amounts
                    const rows = [];
                    
                    // Create rows with multiple payment columns
                    for (let j = 0; j < paymentColumns.length; j += columnsPerRow) {
                        rows.push(paymentColumns.slice(j, j + columnsPerRow));
                    }
                    
                    autoTable(doc, {
                        body: rows,
                        startY: yPosition,
                        theme: 'plain',
                        styles: { fontSize: 8, fontStyle: 'normal', cellPadding: 4 },
                        columnStyles: {
                            1: { halign: 'right', fontStyle: 'bold' },
                            3: { halign: 'right', fontStyle: 'bold' },
                            5: { halign: 'right', fontStyle: 'bold' }
                        },
                        margin: { left: 20, right: 20 },
                        tableWidth: 'auto'
                    });
                    
                    // Update position for next section
                    yPosition = (doc as any).lastAutoTable.finalY + 5;
                }
                
                // Add space after each cashier's complete data
                yPosition += 10;
                
                // Check if we need to add a new page
                if (yPosition > 190 && i < cashierData.length - 1) {
                    doc.addPage();
                    yPosition = 20;
                }
            }
            
            
            
            // Generate file name with date range
            const fileName = `cashier_report_${fromDate}_to_${toDate}.pdf`;
            
            // Save the PDF
            doc.save(fileName);
        } catch (err) {
            console.error('Error exporting to PDF:', err);
            setError('Failed to export data to PDF');
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Cashier" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Cashier Report" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        <CashierSelect/>
                                        <DateRangePickernew />
                                        <Button onClick={handleSearch} disabled={loading}>
                                            {loading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="mr-2 h-4 w-4" />
                                            )}
                                            {loading ? "Loading..." : "Search"}
                                        </Button>
                                    </div>
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={handleExportExcel} 
                                            variant="ghost"
                                            disabled={loading || exportLoading || cashierData.length === 0}
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
                                            disabled={loading || exportLoading || cashierData.length === 0}
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
                                <div className="rounded-md border overflow-hidden">
                                    <ScrollArea className="h-[calc(100vh-250px)] w-full">
                                        <Table>
                                            <TableHeader className='sticky-header'>
                                                <TableRow>
                                                    <TableHead className="w-12"></TableHead>
                                                    <TableHead>Branch</TableHead>
                                                    <TableHead>Store</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Terminal</TableHead>
                                                    <TableHead>Cashier</TableHead>
                                                    <TableHead className="text-right">Gross Amount</TableHead>
                                                    <TableHead className="text-right">Net Amount</TableHead>
                                                    <TableHead className="text-right">Service Charge</TableHead>
                                                    <TableHead className="text-right">Less VAT</TableHead>
                                                    <TableHead className="text-right">Void Amount</TableHead>
                                                    <TableHead className="text-right">Tx Count</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={11} className="text-center py-8">
                                                            <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
                                                            Loading...
                                                        </TableCell>
                                                    </TableRow>
                                                ) : error ? (
                                                    <TableRow>
                                                        <TableCell colSpan={11} className="text-center text-red-500 py-8">
                                                            {error}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : cashierData.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={11} className="text-center py-8">
                                                            No data available. Please select filters and search.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    cashierData.map((data, index) => {
                                                        const rowId = `${data.branch_name}-${data.store_name}-${data.date}-${data.terminal_number}-${data.cashier_name}`;
                                                        const isExpanded = expandedRows[rowId] || false;
                                                        
                                                        return (
                                                            <React.Fragment key={index}>
                                                                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpansion(rowId)}>
                                                                    <TableCell className="p-2">
                                                                        {isExpanded ? (
                                                                            <ChevronUp className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>{data.branch_name}</TableCell>
                                                                    <TableCell>{data.store_name}</TableCell>
                                                                    <TableCell>{data.date}</TableCell>
                                                                    <TableCell>{data.terminal_number}</TableCell>
                                                                    <TableCell>{data.cashier_name}</TableCell>
                                                                    <TableCell className="text-right">{formatAmount(data.total_gross_amount)}</TableCell>
                                                                    <TableCell className="text-right">{formatAmount(data.total_net_amount)}</TableCell>
                                                                    <TableCell className="text-right">{formatAmount(data.total_service_charge)}</TableCell>
                                                                    <TableCell className="text-right">{formatAmount(data.total_less_vat)}</TableCell>
                                                                    <TableCell className="text-right">{formatAmount(data.total_void_amount)}</TableCell>
                                                                    <TableCell className="text-right">{data.tx_count}</TableCell>
                                                                </TableRow>
                                                                {isExpanded && (
                                                                    <TableRow>
                                                                        <TableCell colSpan={11} className="p-0 border-b-0">
                                                                            <div className="bg-muted/50 p-4">
                                                                                <h4 className="text-sm font-medium mb-2">Payment Details</h4>
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                    {data.sales_details.map((detail, i) => (
                                                                                        <div key={i} className="p-3 bg-white rounded-md shadow-sm border">
                                                                                            <div className="flex justify-between items-center">
                                                                                                <span className="font-medium">{detail.payment_type}</span>
                                                                                                <span className="text-right">{formatAmount(detail.amount)}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
