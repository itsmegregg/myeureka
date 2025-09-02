import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import { Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useBranchStore } from "@/store/useBranch";
import { useDateRange } from "@/store/useDateRange";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, PieChart } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import BarGraph from "./graphs/barGraph";
import PieGraph from "./graphs/pieGraph";

interface TimeBasedData {
    hour: string;
    total_guests: number;
    [key: string]: any; // Allow dynamic keys for transaction types
}

export default function TimeBased() {
    const { selectedBranch } = useBranchStore();
    const { dateRange } = useDateRange();
    const [data, setData] = useState<TimeBasedData[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isBarGraphOpen, setIsBarGraphOpen] = useState(false);
    const [isPieGraphOpen, setIsPieGraphOpen] = useState(false);

    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableHeaders = ['Time', 'Total Guests', ...headers];
        const tableData = data.map(row => [
            row.hour,
            row.total_guests,
            ...headers.map(header => row[header] || 0)
        ]);

        autoTable(doc, {
            head: [tableHeaders],
            body: tableData,
            didDrawPage: function (data) {
                doc.setFontSize(20);
                doc.setTextColor(40);
                doc.text("Time Based Report", data.settings.margin.left, 22);

                doc.setFontSize(10);
                const branchText = `Branch: ${selectedBranch?.branch_name ?? 'ALL'}`;
                const dateText = `Date Range: ${dateRange.from ? format(dateRange.from, 'MM/dd/yyyy') : ''} - ${dateRange.to ? format(dateRange.to, 'MM/dd/yyyy') : ''}`;
                doc.text(branchText, data.settings.margin.left, 30);
                doc.text(dateText, data.settings.margin.left, 35);
            },
            margin: { top: 40 },
        });

        doc.save(`Time Based Report ${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const exportToExcel = () => {
        const excelData = data.map(row => {
            const rowData: { [key: string]: any } = {
                'Time': row.hour,
                'Total Guests': row.total_guests,
            };
            headers.forEach(header => {
                rowData[header] = row[header] || 0;
            });
            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Based Report');
        XLSX.writeFile(workbook, `Time Based Report ${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const handleSearch = async () => {
        if (!dateRange.from || !dateRange.to) {
            return;
        }
        setIsLoading(true);
        try {
            const response = await axios.get('/api/sales/time-based', {
                params: {
                    branch_name: selectedBranch?.branch_name ?? 'ALL',
                    from_date: format(dateRange.from, 'yyyy-MM-dd'),
                    to_date: format(dateRange.to, 'yyyy-MM-dd'),
                },
            });
            const responseData = response.data.data;
            setData(responseData);

            if (responseData.length > 0) {
                const firstRow = responseData[0];
                const dynamicHeaders = Object.keys(firstRow).filter(key => key !== 'hour' && key !== 'total_guests');
                setHeaders(dynamicHeaders);
            }

        } catch (error) {
            console.error('Error fetching time-based data:', error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Time Based" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Time Based" />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        <DateRangePickernew />
                                        <Button onClick={handleSearch} disabled={isLoading}>
                                            <Search className="mr-2 h-4 w-4" />
                                            {isLoading ? 'Searching...' : 'Search'}
                                        </Button>


                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            onClick={exportToExcel} 
                                            variant="ghost"
                                            disabled={isLoading || data.length === 0}
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
                                            disabled={isLoading || data.length === 0}
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

                                <div className="flex items-center gap-2">
                                        <Dialog open={isBarGraphOpen} onOpenChange={setIsBarGraphOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    disabled={data.length === 0}
                                                >
                                                    <BarChart className="mr-2 h-4 w-4" />
                                                    Bar Graph
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Total Guests per Hour</DialogTitle>
                                                </DialogHeader>
                                                <BarGraph data={{
                                                    categories: data.map(item => item.hour),
                                                    series: headers.map(header => ({
                                                        name: header,
                                                        data: data.map(item => item[header] || 0)
                                                    }))
                                                }} />
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog open={isPieGraphOpen} onOpenChange={setIsPieGraphOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    disabled={data.length === 0}
                                                >
                                                    <PieChart className="mr-2 h-4 w-4" />
                                                    Pie Graph
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Transaction Type Distribution</DialogTitle>
                                                </DialogHeader>
                                                <PieGraph data={headers.map(header => ({
                                                    name: header,
                                                    value: data.reduce((acc, row) => acc + (row[header] || 0), 0)
                                                }))} />
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                <div className="rounded-md overflow-hidden border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Total Guests</TableHead>
                                                {headers.map(header => (
                                                    <TableHead key={header}>{header}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={headers.length + 2}>
                                                        <Skeleton className="h-8 w-full" />
                                                    </TableCell>
                                                </TableRow>
                                            ) : data.length > 0 ? (
                                                data.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{row.hour}</TableCell>
                                                        <TableCell>{row.total_guests}</TableCell>
                                                        {headers.map(header => (
                                                            <TableCell key={header}>{row[header] || 0}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={headers.length + 2} className="text-center">
                                                        No data available.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
