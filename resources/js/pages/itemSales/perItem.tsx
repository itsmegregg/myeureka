import BranchSelect from "@/components/public-components/branch-select";
import TextHeader from "@/components/reusable-components/text-header";

import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Search, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import axios from "axios";
// Import jsPDF and autoTable with dynamic imports to avoid Vite bundling issues
import { jsPDF } from "jspdf";
// Need to import autoTable separately to ensure it's registered as a plugin
import 'jspdf-autotable';
// Add the autoTable plugin to jsPDF
// @ts-ignore
import autoTable from 'jspdf-autotable';
// Import xlsx library for Excel export
import * as XLSX from 'xlsx';

import {  useBranchStore } from "@/store/useBranch";
import { useDateRange } from "@/store/useDateRange";
import { useProduct } from "@/store/useProduct";
import { useStore } from "@/store/useStore";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Pagination removed as we're displaying all data at once
import ProductSelect from "@/components/public-components/product-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";

import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import { useTerminalStore } from '@/store/useTerminal';
import TerminalSelect from "@/components/public-components/terminal-select";

interface ComboItem {
    product_code: string;
    description: string;
    total_quantity: number;
    net_sales: number;
}

interface ProductProps {
    product_code: string;
    product_description: string;
    total_quantity: number;
    total_net_sales: number;
    combo_items?: ComboItem[];
}



