import { useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { format } from 'date-fns';
import axios from 'axios';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Search, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
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
import autoTable from 'jspdf-autotable'; // For table generation in PDF
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
interface GovernmentDiscountData {
    id: number;
    branch_name: string;
    store_name: string;
    date: string;
    si_number: string;
    id_type: string;
    id_no: string;
    name: string;
    gross_amount: string;
    discount_amount: string;
    created_at: string;
    updated_at: string;
}

interface GovernmentDiscountApiResponse {
    data: GovernmentDiscountData[];
    pagination: {
        total: number;
        count: number;
        per_page: number;
        current_page: number;
        total_pages: number;
    };
}

export default function GovernmentDiscountIndex() {
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { dateRange: selectedDateRange } = useDateRange();

    const [governmentData, setGovernmentData] = useState<GovernmentDiscountData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);

    const fetchGovernmentData = useCallback(async (page: number) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                from_date: selectedDateRange?.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : '',
                to_date: selectedDateRange?.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : '',
                branch_name: typeof selectedBranch === 'string' ? selectedBranch : (selectedBranch?.branch_name || 'ALL'),
                store_name: typeof selectedStore === 'string' ? selectedStore : (selectedStore?.name || 'ALL'),
                page: page,
            };

            const response = await axios.get<GovernmentDiscountApiResponse>('/api/government-data', { params });
            setGovernmentData(response.data.data);
            setTotalPages(response.data.pagination.total_pages);
            setCurrentPage(response.data.pagination.current_page);
        } catch (err) {
            console.error('Error fetching government discount data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedDateRange, selectedBranch, selectedStore]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchGovernmentData(page);
    };

    const handleSearch = () => {
        fetchGovernmentData(1);
    };

    const fetchAllGovernmentData = useCallback(async () => {
        try {
            const params = {
                from_date: selectedDateRange?.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : '',
                to_date: selectedDateRange?.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : '',
                branch_name: typeof selectedBranch === 'string' ? selectedBranch : (selectedBranch?.branch_name || 'ALL'),
                store_name: typeof selectedStore === 'string' ? selectedStore : (selectedStore?.name || 'ALL'),
                all_data: '1', // Request all data without pagination - send as '1' for proper boolean parsing
            };
            const response = await axios.get<GovernmentDiscountApiResponse>('/api/government-data', { params });
            return response.data.data;
        } catch (err) {
            console.error('Error fetching all government discount data for export:', err);
            setError('Failed to load all data for export. Please try again.');
            return [];
        }
    }, [selectedDateRange, selectedBranch, selectedStore]);

    const handleExportExcel = async () => {
        setLoading(true);
        const allData = await fetchAllGovernmentData();
        if (allData.length > 0) {
            const dataWithoutId = allData.map(({ id,created_at,updated_at, ...rest }) => rest);
            const worksheet = XLSX.utils.json_to_sheet(dataWithoutId);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Government Discount Report');
            XLSX.writeFile(workbook, 'government_discount_report.xlsx');
        }
        setLoading(false);
    };

    const handleExportPdf = async () => {
        setLoading(true);
        const allData = await fetchAllGovernmentData();
        if (allData.length > 0) {
            // Create PDF document with landscape orientation
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm'
            });
            
            // Add header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Government Discount Report', 14, 22);
            
            // Add date range
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const fromDate = selectedDateRange?.from ? format(selectedDateRange.from, 'MMM d, yyyy') : 'Start Date';
            const toDate = selectedDateRange?.to ? format(selectedDateRange.to, 'MMM d, yyyy') : 'End Date';
            doc.text(`Date Range: ${fromDate} - ${toDate}`, 14, 30);
            
            // Add branch and store info if selected
            let yPosition = 38;
            if (selectedBranch) {
                doc.text(`Branch: ${selectedBranch}`, 14, yPosition);
                yPosition += 8;
            }
            if (selectedStore) {
                doc.text(`Store: ${selectedStore}`, 14, yPosition);
                yPosition += 8;
            }
            
            // Prepare table data
            const tableData = allData.map(item => [
                item.branch_name,
                item.store_name,
                item.date,
                item.si_number,
                item.id_type,
                item.id_no,
                item.name,
                parseFloat(item.gross_amount).toFixed(2),
                parseFloat(item.discount_amount).toFixed(2)
            ]);
            
            const headers = [
                'Branch',
                'Store',
                'Date',
                'SI No.',
                'ID Type',
                'ID No.',
                'Name',
                'Gross Amt',
                'Discount Amt'
            ];
            
            // Generate the table
            autoTable(doc, {
                startY: yPosition,
                head: [headers],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 0, 0],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                didDrawPage: function(data) {
                    // Add page numbers
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                    doc.text(
                        'Page ' + doc.getNumberOfPages(),
                        data.settings.margin.left,
                        pageHeight - 10
                    );
                }
            });
            
            // Format the filename with date range
            const fromDateStr = selectedDateRange?.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : 'start-date';
            const toDateStr = selectedDateRange?.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : 'end-date';
            const fileName = `Government-discount-report-${fromDateStr}-to-${toDateStr}.pdf`;
            
            // Save the PDF
            doc.save(fileName);
        }
        setLoading(false);
    };

    return (
        <AppLayout>
            <Head title="Government Discount" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Government Discount" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                 
                                        <DateRangePickernew />
                                        <Button onClick={handleSearch} disabled={loading}>
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                            Search
                                        </Button>
                                    </div>
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={handleExportExcel} 
                                            variant="ghost"
                                            disabled={loading || governmentData.length === 0}
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
                                            disabled={loading || governmentData.length === 0}
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
                                    <ScrollArea className="h-[calc(100vh-250px)] w-full">
                                        <Table>
                                            <TableHeader className='sticky-header'>
                                                <TableRow>
                                                    <TableHead>Branch Name</TableHead>
                                                    <TableHead>Store Name</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>SI Number</TableHead>
                                                    <TableHead>ID Type</TableHead>
                                                    <TableHead>ID No.</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Gross Amount</TableHead>
                                                    <TableHead>Discount Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="text-center">
                                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                            Loading data...
                                                        </TableCell>
                                                    </TableRow>
                                                ) : error ? (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="text-center text-red-500">
                                                            {error}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : governmentData.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="text-center">
                                                            No data available for the selected filters.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    governmentData.map((data, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{data.branch_name}</TableCell>
                                                            <TableCell>{data.store_name}</TableCell>
                                                            <TableCell>{data.date}</TableCell>
                                                            <TableCell>{data.si_number}</TableCell>
                                                            <TableCell>{data.id_type}</TableCell>
                                                            <TableCell>{data.id_no}</TableCell>
                                                            <TableCell>{data.name}</TableCell>
                                                            <TableCell>{parseFloat(data.gross_amount).toFixed(2)}</TableCell>
                                                            <TableCell>{parseFloat(data.discount_amount).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
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
