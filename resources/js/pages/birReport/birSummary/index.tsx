import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import { Search, Loader2, FileText, FileSpreadsheet } from "lucide-react"; // Add FileText and FileSpreadsheet
import { useState } from 'react';
import axios from 'axios';
import { useBranchStore } from '@/store/useBranch';
import { useStore } from '@/store/useStore';
import { useDateRange } from '@/store/useDateRange';
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { ScrollArea } from '@/components/ui/scroll-area'; // Remove this import if you removed ScrollArea

// Import for PDF and Excel export
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';

type BirSummaryRow = Record<string, string | number | null | undefined>;

export default function BirSummary() {
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { dateRange: selectedDateRange } = useDateRange();

    const [birSummaryData, setBirSummaryData] = useState<BirSummaryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false); // New state for export loading

    const integerFieldHeaders = ['Z Counter'];
    const integerFieldSet = new Set<string>(integerFieldHeaders.map((header) => header.toLowerCase()));

    const plainIntegerFieldHeaders = ['SI First', 'SI Last', 'Total No of Guest'];
    const plainIntegerFieldSet = new Set<string>(plainIntegerFieldHeaders.map((header) => header.toLowerCase()));

    const decimalFieldHeaders = [
        'Beginning',
        'Ending',
        'Net Amount',
        'Service charge',
        'Delivery Charge',
        'Returns',
        'Voids',
        'Gross',
        'Vatable',
        'VAT Amount',
        'VAT Exempt',
        'Zero Rated',
        'Less VAT',
        'Athelete/Coach',
        'Athlete/Coach',
        'Disability',
        'Senior',
        'Cash',
        'GCash',
        'Gcash',
        'Online Maya',
        'Paymaya',
        'RK Wallet',
        'Rk Wallet',
        'Total Sales',
    ];
    const decimalFieldSet = new Set<string>(decimalFieldHeaders.map((header) => header.toLowerCase()));

    const toNumeric = (value: number | string | null | undefined): number => {
        if (value === null || value === undefined || value === '') {
            return NaN;
        }

        if (typeof value === 'number') {
            return value;
        }

        const cleaned = value.replace(/,/g, '');
        const numeric = Number(cleaned);
        return numeric;
    };

    const isNumericValue = (value: unknown): boolean => {
        return !Number.isNaN(toNumeric(value as any));
    };

    const formatDecimalValue = (value: number | string): string => {
        const numeric = toNumeric(value);
        if (Number.isNaN(numeric)) {
            return '-';
        }
        return new Intl.NumberFormat('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numeric);
    };

    const formatIntegerValue = (value: number | string): string => {
        const numeric = toNumeric(value);
        if (Number.isNaN(numeric)) {
            return '-';
        }
        return new Intl.NumberFormat('en-PH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Math.trunc(numeric));
    };

    const formatPlainIntegerValue = (value: number | string): string => {
        const numeric = toNumeric(value);
        if (Number.isNaN(numeric)) {
            return '-';
        }
        return String(Math.trunc(numeric));
    };

    const formatValueForDisplay = (header: string, value: any): string => {
        if (value === null || value === undefined || value === '') {
            return '-';
        }

        if (header === 'Date') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return format(parsed, 'yyyy-MM-dd');
            }
            return String(value);
        }

        const headerKey = header.toLowerCase();

        if (plainIntegerFieldSet.has(headerKey) && isNumericValue(value)) {
            return formatPlainIntegerValue(value);
        }

        if (integerFieldSet.has(headerKey) && isNumericValue(value)) {
            return formatIntegerValue(value);
        }

        if (decimalFieldSet.has(headerKey) || isNumericValue(value)) {
            return formatDecimalValue(value);
        }

        return String(value);
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/bir/summary-report', {
                params: {
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                              from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                              to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                              store_name: selectedStore ?? 'ALL',
                              
                },
            });
            setBirSummaryData(response.data.data as BirSummaryRow[]);
        } catch (error) {
            console.error('Error fetching BIR Summary data:', error);
            setBirSummaryData([]);
        } finally {
            setLoading(false);
        }
    };

    // Helper: compute ordered headers (fixed first, then dynamic discounts)
    function getOrderedHeaders(rows: BirSummaryRow[]): string[] {
        const fixed: string[] = [
            'Branch',
            'Concept',
            'Date',
            'Z Counter',
            'SI First',
            'SI Last',
            'Beginning',
            'Ending',
            'Net Amount',
            'Service charge',
            'Total Sales',
            'Total No of Guest',
            'Returns',
            'Voids',
            'Gross',
            'Vatable',
            'VAT Amount',
            'VAT Exempt',
            'Zero Rated',
            'Less VAT',
        ];
        const fixedSet = new Set(fixed);
        const dynamic: string[] = [];
        const dynamicSeen = new Set<string>();

        rows.forEach((row) => {
            Object.keys(row).forEach((key) => {
                if (fixedSet.has(key)) {
                    return;
                }

                if (!dynamicSeen.has(key)) {
                    dynamicSeen.add(key);
                    dynamic.push(key);
                }
            });
        });

        return [...fixed, ...dynamic];
    }

    // New function to fetch all data for export
    const fetchAllBirSummaryData = async (): Promise<BirSummaryRow[]> => {
        setExporting(true);
        try {
            const response = await axios.get('/api/bir/summary-report/export', { // Assuming a new export endpoint
                params: {
                    branch_name: selectedBranch?.branch_name ?? 'ALL',
                    from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                    to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                    store_name: selectedStore ?? 'ALL',
                },
            });
            return response.data.data as BirSummaryRow[];
        } catch (error) {
            console.error('Error fetching all BIR Summary data for export:', error);
            return [];
        } finally {
            setExporting(false);
        }
    };

    // New function for Excel export
    const handleExportExcel = async () => {
        setExporting(true);
        try {
            let dataToExport: BirSummaryRow[] = birSummaryData;

            if (dataToExport.length === 0) {
                dataToExport = await fetchAllBirSummaryData();
            }

            if (dataToExport.length === 0) {
                alert('No data to export.');
                return;
            }
            
            const headers = getOrderedHeaders(dataToExport);
            // Format data for export ensuring column order matches headers exactly
            const formattedData = dataToExport.map((row: BirSummaryRow) => {
                const orderedRow: BirSummaryRow = {};
                headers.forEach((h) => {
                    orderedRow[h] = h in row ? row[h] : null;
                });
                return orderedRow;
            });
            
            // Create Excel sheet with ordered data
            const ws = XLSX.utils.json_to_sheet(formattedData);

            // Apply number formatting to cells
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
            const columnHeaders = headers;

            for (let R = range.s.r; R <= range.e.r; R++) {
                for (let C = range.s.c; C <= range.e.c; C++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    const cell = ws[cellAddress];

                    if (!cell || cell.v === null || cell.v === undefined) {
                        continue;
                    }

                    const header = columnHeaders[C];
                    const headerKey = (header || '').toLowerCase();

                    // Skip header row
                    if (R === range.s.r) {
                        continue;
                    }

                    if (header === 'Date') {
                        const dateValue = new Date(cell.v);
                        if (!Number.isNaN(dateValue.getTime())) {
                            cell.t = 'd';
                            cell.v = dateValue;
                            cell.z = 'yyyy-mm-dd';
                        }
                        continue;
                    }

                    const numericValue = toNumeric(cell.v as any);
                    if (Number.isNaN(numericValue)) {
                        continue;
                    }

                    if (plainIntegerFieldSet.has(headerKey)) {
                        cell.t = 'n';
                        cell.v = Math.trunc(numericValue);
                        cell.z = '0';
                        continue;
                    }

                    if (integerFieldSet.has(headerKey)) {
                        cell.t = 'n';
                        cell.v = Math.trunc(numericValue);
                        cell.z = '#,##0';
                        continue;
                    }

                    if (decimalFieldSet.has(headerKey) || isNumericValue(cell.v)) {
                        cell.t = 'n';
                        cell.v = numericValue;
                        cell.z = '#,##0.00';
                        continue;
                    }
                }
            }
            
            // Auto-fit column widths
            const colWidths = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
                let maxWidth = 10;
                for (let R = range.s.r; R <= range.e.r; R++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    const cell = ws[cellAddress];
                    if (cell && cell.v) {
                        const width = String(cell.v).length + 2;
                        maxWidth = Math.max(maxWidth, width);
                    }
                }
                colWidths.push({ wch: Math.min(maxWidth, 50) });
            }
            ws['!cols'] = colWidths;
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "BIR Summary Report");
            
            // Generate file name with date range and filters
            const fromDate = selectedDateRange?.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
            const toDate = selectedDateRange?.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : fromDate;
            const branchInfo = selectedBranch?.branch_name ? `_${selectedBranch.branch_name}` : '';
            const storeInfo = selectedStore ? `_${selectedStore}` : '';
            const fileName = `BIR_Summary_Report${branchInfo}${storeInfo}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            alert("Failed to export to Excel. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    // New function for PDF export
    const handleExportPdf = async () => {
        setExporting(true);
        try {
            let dataToExport = birSummaryData;

            if (dataToExport.length === 0) {
                dataToExport = await fetchAllBirSummaryData();
            }

            if (dataToExport.length === 0) {
                alert('No data to export.');
                return;
            }
            
            // Create a new PDF document in landscape orientation
            const doc = new jsPDF('landscape'); 
            
            // Add title and metadata
            doc.setFontSize(16);
            doc.text('BIR Summary Report', 14, 20);
            
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
            
            const headers = getOrderedHeaders(dataToExport);
            // Prepare table data in exact header order
            const tableData = dataToExport.map((row: BirSummaryRow) => {
                return headers.map((h) => formatValueForDisplay(h, row[h]));
            });
            
            // Generate the table using autoTable
            autoTable(doc, {
                head: [headers],
                body: tableData,
                startY: yPos,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 66, 66] },
                theme: 'grid'
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
            doc.save(`BIR_Summary_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
        } catch (error) {
            console.error("Error exporting to PDF:", error);
            alert("Failed to export to PDF. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    // Runtime headers used for table and exports
    const headers = getOrderedHeaders(birSummaryData);

    return (
        <AppLayout>
            <Head title="BIR Summary" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="BIR Summary"  />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        <DateRangePickernew />
                                        <Button onClick={handleSearch} disabled={loading}>
                                            {loading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="mr-2 h-4 w-4" />
                                            )}
                                            Search
                                        </Button>
                                    </div>
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={handleExportExcel} 
                                            variant="ghost"
                                            disabled={exporting || birSummaryData.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {exporting ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypeXls className="mr-2 h-4 w-4" />
                                            )}
                                            {exporting ? "Generating..." : "Excel"}
                                        </Button>
                                        <Button
                                            onClick={handleExportPdf}
                                            variant="ghost"
                                            disabled={exporting || birSummaryData.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            {exporting ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <IconFileTypePdf className="mr-2 h-4 w-4" />
                                            )}
                                            {exporting ? "Generating..." : "PDF"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="rounded-md border">
                                    <ScrollArea className="w-full max-h-[calc(100vh-200px)] overflow-auto">
                                        <Table>
                                        <TableHeader className="sticky-header">
                                            <TableRow>
                                                {headers.map((header, index) => (
                                                    <TableHead key={index} className="min-w-[150px] whitespace-nowrap">{header}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading && birSummaryData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={headers.length} className="h-40 text-center">
                                                        <div className="flex justify-center items-center">
                                                            <Loader2 className="h-8 w-8 animate-spin" />
                                                            <span className="ml-2">Loading data...</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : birSummaryData.length > 0 ? (
                                                birSummaryData.map((row: BirSummaryRow, rowIndex: number) => (
                                                    <TableRow key={rowIndex}>
                                                        {headers.map((h, cellIndex) => (
                                                            <TableCell key={cellIndex} className="whitespace-nowrap">
                                                                {formatValueForDisplay(h, row[h])}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={headers.length} className="h-40 text-center text-gray-500">
                                                        No data available. Please adjust your search criteria.
                                                    </TableCell>
                                                </TableRow>
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
