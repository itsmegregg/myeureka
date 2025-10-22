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
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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
    vatable_amount: number;
    discount_code: string;
    discount_amount: number;
    net_total: number;
    payment_type: string;
    service_charge: number;
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
                per_page: 30
            };

            const response = await axios.get<BirDetailedApiResponse>('/api/bir/new-birData', { params });
            setBirData(response.data.data);
            setTotalPages(response.data.meta?.last_page || 1);
            setCurrentPage(response.data.meta?.current_page || 1);
            console.log(params)
    
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
            const baseParams = {
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                store_name: selectedStore ?? 'ALL',
                payment_type: selectedPaymentType,
            } as const;

            // Fetch first page to get pagination meta
            const firstResp = await axios.get<BirDetailedApiResponse>('/api/bir/new-birData', { params: { ...baseParams, page: 1, per_page: 30 } });
            const firstData = firstResp.data.data || [];
            const lastPage = firstResp.data.meta?.last_page || 1;

            if (lastPage <= 1) {
                return firstData;
            }

            // Fetch remaining pages in parallel
            const requests: Promise<any>[] = [];
            for (let p = 2; p <= lastPage; p++) {
                requests.push(axios.get<BirDetailedApiResponse>('/api/bir/new-birData', { params: { ...baseParams, page: p, per_page: 30 } }));
            }
            const responses = await Promise.all(requests);
            const restData = responses.flatMap(r => r.data.data || []);
            return [...firstData, ...restData];
        } catch (err) {
            console.error('Error fetching all BIR detailed data for export:', err);
            setError('Failed to load all data for export. Please try again.');
            return [];
        }
    }, [selectedDateRange, selectedBranch, selectedStore, selectedPaymentType]);

    const handleExportExcel = async () => {
        setLoading(true);
        const allData = await fetchAllBirDetailedData();
        if (allData.length > 0) {
            const numericFields = [
                'vat_exempt_sales',
                'zero_rated_sales',
                'vat_amount',
                'less_vat',
                'gross_amount',
                'vatable_amount',
                'discount_amount',
                'net_total',
                'service_charge',
                'amount'
            ] as const;

            const sanitized = allData.map((row) => {
                const base: Record<string, unknown> = { ...row };

                numericFields.forEach((field) => {
                    base[field] = Number((row as any)[field] ?? 0);
                });

                return {
                    ...base,
                    date: row.date,
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(sanitized);
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
                    Number(data.zero_rated_sales).toFixed(2),
                    Number(data.vat_amount).toFixed(2),
                    Number(data.less_vat).toFixed(2),
                    Number(data.gross_amount).toFixed(2),
                    Number(data.vatable_amount).toFixed(2),
                    Number(data.net_total).toFixed(2)
                ]);
                
                // Generate the table using autoTable
                autoTable(doc, {
                    startY: yPos,
                    head: [[
                        'Branch',
                        'Store',
                        'Date',
                        'SI No.',
                        'VAT Exempt',
                        'Zero Rated',
                        'VAT Amount',
                        'Less VAT',
                        'Gross Amount',
                        'Vatable Amount',
                        'Net Total'
                    ]],
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
                                    <div className="flex gap-2">
                                        <BranchSelect />
                                        <DateRangePickernew />
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
                            <div className="rounded-md border overflow-hidden">
                                <Table className="w-full whitespace-nowrap h-[calc(100vh-200px)]">
                                    <TableHeader className="sticky-header">
                                        <TableRow>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Branch Name</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Store Name</TableHead>
                                            {/* Terminal Number header removed */}
                                            <TableHead className="min-w-[120px] whitespace-nowrap">Date</TableHead>
                                            <TableHead className="min-w-[120px] whitespace-nowrap">SI Number</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">VAT Exempt Sales</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Zero-Rated Sales</TableHead>
                                            <TableHead className="min-w-[120px] whitespace-nowrap">VAT Amount</TableHead>
                                            <TableHead className="min-w-[120px] whitespace-nowrap">Less VAT</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Gross Amount</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">VATable Amount</TableHead>
                                            <TableHead className="min-w-[120px] whitespace-nowrap">Discount Code</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Discount Amount</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Net Total</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Payment Type</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Service Charge</TableHead>
                                            <TableHead className="min-w-[150px] whitespace-nowrap">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={16} className="text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                    Loading data...
                                                </TableCell>
                                            </TableRow>
                                        ) : error ? (
                                            <TableRow>
                                                <TableCell colSpan={16} className="text-center text-red-500">
                                                    {error}
                                                </TableCell>
                                            </TableRow>
                                        ) : birData.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={16} className="text-center">
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
                                                    <TableCell>{Number(data.vat_exempt_sales ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{Number(data.zero_rated_sales ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{Number(data.vat_amount ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{Number(data.less_vat ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{Number(data.gross_amount ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{Number(data.vatable_amount ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{data.discount_code || '-'}</TableCell>
                                                    <TableCell>{Number(data.discount_amount ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{Number(data.net_total ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{data.payment_type || 'N/A'}</TableCell>
                                                    <TableCell>{Number(data.service_charge ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell>{Number(data.amount ?? 0).toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                   
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex justify-center mt-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={(e) => { e.preventDefault(); handlePageChange(Math.max(1, currentPage - 1)); }}
                                                        href="#"
                                                        aria-disabled={currentPage <= 1}
                                                    />
                                                </PaginationItem>
                                                {(() => {
                                                    const items = [] as React.ReactNode[];
                                                    const start = Math.max(1, currentPage - 2);
                                                    const end = Math.min(totalPages, currentPage + 2);
                                                    if (start > 1) {
                                                        items.push(
                                                            <PaginationItem key={1}>
                                                                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1); }}>1</PaginationLink>
                                                            </PaginationItem>
                                                        );
                                                        if (start > 2) items.push(<PaginationEllipsis key="start-ellipsis" />);
                                                    }
                                                    for (let p = start; p <= end; p++) {
                                                        items.push(
                                                            <PaginationItem key={p}>
                                                                <PaginationLink href="#" isActive={p === currentPage} onClick={(e) => { e.preventDefault(); handlePageChange(p); }}>{p}</PaginationLink>
                                                            </PaginationItem>
                                                        );
                                                    }
                                                    if (end < totalPages) {
                                                        if (end < totalPages - 1) items.push(<PaginationEllipsis key="end-ellipsis" />);
                                                        items.push(
                                                            <PaginationItem key={totalPages}>
                                                                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages); }}>{totalPages}</PaginationLink>
                                                            </PaginationItem>
                                                        );
                                                    }
                                                    return items;
                                                })()}
                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={(e) => { e.preventDefault(); handlePageChange(Math.min(totalPages, currentPage + 1)); }}
                                                        href="#"
                                                        aria-disabled={currentPage >= totalPages}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
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
