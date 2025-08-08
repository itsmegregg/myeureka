import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import axios from 'axios';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Search, FileDown, Printer, Loader2, FileSpreadsheet, File, FileText } from 'lucide-react';
import DateRangePickernew from '@/components/public-components/date-range-picker';
import BranchSelect from '@/components/public-components/branch-select';
import StoreSelect from '@/components/public-components/store-select';
import { useBranchStore } from '@/store/useBranch';
import { useStore } from '@/store/useStore';
import { useDateRange } from '@/store/useDateRange';
import TextHeader from '@/components/reusable-components/text-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import PaymentTypeSelect from '@/components/public-components/paymentType-select';
import { usePaymentTypeStore } from '@/store/usePaymentType';
// jspdf-autotable not used directly


interface BirDetailedData {
    branch_name: string;
    store_name: string;
    date: string;
    si_number: string;
    vat_exempt_sales: number;
    zero_rated_sales: number;
    vat_amount: number;
    less_vat: number;
    gross_amount: number;
    discount_code: string;
    discount_amount: number;
    net_total: number;
    payment_type: string;
    amount: number;
}

interface BirDetailedApiResponse {
    status: string;
    data: BirDetailedData[];
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        path: string;
        per_page: number;
        to: number;
        total: number;
    };
}

export default function BirDetailed() {
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { dateRange: selectedDateRange } = useDateRange();
    const { selectedPaymentType } = usePaymentTypeStore();
    const [birData, setBirData] = useState<BirDetailedData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);

    const fetchBirDetailedData = useCallback(async (page: number = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                store_name: selectedStore ?? 'ALL',
                payment_type: selectedPaymentType,
                page: page,
                per_page: 15
            };

            const response = await axios.get<BirDetailedApiResponse>('/api/bir/detailed-report', { params });
            setBirData(response.data.data);
            setTotalPages(response.data.meta.last_page);
            setCurrentPage(response.data.meta.current_page);
    
        } catch (err) {
            console.error('Error fetching BIR detailed data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedDateRange, selectedBranch, selectedStore, selectedPaymentType]);


    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchBirDetailedData(page);
    };

    const handleSearch = () => {
        fetchBirDetailedData(1);
    };

    const fetchAllBirDetailedData = useCallback(async () => {
        try {
            const params = {
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                store_name: selectedStore ?? 'ALL',
                payment_type: selectedPaymentType,
            };
            const response = await axios.get('/api/bir/detailed-report/export', { params });
            console.log("params:",params)
            console.log("response:",response.data.data)
            return response.data.data;
        } catch (err) {
            console.error('Error fetching all BIR detailed data for export:', err);
            setError('Failed to load all data for export. Please try again.');
            return [];
        }
    }, [selectedDateRange, selectedBranch, selectedStore]);

    const handleExportExcel = async () => {
        setLoading(true);
        const allData = await fetchAllBirDetailedData();
        if (allData.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(allData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'BIR Detailed Report');
            XLSX.writeFile(workbook, 'bir_detailed_report.xlsx');
        }
        setLoading(false);
    };

    const handleExportPdf = async () => {
        setLoading(true);
        const allData = await fetchAllBirDetailedData();
        if (allData.length > 0) {
            try {
                // Create PDF document
                const doc = new jsPDF();
                
                // Add title and metadata
                doc.setFontSize(16);
                doc.text('BIR Detailed Report', 14, 20);
                
                // Add metadata
                doc.setFontSize(10);
                let yPos = 30;
                
                if (selectedDateRange.from && selectedDateRange.to) {
                    doc.text(`Date Range: ${format(selectedDateRange.from, 'MMM dd, yyyy')} to ${format(selectedDateRange.to, 'MMM dd, yyyy')}`, 14, yPos);
                    yPos += 6;
                }
                
                if (selectedBranch) {
                    doc.text(`Branch: ${selectedBranch.branch_name || 'All Branches'}`, 14, yPos);
                    yPos += 6;
                }
                
                if (selectedStore) {
                    doc.text(`Store: ${selectedStore || 'All Stores'}`, 14, yPos);
                    yPos += 6;
                }
                
                // Terminal information removed per request
                
                // Prepare table data
                const tableData = allData.map((data: BirDetailedData) => [
                    data.branch_name || '-',
                    data.store_name || '-',
                    data.date || '-',
                    data.si_number || '-',
                    Number(data.vat_exempt_sales).toFixed(2),
                    Number(data.vat_amount).toFixed(2),
                    Number(data.net_total).toFixed(2)
                ]);
                
                // Generate the table using autoTable
                autoTable(doc, {
                    startY: yPos,
                    head: [['Branch', 'Store', 'Date', 'SI No.', 'VAT Exempt', 'VAT Amount', 'Net Total']],
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [66, 66, 66] }
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
                
                // Save the PDF
                doc.save(`BIR_Detailed_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
            } catch (error) {
                console.error('Error exporting PDF:', error);
                setError('Failed to export PDF. Please try again.');
            }
        }
        setLoading(false);
    };



    return (
        <AppLayout>
            <Head title="BIR Detailed Report" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="BIR Detailed Report" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        <DateRangePickernew />
                                        {/* TerminalSelect removed per request */}
                                        <PaymentTypeSelect />
                                        <Button onClick={handleSearch} disabled={loading}>
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                            Search
                                        </Button>
                                    </div>
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={handleExportExcel} 
                                            variant="ghost"
                                            disabled={loading || birData.length === 0}
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
                                            onClick={handleExportPdf}
                                            variant="ghost"
                                            disabled={loading || birData.length === 0}
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
                                <div className="rounded-md border">
                                 
                                        <Table className="w-full whitespace-nowrap">
                                            <TableHeader className='sticky-header'>
                                                <TableRow>
                                                    <TableHead>Branch Name</TableHead>
                                                    <TableHead>Store Name</TableHead>
                                                    {/* Terminal Number column removed */}
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>SI Number</TableHead>
                                                    <TableHead>VAT Exempt Sales</TableHead>
                                                    <TableHead>Zero-Rated Sales</TableHead>
                                                    <TableHead>VAT Amount</TableHead>
                                                    <TableHead>Less VAT</TableHead>
                                                    <TableHead>Gross Amount</TableHead>
                                                    <TableHead>Discount Code</TableHead>
                                                    <TableHead>Discount Amount</TableHead>
                                                    <TableHead>Net Total</TableHead>
                                                    <TableHead>Payment Type</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={14} className="text-center">
                                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                            Loading data...
                                                        </TableCell>
                                                    </TableRow>
                                                ) : error ? (
                                                    <TableRow>
                                                        <TableCell colSpan={14} className="text-center text-red-500">
                                                            {error}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : birData.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={14} className="text-center">
                                                            No data available for the selected filters.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    birData.map((data, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{data.branch_name}</TableCell>
                                                            <TableCell>{data.store_name}</TableCell>
                                                            {/* Terminal Number cell removed */}
                                                            <TableCell>{data.date}</TableCell>
                                                            <TableCell>{data.si_number}</TableCell>
                                                            <TableCell>{data.vat_exempt_sales.toFixed(2)}</TableCell>
                                                            <TableCell>{data.zero_rated_sales.toFixed(2)}</TableCell>
                                                            <TableCell>{data.vat_amount.toFixed(2)}</TableCell>
                                                            <TableCell>{data.less_vat.toFixed(2)}</TableCell>
                                                            <TableCell>{data.gross_amount.toFixed(2)}</TableCell>
                                                            <TableCell>{data.discount_code || '-'}</TableCell>
                                                            <TableCell>{data.discount_amount.toFixed(2)}</TableCell>
                                                            <TableCell>{data.net_total.toFixed(2)}</TableCell>
                                                            <TableCell>{data.payment_type || 'N/A'}</TableCell>
                                                            <TableCell>{data.amount.toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                   
                                   
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex justify-end mt-4">
                                        <Button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1 || loading}
                                            variant="outline"
                                            className="mr-2"
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages || loading}
                                            variant="outline"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
