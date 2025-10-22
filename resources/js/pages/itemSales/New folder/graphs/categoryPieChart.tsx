import React, { useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportData from "highcharts/modules/export-data";
import { SeriesOptionsType, SeriesPieOptions } from "highcharts";

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

export default function CategoryPieChart({ categories, chartType }: PieChartProps) {
    // Process data for the pie chart
    const processData = () => {
        return categories.map(category => {
            // Calculate totals for this category
            const totalQuantity = category.product.reduce((sum, product) => sum + product.quantity, 0);
            const totalSales = category.product.reduce((sum, product) => sum + product.net_sales, 0);
            
            // Return the data point based on the selected chart type
            return {
                name: category.category_description,
                y: chartType === 'quantity' ? totalQuantity : totalSales,
                code: category.category_code,
                totalQuantity,
                totalSales: totalSales.toFixed(2),
                productCount: category.product.length
            };
        });
    };

    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        chart: {
            type: 'pie',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Inter, sans-serif'
            }
        },
        title: {
            text: chartType === 'quantity' ? 'Category Sales by Quantity' : 'Category Sales by Value',
            style: {
                color: "#1a1a1a",
                fontSize: "16px",
                fontWeight: "600"
            }
        },
        tooltip: {
            pointFormat: '<b>{point.name} ({point.code})</b><br>Products: {point.productCount}<br>Quantity: {point.totalQuantity}<br>Sales: ₱{point.totalSales}'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.2f}%'
                },
                size: '80%',
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
            data: processData()
        } as SeriesPieOptions]
    });

    return (
        <div className="w-full" style={{ height: '1000px' }}>
            <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
            />
        </div>
    );
}
