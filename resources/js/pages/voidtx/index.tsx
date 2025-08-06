import React, { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { format } from 'date-fns';
import axios from 'axios';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Search, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
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
import CashierSelect from '@/components/public-components/cashier-select';
import { useCashierStore } from "@/store/useCashier";
interface VoidTransactionData {
    store_name: string;
    branch_name: string;
    terminal_number: string;
    date: string;
    time: string;
    si_number: string;
    cashier_name: string;
    total_void_amount_for_transaction: number;
    approved_by: string;
    void_reason: string;
}

interface VoidTransactionResponse {
    status: string;
    data: VoidTransactionData[];
}

interface Branch {
    id: string;
    branch_name: string;
    name: string;
}

interface Store {
    id: string;
    name: string;
}

type StoreState = {
    selectedStore: Store | string | null;
}

type BranchState = {
    selectedBranch: Branch | null;
}



export default function VoidTxIndex() {
    const { selectedBranch } = useBranchStore() as BranchState;
    const { selectedStore } = useStore() as StoreState;
    const { dateRange } = useDateRange();
    const { selectedCashier } = useCashierStore();
    const [voidData, setVoidData] = useState<VoidTransactionData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVoidTransactionData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                from_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
                to_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
                branch_name: selectedBranch?.branch_name ?? 'ALL',
                store_name: typeof selectedStore === 'object' && selectedStore !== null ? selectedStore.id : (selectedStore || 'ALL'),
                cashier_name: selectedCashier ?? 'ALL',
            };
            console.log('API request params:', params);
            const response = await axios.get<VoidTransactionResponse>('/api/void-tx', { params });
            if (response.data.status === 'success') {
                setVoidData(response.data.data);
            } else {
                setError('Failed to load data. Please try again.');
            }
        } catch (err) {
            console.error('Error fetching void transaction data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedBranch, selectedStore, selectedCashier]);

    const handleSearch = () => {
        fetchVoidTransactionData();
    };

    const handleExportExcel = () => {
        if (voidData.length > 0) {
            // Create a filtered dataset without void_flag column
            const cleanData = voidData.map(data => ({
                branch_name: data.branch_name,
                store_name: data.store_name,
                date: data.date,
                time: data.time,
                si_number: data.si_number,
                cashier_name: data.cashier_name,
                total_void_amount_for_transaction: data.total_void_amount_for_transaction,
                approved_by: data.approved_by
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(cleanData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Void Transactions');
            XLSX.writeFile(workbook, 'void_transactions_report.xlsx');
        }
    };

    const handleExportPdf = () => {
        if (voidData.length > 0) {
            // Create a new PDF document
            const doc = new jsPDF();
            
            // Add header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Void Transactions Report', 14, 22);
            
            // Add date range
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const fromDate = dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : 'Start Date';
            const toDate = dateRange?.to ? format(dateRange.to, 'MMM d, yyyy') : 'End Date';
            doc.text(`Date Range: ${fromDate} - ${toDate}`, 14, 30);
            
            // Add branch info if selected
            let currentY = 38;
            const branch = selectedBranch as Branch | null;
            if (branch && branch.branch_name !== 'ALL') {
                doc.text(`Branch: ${branch.name}`, 14, currentY);
                currentY += 8;
            }
            
            // Add store info if selected
            if (typeof selectedStore === 'object' && selectedStore !== null && 'id' in selectedStore && selectedStore.id !== 'ALL') {
                doc.text(`Store: ${selectedStore.name}`, 14, currentY);
            }
            
            // Define columns for the table
            const headers = ["Branch", "Store", "Terminal", "Date", "Time", "SI No.", "Cashier", "Void Amount", "Approved By", "Void Reason"];
            
            // Convert void data for table
            const tableData = voidData.map(data => [
                data.branch_name,
                data.store_name,
                data.terminal_number,
                data.date,
                data.time,
                data.si_number,
                data.cashier_name,
                data.total_void_amount_for_transaction.toFixed(2),
                data.approved_by,
                data.void_reason
            ]);
            
            // Add table to PDF using autoTable
            autoTable(doc, {
                startY: 50,
                head: [headers],
                body: tableData,
                margin: { top: 50 },
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
            const fromDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'start-date';
            const toDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'end-date';
            const fileName = `Void-Transactions-${fromDateStr}-to-${toDateStr}.pdf`;
            
            doc.save(fileName);
        }
    };

    return (
        <AppLayout>
            <Head title="Void Transaction" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Void Transaction" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        <CashierSelect/>
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
                                            disabled={loading || voidData.length === 0}
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
                                            disabled={loading || voidData.length === 0}
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
                                                    <TableHead>Terminal Number</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>SI Number</TableHead>
                                                    <TableHead>Cashier Name</TableHead>
                                                    <TableHead>Void Amount</TableHead>
                                                    <TableHead>Void Reason</TableHead>
                                                    <TableHead>Approved By</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center">
                                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                            Loading data...
                                                        </TableCell>
                                                    </TableRow>
                                                ) : error ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center text-red-500">
                                                            {error}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : voidData.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center">
                                                            No data available for the selected filters.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    voidData.map((data, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{data.branch_name}</TableCell>
                                                            <TableCell>{data.store_name}</TableCell>    
                                                            <TableCell>{data.terminal_number}</TableCell>
                                                            <TableCell>{data.date}</TableCell>
                                                            <TableCell>{data.time}</TableCell>
                                                            <TableCell>{data.si_number}</TableCell>
                                                            <TableCell>{data.cashier_name}</TableCell>
                                                            <TableCell>{data.total_void_amount_for_transaction.toFixed(2)}</TableCell>
                                                            <TableCell>{data.void_reason}</TableCell>
                                                            <TableCell>{data.approved_by}</TableCell>
                                                            
                                                        </TableRow>
                                                    ))
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
