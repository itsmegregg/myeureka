import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import TextHeader from "@/components/reusable-components/text-header";
import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import CategorySelect from "@/components/public-components/category-select";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle, Loader2, File, FileSpreadsheet } from "lucide-react";
import { useState, useEffect } from "react";
import { useBranchStore } from "@/store/useBranch";
import { useStore } from "@/store/useStore";
import { useDateRange } from "@/store/useDateRange";
import { useCategory } from "@/store/useCategory";
import { format } from "date-fns";
import axios from "axios";
// Import jsPDF and autoTable separately
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

// Extended jsPDF type with autoTable properties
interface ExtendedJsPDF extends jsPDF {
    lastAutoTable?: {
        finalY?: number;
    }
}
import * as XLSX from "xlsx";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-react';
import { useTerminalStore } from "@/store/useTerminal";
import TerminalSelect from "@/components/public-components/terminal-select";
// Interface for combo items
interface ComboItemProps {
    product_code: string;
    description: string;
    total_quantity: number;
    net_sales: number;
}

// Interface for product items
interface ProductProps {
    product_code: string;
    description: string;
    quantity: number;
    net_sales: number;
    combo_items?: ComboItemProps[];
}

// Interface for category items
interface CategoryProps {
    category_code: string;
    category_description: string;
    product: ProductProps[];
}

// Interface for API response
interface ApiResponse {
    data: CategoryProps[];
    meta: {
        total: number;
        from_date: string;
        to_date: string;
        branch: string;
        concept_id: string;
        category: string;
    }
}

