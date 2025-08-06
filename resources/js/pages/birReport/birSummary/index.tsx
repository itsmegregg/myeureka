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
import TerminalSelect from "@/components/public-components/terminal-select";
import { useTerminalStore } from "@/store/useTerminal";


export default function BirSummary() {
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { dateRange: selectedDateRange } = useDateRange();
    const { selectedTerminal } = useTerminalStore();

    const [birSummaryData, setBirSummaryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false); // New state for export loading

    const handleSearch = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/bir/summary-report', {
                params: {
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                              from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                              to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                              store_name: selectedStore ?? 'ALL',
                              terminal_number: selectedTerminal,
                },
            });
            setBirSummaryData(response.data.data);
        } catch (error) {
            console.error('Error fetching BIR Summary data:', error);
            setBirSummaryData([]);
        } finally {
            setLoading(false);
        }
    };

    // New function to fetch all data for export
    const fetchAllBirSummaryData = async () => {
        setExporting(true);
        try {
            const response = await axios.get('/api/bir/summary-report/export', { // Assuming a new export endpoint
                params: {
                    branch_name: selectedBranch?.branch_name ?? 'ALL',
                    from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
                    to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
                    store_name: selectedStore ?? 'ALL',
                    terminal_number: selectedTerminal,
                },
            });
            return response.data.data;
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
            let dataToExport = birSummaryData;

            if (dataToExport.length === 0) {
                dataToExport = await fetchAllBirSummaryData();
            }

            if (dataToExport.length === 0) {
                alert('No data to export.');
                return;
            }
            
            // Format data for export ensuring column order matches headers
            const formattedData = dataToExport.map(row => {
                // Create a new object with properties in the exact order of headers
                const orderedRow: Record<string, any> = {};
                headers.forEach(header => {
                    // Find the matching value for this header in the row
                    // This assumes the property names in row match or are similar to headers
                    const matchingKey = Object.keys(row).find(key => 
                        key.toLowerCase().includes(header.toLowerCase()) || 
                        header.toLowerCase().includes(key.toLowerCase()));
                    
                    orderedRow[header] = matchingKey ? row[matchingKey] : null;
                });
                return orderedRow;
            });
            
            // Create Excel sheet with ordered data
            const ws = XLSX.utils.json_to_sheet(formattedData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "BIR Summary Report");
            
            // Generate file name with date range and filters
            const fromDate = selectedDateRange?.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
            const toDate = selectedDateRange?.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : fromDate;
            const branchInfo = selectedBranch?.branch_name ? `_${selectedBranch.branch_name}` : '';
            const storeInfo = selectedStore ? `_${selectedStore}` : '';
            const terminalInfo = selectedTerminal ? `_Terminal${selectedTerminal}` : '';
            const fileName = `BIR_Summary_Report${branchInfo}${storeInfo}${terminalInfo}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            
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
            
            // Always show terminal information, even if it's 'All Terminals'
            doc.text(`Terminal: ${selectedTerminal || 'All Terminals'}`, 14, yPos);
            yPos += 6;
            
            // Prepare table data
            const tableData = dataToExport.map((row: any) => {
                // For each row, extract values in the exact order matching headers
                return headers.map(header => {
                    // Find the matching key in this row object
                    const matchingKey = Object.keys(row).find(key => 
                        key.toLowerCase().includes(header.toLowerCase()) || 
                        header.toLowerCase().includes(key.toLowerCase()));
                        
                    // Get the value or use '-' for null/undefined
                    const value = matchingKey ? (row[matchingKey] !== null ? row[matchingKey] : '-') : '-';
                    return value;
                });
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


    const headers = [
        "Branch", "Concept", "Terminal", "Date", "Z Counter", "SI First", "SI Last",
        "Beginning", "Ending", "Net Amount", "Service Charge", "PWD", "Senior",
        "NATIONAL ATHLETES", "SOLO PARENT", "VALOR", "OTHER DISCOUNTS",
        "Returns", "Voids", "Gross", "Vatable", "VAT Amount", "VAT Exempt",
        "Zero Rated", "Less VAT"
    ];

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
                                        <TerminalSelect />
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
                                    <ScrollArea className="h-[calc(100vh-250px)] w-full">
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
                                                birSummaryData.map((row, rowIndex) => (
                                                    <TableRow key={rowIndex}>
                                                        {Object.values(row).map((cell: any, cellIndex) => (
                                                            <TableCell key={cellIndex} className="whitespace-nowrap">{cell !== null ? cell : '-'}</TableCell>
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