export default function PerItem() {

    const columns = [
        {
            accessorKey: "product_code",
            header: "Product Code",
        },
        {
            accessorKey: "product_description",
            header: "Product Description",
        },
        {
            accessorKey: "total_quantity",
            header: "Total Quantity",
        },
        {
            accessorKey: "total_net_sales",
            header: "Total Net Sales",
            cell: ({ row }: { row: { original: ProductProps } }) => {
                const value = row.original.total_net_sales;
                return value === 0 ? '-' : Number(value).toFixed(2);
            },
        },
    ];

    const [productsData, setProductsData] = useState<ProductProps[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isExcelLoading, setIsExcelLoading] = useState(false);

    const {selectedBranch} = useBranchStore();
    const {dateRange: selectedDateRange} = useDateRange();
    const {selectedProduct} = useProduct();
    const {selectedStore} = useStore();
    const {selectedTerminal} = useTerminalStore();
    
    // Fetch data on component mount

    // Used for export functionality
    const fetchAllData = async () => {
        // Prepare parameters for API call
        const paramsData: any = {
            branch_name: selectedBranch?.branch_name ?? 'ALL',
            from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
            to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
            store_name: selectedStore,
            product_code: selectedProduct,
            terminal_number: selectedTerminal,
        };
        
        // Use the same endpoint that now returns all data
        const response = await axios.get('/api/item-sales/product-mix', {
            params: paramsData
        });
        
        if (!response.data.data || response.data.data.length === 0) {
            throw new Error('No data to export');
        }
        
        return response.data;
    };

    const productMixData = async () => {
        setIsLoading(true);
        const paramsData = {
            branch_name: selectedBranch?.branch_name ?? 'ALL',
            from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
            to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
            product_code: selectedProduct,
            store_name: selectedStore ?? 'ALL',
            terminal_number: selectedTerminal ?? 'ALL'
        }
        
        try {
            // Use the same endpoint as fetchAllData to get all items at once
            const response = await axios.get('/api/item-sales/product-mix', {
                params: paramsData
            });
            
            // Set products data from response
            setProductsData(response.data.data || []);
            
        } catch (error) {
            console.error("Failed to fetch products:", error);
            setProductsData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Pagination has been removed as we're displaying all data at once

    // Function to export data to PDF
    const handleExportPDF = async () => {
        try {
            setIsPdfLoading(true);
            
            const { data, meta } = await fetchAllData();
            
            // Create PDF document
            const doc = new jsPDF();
            
            // Add title and metadata
            doc.setFontSize(16);
            doc.text('Item Sales - Per Item Report', 14, 20);
            
            // Add metadata
            doc.setFontSize(10);
            let yPos = 30;
            
            doc.text(`Date Range: ${format(new Date(meta.from_date), 'MMM dd, yyyy')} to ${format(new Date(meta.to_date), 'MMM dd, yyyy')}`, 14, yPos);
            yPos += 6;
            
            if (selectedBranch) {
                doc.text(`Branch: ${selectedBranch.branch_name || 'All Branches'}`, 14, yPos);
                yPos += 6;
            }
            
            if (selectedStore) {
                doc.text(`Store: ${selectedStore || 'All Stores'}`, 14, yPos);
                yPos += 6;
            }
            
            if (selectedProduct) {
                doc.text(`Product: ${selectedProduct || 'All Products'}`, 14, yPos);
                yPos += 6;
            }
            
            if (selectedTerminal) {
                doc.text(`Terminal: ${selectedTerminal || 'All Terminals'}`, 14, yPos);
                yPos += 6;
            }
            
            // Prepare table data
            const tableData: any[] = [];
            
            // Add products and their combo items
            data.forEach((product: any) => {
                tableData.push([
                    product.product_code,
                    product.product_description,
                    product.total_quantity,
                    Number(product.total_net_sales).toFixed(2)
                ]);
                
                // Add combo items if any
                if (product.combo_items && product.combo_items.length > 0) {
                    product.combo_items.forEach((combo: any) => {
                        tableData.push([
                            `  - ${combo.product_code}`,
                            `  ${combo.description}`,
                            combo.total_quantity,
                            Number(combo.net_sales).toFixed(2)
                        ]);
                    });
                }
            });
            
            // Generate the table using the imported autoTable function
            autoTable(doc, {
                startY: yPos,
                head: [['Product Code', 'Product Description', 'Total Quantity', 'Total Net Sales']],
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
            doc.save(`Item_Sales_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
        } finally {
            setIsPdfLoading(false);
        }
    };
    
    const handleExportExcel = async () => {
        try {
            setIsExcelLoading(true);
            
            const { data, meta } = await fetchAllData();
            
            // Format data for Excel
            const excelData = [];
            
            // Add header row
            excelData.push(['Product Code', 'Product Description', 'Total Quantity', 'Total Net Sales']);
            
            // Add products and their combo items
            data.forEach((product: any) => {
                excelData.push([
                    product.product_code,
                    product.product_description,
                    product.total_quantity,
                    Number(product.total_net_sales).toFixed(2)
                ]);
                
                // Add combo items if any
                if (product.combo_items && product.combo_items.length > 0) {
                    product.combo_items.forEach((combo: any) => {
                        excelData.push([
                            `  - ${combo.product_code}`,
                            `  ${combo.description}`,
                            combo.total_quantity,
                            Number(combo.net_sales).toFixed(2)
                        ]);
                    });
                }
            });
            
            // Create a worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            
            // Add metadata at the top
            XLSX.utils.sheet_add_aoa(ws, [
                ['Item Sales - Per Item Report'],
                [`Date Range: ${format(new Date(meta.from_date), 'MMM dd, yyyy')} to ${format(new Date(meta.to_date), 'MMM dd, yyyy')}`],
                selectedBranch ? [`Branch: ${selectedBranch.branch_name || 'All Branches'}`] : [],
                selectedStore ? [`Store: ${selectedStore || 'All Stores'}`] : [],
                selectedProduct ? [`Product: ${selectedProduct || 'All Products'}`] : [],
                [''],  // Empty row before data
            ], { origin: 'A1' });
            
            // Create workbook and add the worksheet
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Item Sales Report');
            
            // Generate Excel file and trigger download
            XLSX.writeFile(wb, `Item_Sales_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
            
        } catch (error) {
            console.error('Error exporting Excel:', error);
        } finally {
            setIsExcelLoading(false);
        }
    };

    return (
        <AppLayout>
             <Head title="Item Sales - Per Item" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Item Sales - Per Item" />
                                    <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <BranchSelect />
                                        <DateRangePickernew/>
                                        <ProductSelect/>
                                        {/* <TerminalSelect/> */}
                                        <Button onClick={() => {
                                            productMixData();
                                        }}  disabled={isLoading}
                                            className="w-full md:w-auto flex items-center justify-center gap-2 flex-grow"
                                        >
                                        <span>
                                            {isLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search/>
                                            )}
                                        </span>Search
                                        </Button>
                                        </div>
                                        <div className="space-x-2 flex items-center">
                                       
                                        <Button 
                                            variant="ghost" 
                                            onClick={handleExportExcel}
                                            disabled={isExcelLoading || !productsData || productsData.length === 0}
                                        >
                                            {isExcelLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Exporting...
                                                </>
                                            ) : (
                                                <>
                                                    <IconFileTypeXls className="mr-2 h-4 w-4" />
                                                    Excel
                                                </>
                                            )}
                                        </Button>

                                        <Button 
                                        variant="ghost" 
                                        onClick={handleExportPDF} 
                                        disabled={isPdfLoading || !productsData || productsData.length === 0}
                                            >
                                        {isPdfLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <IconFileTypePdf className="mr-2 h-4 w-4" />
                                                PDF
                                            </>
                                        )}
                                        </Button>
                                    </div>
                                    </div>
                                    <div>
                                        <div className="rounded-md border">
                                          
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Product Code</TableHead>
                                                        <TableHead>Product Description</TableHead>
                                                        <TableHead>Total Quantity</TableHead>
                                                        <TableHead>Total Net Sales</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {isLoading ? (
                                                        // Loading skeleton rows
                                                        [...Array(10)].map((_, i) => (
                                                            <TableRow key={`loading-${i}`}>
                                                                <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                                                <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                                                <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                                                <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : productsData && productsData.length > 0 ? (
                                                        productsData.flatMap((item, index) => {
                                                            // Create an array with the main product row
                                                            const rows = [
                                                                <TableRow key={`product-${index}`}>
                                                                    <TableCell>{item.product_code}</TableCell>
                                                                    <TableCell>{item.product_description}</TableCell>
                                                                    <TableCell>{item.total_quantity}</TableCell>
                                                                    <TableCell>{item.total_net_sales === 0 ? '-' : Number(item.total_net_sales).toFixed(2)}</TableCell>
                                                                </TableRow>
                                                            ];
                                                            
                                                            // If this product has combo items, add them as sub-rows
                                                            if (item.combo_items && item.combo_items.length > 0) {
                                                                item.combo_items.forEach((comboItem, comboIndex) => {
                                                                    rows.push(
                                                                        <TableRow key={`combo-${index}-${comboIndex}`} className="bg-primary-foreground">
                                                                            <TableCell className="pl-8">└ {comboItem.product_code}</TableCell>
                                                                            <TableCell className="italic">{comboItem.description}</TableCell>
                                                                            <TableCell>{comboItem.total_quantity}</TableCell>
                                                                            <TableCell>{comboItem.net_sales === 0 ? '-' : Number(comboItem.net_sales).toFixed(2)}</TableCell>
                                                                        </TableRow>
                                                                    );
                                                                });
                                                            }
                                                            
                                                            return rows;
                                                        })
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="h-24 text-center">No results found.</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                         
                                        </div>
                                        {/* Result count display */}
                                        <div className="flex items-center justify-between py-4">
                                            <div>
                                                {productsData.length > 0 && (
                                                    <p className="text-sm text-gray-700">
                                                        Showing <span className="font-medium">{productsData.length}</span> results
                                                    </p>
                                                )}
                                            </div>
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