export default function PerCategory() {
    const [categories, setCategories] = useState<CategoryProps[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isExcelLoading, setIsExcelLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const {selectedTerminal} = useTerminalStore();
    const { selectedBranch } = useBranchStore();
    const { dateRange: selectedDateRange } = useDateRange();
    const { selectedStore } = useStore();
    const { selectedCategory } = useCategory();
    
    // Format currency
    const formatCurrency = (value: number): string => {
        return 'P' + new Intl.NumberFormat('en-PH', { 
            style: 'decimal', 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };
    
    // Fetch data from API
    const fetchAlldata = async () => {
        setIsFetching(true);
        setError(null);
        
        try {
            const paramsData = {
                branch_id: selectedBranch?.branch_code ?? 'ALL',
                store_id: selectedStore ?? 'ALL',
                from_date: selectedDateRange.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-01-01'),
                to_date: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-12-31'),
                category_code: selectedCategory ?? 'ALL',
                terminal_number: selectedTerminal,
            };
            
            const response = await axios.get<ApiResponse>('/api/item-sales/product-mix-category', {
                params: paramsData
            });
            console.log('Response data:', response.data);
            if (!response.data.data || response.data.data.length === 0) {
                setError('No data found for the selected filters');
                setCategories([]);
            } else {
                setCategories(response.data.data);
                console.log('Fetched categories:', response.data.data.length);
                console.log('Response data:', response.data);
            }
        } catch (err) {
            console.error('Error fetching product mix category data:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
            setCategories([]);
        } finally {
            setIsFetching(false);
        }
    };
    
    // Excel Export Function
    const handleExportExcel = async () => {
        if (categories.length === 0) return;
        
        setIsExcelLoading(true);
        try {
            // Create workbook
            const workbook = XLSX.utils.book_new();
            
            // Prepare data for all categories in a single sheet
            const excelData = [];
            
            // Add headers and metadata
            excelData.push(['Item Sales - Per Category Report']);
            excelData.push(['']);
            excelData.push(['Branch:', selectedBranch?.branch_name || 'All Branches']);
            excelData.push(['Store:', selectedStore || 'All Stores']);
            excelData.push(['Terminal:', selectedTerminal || 'All Terminals']);
            excelData.push(['Category:', selectedCategory || 'All Categories']);
            excelData.push([
                'Period:',
                `${selectedDateRange.from ? format(selectedDateRange.from, 'MMM dd, yyyy') : 'Start'} - ${selectedDateRange.to ? format(selectedDateRange.to, 'MMM dd, yyyy') : 'End'}`
            ]);
            excelData.push(['Generated on:', format(new Date(), 'MMM dd, yyyy hh:mm a')]);
            excelData.push(['']);
            
            // Process each category
            categories.forEach((category, categoryIndex) => {
                // Add spacing between categories if not the first one
                if (categoryIndex > 0) {
                    excelData.push(['']);
                    excelData.push(['']);
                }
                
                // Category information
                excelData.push([`${category.category_description} (${category.category_code}) - ${category.product.length} products`]);
                excelData.push(['']);
                
                // Table headers
                excelData.push(['Product Code', 'Description', 'Quantity', 'Net Sales']);
                
                // Add products and their combo items
                category.product.forEach(product => {
                    excelData.push([
                        product.product_code,
                        product.description,
                        product.quantity,
                        `P${product.net_sales.toFixed(2)}`
                    ]);
                    
                    // Add combo items if any
                    if (product.combo_items && product.combo_items.length > 0) {
                        product.combo_items.forEach(combo => {
                            excelData.push([
                                `- ${combo.product_code}`,
                                combo.description,
                                combo.total_quantity,
                                `P${combo.net_sales.toFixed(2)}`
                            ]);
                        });
                    }
                });
                
                // Add category totals
                const totalQuantity = category.product.reduce((acc, product) => acc + product.quantity, 0);
                const totalNetSales = category.product.reduce((acc, product) => acc + product.net_sales, 0);
                excelData.push(['', 'Category Total', totalQuantity, `P${totalNetSales.toFixed(2)}`]);
            });
            
            // Create the worksheet with all categories
            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            
            // Set column widths
            const columnWidths = [
                { wch: 15 }, // Product Code
                { wch: 45 }, // Description
                { wch: 10 }, // Quantity
                { wch: 15 }  // Net Sales
            ];
            worksheet['!cols'] = columnWidths;
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Per Category Report');
            
            // Generate filename with timestamp and filters
            const branchInfo = selectedBranch?.branch_name ? `_${selectedBranch.branch_name}` : '';
            const storeInfo = selectedStore ? `_${selectedStore}` : '';
            const terminalInfo = selectedTerminal ? `_Terminal${selectedTerminal}` : '';
            const categoryInfo = selectedCategory ? `_${selectedCategory}` : '';
            const filename = `Item_Sales_Per_Category${branchInfo}${storeInfo}${terminalInfo}${categoryInfo}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            
            // Write the workbook and trigger download
            XLSX.writeFile(workbook, filename);
            
        } catch (error) {
            console.error('Error generating Excel:', error);
            alert('Failed to generate Excel file. Please try again.');
        } finally {
            setIsExcelLoading(false);
        }
    };
    
    // PDF Export Function
    const handleExportPDF = async () => {
        if (categories.length === 0) return;
        
        setIsPdfLoading(true);
        try {
            // Initialize PDF document
            const doc = new jsPDF() as ExtendedJsPDF;
            const pageWidth = doc.internal.pageSize.width;
            
            // Add header
            doc.setFontSize(16);
            doc.text('Item Sales - Per Category Report', pageWidth / 2, 15, { align: 'center' });
            
            // Add metadata
            doc.setFontSize(10);
            doc.text(`Branch: ${selectedBranch?.branch_name || 'All Branches'}`, 14, 25);
            doc.text(`Store: ${selectedStore || 'All Stores'}`, 14, 30);
            doc.text(`Terminal: ${selectedTerminal || 'All Terminals'}`, 14, 35);
            doc.text(`Category: ${selectedCategory || 'All Categories'}`, 14, 40);
            doc.text(`Period: ${selectedDateRange.from ? format(selectedDateRange.from, 'MMM dd, yyyy') : 'Start'} - ${selectedDateRange.to ? format(selectedDateRange.to, 'MMM dd, yyyy') : 'End'}`, 14, 45);
            doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy hh:mm a')}`, 14, 50);
            
            // Add page number function
            const addFooter = (doc: any) => {
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10);
                }
            };
            
            let startY = 55; // Increased to account for additional metadata lines
            
            // Loop through each category and create a table
            let currentY = startY;
            
            categories.forEach((category, index) => {
               
                if (index > 0) {
               
                    if (currentY + 40 > doc.internal.pageSize.height - 20) {
                        doc.addPage();
                        currentY = 15;
                    } else {
                        // Add some spacing between tables
                        currentY += 10;
                    }
                }
                
                // Add category header
                doc.setFontSize(12);
                doc.text(`${category.category_description} (${category.category_code}) - ${category.product.length} products`, 14, currentY);
                currentY += 5;
                
                // Prepare table data
                const tableColumn = ["Product Code", "Description", "Quantity", "Net Sales"];
                const tableRows: any[][] = [];
                
                // Add products
                category.product.forEach(product => {
                    tableRows.push([
                        product.product_code,
                        product.description,
                        product.quantity.toLocaleString(),
                        formatCurrency(product.net_sales)
                    ]);
                    
                    // Add combo items if any
                    if (product.combo_items && product.combo_items.length > 0) {
                        product.combo_items.forEach(combo => {
                            tableRows.push([
                                `- ${combo.product_code}`,
                                combo.description,
                                combo.total_quantity.toLocaleString(),
                                formatCurrency(combo.net_sales)
                            ]);
                        });
                    }
                });
                
                // Add category totals
                const totalQuantity = category.product.reduce((acc, product) => acc + product.quantity, 0);
                const totalNetSales = category.product.reduce((acc, product) => acc + product.net_sales, 0);
                tableRows.push([
                    '',
                    'Category Total',
                    totalQuantity.toLocaleString(),
                    formatCurrency(totalNetSales)
                ]);
                
                // Apply autoTable with type casting to avoid TypeScript errors
                autoTable(doc, {
                    startY: currentY,
                    head: [tableColumn],
                    body: tableRows,
                    theme: 'grid',
                    // Use type assertion to avoid TypeScript errors
                    styles: {
                        fontSize: 10
                    } as any,
                    headStyles: { fillColor: [220, 220, 220] },
                    bodyStyles: { },
                    rowPageBreak: 'avoid',
                    margin: { top: 10 },
                    // Bold the last row (category total)
                    didDrawCell: (data) => {
                        if (data.row.index === tableRows.length - 1) {
                            doc.setFontSize(10);
                            doc.setTextColor(0, 0, 0);
                            // Get current font name and set to bold
                            const currentFont = doc.getFont();
                            doc.setFont(currentFont.fontName || 'helvetica', 'bold');
                        }
                    }
                });
                
                // Get the final Y position after the table is rendered
                if (doc.lastAutoTable?.finalY !== undefined) {
                    currentY = doc.lastAutoTable.finalY;
                }
            });
            
            // Add footer with page numbers
            addFooter(doc);
            
            // Generate filename with timestamp and filters
            const branchInfo = selectedBranch?.branch_name ? `_${selectedBranch.branch_name}` : '';
            const storeInfo = selectedStore ? `_${selectedStore}` : '';
            const terminalInfo = selectedTerminal ? `_Terminal${selectedTerminal}` : '';
            const categoryInfo = selectedCategory ? `_${selectedCategory}` : '';
            const filename = `Item_Sales_Per_Category${branchInfo}${storeInfo}${terminalInfo}${categoryInfo}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
            doc.save(filename);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsPdfLoading(false);
        }
    };
    
    // No initial data load - only load on button click
    // Data will only be loaded when the search button is clicked
    
    return (
        <AppLayout>
            <Head title="Item Sales - Per Category" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                               <TextHeader title="Item Sales - Per Category" />
                               <div className="flex flex-col md:flex-row lg:flex-row md:justify-between lg:justify-between gap-4">
                                           <div className="flex flex-wrap items-end gap-2">
                                          <BranchSelect />
                                            <DateRangePickernew />
                                            <CategorySelect />
                                            {/* <TerminalSelect/> */}
                                            <Button
                                                onClick={fetchAlldata}
                                                disabled={isFetching}
                                                className="w-full md:w-auto flex items-center justify-center gap-2 flex-grow"
                                            >
                                                {isFetching ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                                {isFetching ? "Loading..." : "Search"}
                                            </Button>
                                        
                                          </div>
                                          <div className="space-x-2 flex items-center">
                                     
                                            <Button 
                                                onClick={handleExportExcel} 
                                                variant="ghost"
                                                disabled={isExcelLoading || categories.length === 0}
                                                className="flex items-center gap-2"
                                            >
                                                {isExcelLoading ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <IconFileTypeXls className="mr-2 h-4 w-4" />
                                                )}
                                                {isExcelLoading ? "Generating..." : "Excel"}
                                            </Button>
                                            <Button
                                                onClick={handleExportPDF}
                                                variant="ghost"
                                                disabled={isPdfLoading || categories.length === 0}
                                                className="flex items-center gap-2"
                                            >
                                                {isPdfLoading ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <IconFileTypePdf className="mr-2 h-4 w-4" />
                                                )}
                                                {isPdfLoading ? "Generating..." : "PDF"}
                                            </Button>
                                          </div>
                                </div>
                                
                                
                                {error && (
                                    <Alert variant="destructive" className="mt-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                
                                {isFetching ? (
                                    <div className="space-y-4 mt-4 px-2">
                                        <Skeleton className="h-12 w-full" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Skeleton className="h-64 w-full" />
                                            <Skeleton className="h-64 w-full" />
                                        </div>
                                    </div>
                                ) : categories.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 w-full px-0">
                                        {categories.map(category => (
                                            <Card key={category.category_code}>
                                                <CardHeader className="p-4">
                                                    <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center gap-2">
                                                        <span className="truncate">{category.category_description} ({category.category_code})</span>
                                                        <Badge variant="outline" className="w-fit">
                                                            {category.product.length} products
                                                        </Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <div className="w-full">
                                                        <Table className="w-full table-fixed text-xs sm:text-sm">
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-[22%] text-xs sm:text-sm">Code</TableHead>
                                                                    <TableHead className="w-[38%] text-xs sm:text-sm">Description</TableHead>
                                                                    <TableHead className="w-[15%] text-right text-xs sm:text-sm">Qty</TableHead>
                                                                    <TableHead className="w-[25%] text-right text-xs sm:text-sm">Sales</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {category.product.map((product) => (
                                                                    <React.Fragment key={product.product_code}>
                                                                        <TableRow>
                                                                            <TableCell className="font-medium truncate max-w-[60px] sm:max-w-full">{product.product_code}</TableCell>
                                                                            <TableCell className="truncate max-w-[100px] sm:max-w-full">{product.description}</TableCell>
                                                                            <TableCell className="text-right">{product.quantity.toLocaleString()}</TableCell>
                                                                            <TableCell className="text-right text-nowrap">{formatCurrency(product.net_sales)}</TableCell>
                                                                        </TableRow>
                                                                        {product.combo_items && product.combo_items.length > 0 && product.combo_items.map((combo) => (
                                                                            <TableRow key={`${product.product_code}-${combo.product_code}`} className="bg-muted/30">
                                                                                <TableCell className="pl-4 text-xs truncate max-w-[60px] sm:max-w-full">- {combo.product_code}</TableCell>
                                                                                <TableCell className="text-xs truncate max-w-[100px] sm:max-w-full">{combo.description}</TableCell>
                                                                                <TableCell className="text-right text-xs">{combo.total_quantity.toLocaleString()}</TableCell>
                                                                                <TableCell className="text-right text-nowrap text-xs">{formatCurrency(combo.net_sales)}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </React.Fragment>
                                                                ))}
                                                                <TableRow className="bg-muted/70 font-semibold">
                                                                    <TableCell colSpan={2}>Category Total</TableCell>
                                                                    <TableCell className="text-right">
                                                                        {category.product.reduce((acc, product) => acc + product.quantity, 0).toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        {formatCurrency(category.product.reduce((acc, product) => acc + product.net_sales, 0))}
                                                                    </TableCell>
                                                                </TableRow>
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 mt-4 px-2 border rounded-md bg-muted/10">
                                        <p className="text-muted-foreground">No data to display. Use the search button to load data.</p>
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