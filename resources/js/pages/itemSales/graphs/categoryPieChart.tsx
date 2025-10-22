import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportData from "highcharts/modules/export-data";
import { SeriesPieOptions, PointOptionsObject } from "highcharts";

// Initialize the exporting modules
if (typeof Highcharts === "object") {
    HighchartsExporting(Highcharts);
    HighchartsExportData(Highcharts);
}

interface CategoryData {
    category_code: string;
    category_description: string;
    product: Array<{
        product_code: string;
        description: string;
        quantity: number;
        net_sales: number;
    }>;
}

interface PieChartProps {
    categories: CategoryData[];
    chartType: 'quantity' | 'sales';
}

interface PiePointOptions extends PointOptionsObject {
    code: string;
    totalQuantity: number;
    totalSales: number;
    productCount: number;
}

export default function CategoryPieChart({ categories, chartType }: PieChartProps) {
    const dataPoints = useMemo(() => {
        if (categories.length === 1) {
            // For single category, show products as pie
            const category = categories[0];
            return category.product.map(product => ({
                name: product.description,
                y: chartType === 'quantity' ? (product.quantity || 0) : (product.net_sales || 0),
                code: product.product_code
            }));
        } else {
            // For multiple categories, show categories
            return categories.map(category => {
                const totalQuantity = category.product.reduce((sum, product) => sum + (product.quantity || 0), 0);
                const totalSales = category.product.reduce((sum, product) => sum + (product.net_sales || 0), 0);

                return {
                    name: category.category_description,
                    y: chartType === 'quantity' ? totalQuantity : totalSales,
                    code: category.category_code,
                    totalQuantity,
                    totalSales,
                    productCount: category.product.length
                };
            });
        }
    }, [categories, chartType]);

    const chartOptions = useMemo<Highcharts.Options>(() => ({
        chart: {
            type: 'pie',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Inter, sans-serif'
            }
        },
        title: {
            text: categories.length === 1 
                ? `Items Sales by ${chartType === 'quantity' ? 'Quantity' : 'Sales'}`
                : chartType === 'quantity' ? 'Category Sales by Quantity' : 'Category Sales by Value',
            style: {
                color: "#1a1a1a",
                fontSize: "16px",
                fontWeight: "600"
            }
        },
        tooltip: {
            pointFormatter: function () {
                if (categories.length === 1) {
                    const point = this as Highcharts.Point;
                    const value = point.y || 0;
                    const formattedValue = chartType === 'quantity' 
                        ? new Intl.NumberFormat('en-US').format(value)
                        : '₱' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                    return `<b>${point.name}</b><br>Value: ${formattedValue}`;
                } else {
                    const point = this as Highcharts.Point & { options: PiePointOptions };
                    const sales = point.options.totalSales;
                    const formattedSales = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sales);
                    return (
                        `<b>${point.name} (${point.options.code})</b><br>` +
                        `Products: ${point.options.productCount}<br>` +
                        `Sales: ₱${formattedSales}`
                    );
                }
            }
        },
        legend: {
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'bottom',
            labelFormatter: function () {
                const point = this as Highcharts.Point & { options: any };
                if (categories.length === 1) {
                    // For single category, show product quantity or sales
                    const value = point.y || 0;
                    const formattedValue = chartType === 'quantity' 
                        ? new Intl.NumberFormat('en-US').format(value)
                        : '₱' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                    return `<span>${point.name}</span><br><span style="color:#636363;">${chartType === 'quantity' ? 'Qty' : 'Sales'}: ${formattedValue}</span>`;
                } else {
                    // For multiple categories
                    const totalSales = point.options.totalSales;
                    const formattedSales = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalSales);
                    return [
                        `<span>${point.name}</span>`,
                        `<span style="color:#636363;">Sales: ₱${formattedSales}</span>`,
                        `<span style="color:#636363;">Products: ${point.options.productCount}</span>`
                    ].join(' · ');
                }
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.2f}%',
                    distance: 20,
                    style: {
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }
                },
                size: '90%',
                showInLegend: true
            }
        },
        credits: {
            enabled: false
        },
        series: [{
            name: chartType === 'quantity' ? 'Quantity' : 'Sales',
            colorByPoint: true,
            type: 'pie',
            data: dataPoints
        } as SeriesPieOptions]
    }), [chartType, dataPoints, categories.length]);

    return (
        <div className="w-full" style={{ height: '1000px' }}>
            <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
            />
        </div>
    );
}
