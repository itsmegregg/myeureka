import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/layouts/app-layout";
import { useBranchStore } from "@/store/useBranch";
import { Head } from "@inertiajs/react";
import axios from "axios";
import { format } from "date-fns";
import { FileDown, Loader2, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from "react";

import { useStore } from "@/store/useStore";
import { useDateRange } from "@/store/useDateRange";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import CategorySelect from "@/components/public-components/category-select";
import { useCategory } from "@/store/useCategory";

interface FastMovingItem {
    category_code: string;
    category_name: string;
    product_code: string;
    product_name: string;
    total_quantity_sold: number;
}

export default function FastMovingIndex() {
    const [loading, setLoading] = useState<boolean>(false);
    const [exportLoading, setExportLoading] = useState<boolean>(false);
    const [fastMovingData, setFastMovingData] = useState<FastMovingItem[]>([]);
    const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const { dateRange } = useDateRange();
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { selectedCategory} = useCategory();
    
    // Helper function to format currency
    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-PH').format(amount);
    };
    
    // Load data when component mounts or sort order changes

    // Handle sort order change
    const handleSortOrderChange = (value: string) => {
        setSortOrder(value as 'DESC' | 'ASC');
        // Fetch will be triggered by the useEffect
    };

    const fetchFastMovingData = async () => {
        setLoading(true);
        try {

            // Extract branch name as string (handle case where it's an object)
            const branchName = selectedBranch?.branch_name || null;
            
            const params = {
                branch_name: branchName,
                store_name: selectedStore ?? 'ALL',
                from_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
                to_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
                category_code: selectedCategory ?? 'ALL',
            };
            
            // Log the parameters
            console.log('Request params:', params);
            console.log(`Query string: branch_name=${branchName || ''}&store_name=${selectedStore || ''}&from_date=${dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}&to_date=${dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}&category_code=${selectedCategory || ''}`);
            
            const response = await axios.get('/api/fastmoving', {
                params: {
                    branch_name: branchName,
                    store_name: selectedStore,
                   from_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
                   to_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
                   category_code: selectedCategory ?? 'ALL',
                    }
            });
            
            if (response.data.status === 'success') {
                const data = response.data.data;
                // Sort the data based on the selected sort order
                const sortedData = [...data].sort((a, b) => {
                    if (sortOrder === 'ASC') {
                        return a.total_quantity_sold - b.total_quantity_sold;
                    } else {
                        return b.total_quantity_sold - a.total_quantity_sold;
                    }
                });
                setFastMovingData(sortedData);
                console.log(sortedData);
            } else {
                console.error('Error fetching fast moving data:', response.data);
            }
        } catch (error) {
            console.error('Error fetching fast moving data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleExportExcel = async () => {
        setExportLoading(true);
        try {
            // Prepare data for export
            const exportData = fastMovingData.map((item, index) => ({
                'Rank': index + 1,
                'Category Code': item.category_code,
                'Category Name': item.category_name,
                'Product Code': item.product_code,
                'Description': item.product_name,
                'Quantity': formatAmount(item.total_quantity_sold)
            }));
            
            // Create Excel workbook
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `${sortOrder === 'DESC' ? 'Popular' : 'Worst'} Moving Products`);
            
            // Get date range for filename
            const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
            const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
            
            // Export file
            XLSX.writeFile(workbook, `${sortOrder === 'DESC' ? 'popular' : 'worst'}_moving_products_${fromDate}_to_${toDate}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
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
            doc.text(`${sortOrder === 'DESC' ? 'Popular' : 'Worst'} Moving Products Report`, 14, 15);
            
            // Add date range
            const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
            const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
            doc.setFontSize(10);
            doc.text(`From: ${fromDate} To: ${toDate}`, 14, 22);
            
            // Branch and Store filter info
            const branchInfo = `Branch: ${selectedBranch?.branch_name || 'ALL'}`;
            const storeInfo = `Store: ${selectedStore || 'ALL'}`;
            doc.text(branchInfo + ' | ' + storeInfo, 14, 28);
            
            // Prepare table data
            const tableData = fastMovingData.map((item, index) => [
                (index + 1).toString(),
                item.category_code,
                item.category_name,
                item.product_code,
                item.product_name,
                formatAmount(item.total_quantity_sold)
            ]);
            
            // Create table
            autoTable(doc, {
                head: [['Rank', 'Category Code','Category Name','Product Code', 'Description', 'Quantity']],
                body: tableData,
                startY: 35,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 4 },
                columnStyles: {
                    0: { halign: 'center' },
                    3: { halign: 'right' }
                },
                tableWidth: 'auto'
            });
            
            // Generate file name with date range
            const fileName = `${sortOrder === 'DESC' ? 'popular' : 'worst'}_moving_products_${fromDate}_to_${toDate}.pdf`;
            
            // Save the PDF
            doc.save(fileName);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Fast Moving Products" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title={`${sortOrder === 'DESC' ? 'Popular' : 'Worst'} Moving Products`} />
                                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        
                                        <DateRangePickernew />
                                        <CategorySelect/>
                                        <Button onClick={fetchFastMovingData} disabled={loading}>
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
                                        <div className="flex flex-col">
                                            {/* <h3 className="text-sm font-medium mb-1">Sort by:</h3> */}
                                            <RadioGroup
                                                className="flex items-center space-x-4 border p-2 rounded-md"
                                                value={sortOrder}
                                                onValueChange={handleSortOrderChange}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="DESC" id="popular"/>
                                                    <Label htmlFor="popular" className="font-medium">Popular (Most Sold)</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="ASC" id="worst" />
                                                    <Label htmlFor="worst" className="font-medium">Worst (Least Sold)</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    </div>
                                    <div className="space-x-2 flex items-center">
                                        <Button 
                                            onClick={handleExportExcel} 
                                            variant="ghost"
                                            disabled={exportLoading || fastMovingData.length === 0}
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
                                            disabled={exportLoading || fastMovingData.length === 0}
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
                                    <ScrollArea className="h-[calc(100vh-250px)] w-full">
                                        <Table>
                                        <TableHeader className="sticky-header">
                                            <TableRow>
                                                <TableHead className="w-20 text-center">Rank</TableHead>
                                                <TableHead>Category Code</TableHead>
                                                <TableHead>Category Name</TableHead>
                                                <TableHead>Product Code</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Quantity</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center">
                                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                        <p>Loading data...</p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : fastMovingData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center">
                                                        No data available
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                fastMovingData.map((item, index) => (
                                                    <TableRow key={item.product_code}>
                                                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                                        <TableCell>{item.category_code}</TableCell>
                                                        <TableCell>{item.category_name}</TableCell>
                                                        <TableCell>{item.product_code}</TableCell>
                                                        <TableCell>{item.product_name}</TableCell>
                                                        <TableCell className="text-right">{formatAmount(item.total_quantity_sold)}</TableCell>
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
