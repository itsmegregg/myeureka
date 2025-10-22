import React, { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportData from "highcharts/modules/export-data";

// Initialize the exporting module
if (typeof Highcharts === "object") {
    HighchartsExporting(Highcharts);
    HighchartsExportData(Highcharts);
}

export default function HorizontalBarGraph({ items }: { items: any[] }) {
    // Process the data: exclude combo items and sort by total_quantity in descending order
    const processedData = items
        .filter(item => !item.hasOwnProperty('combo_items')) // Exclude combo items
        .sort((a, b) => parseFloat(b.total_quantity) - parseFloat(a.total_quantity)); // Sort from higher to lower

    // Chart options
    // Calculate the height needed to properly display all bars (minimum 400px)
    const chartHeight = Math.max(400, processedData.length * 30); // 30px per item minimum
    
    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        chart: {
            type: "bar", // Horizontal bar chart
            backgroundColor: "transparent",
            height: chartHeight, // Dynamic height based on number of items
            style: {
                fontFamily: "Inter, sans-serif"
            },
            scrollablePlotArea: {
                minHeight: chartHeight
            }
        },
        title: {
            text: "Item Sales by Quantity",
            style: {
                color: "#1a1a1a",
                fontSize: "16px",
                fontWeight: "600"
            }
        },
        xAxis: {
            categories: processedData.map(item => item.product_description),
            title: {
                text: null
            },
            lineColor: "#e5e7eb",
            tickWidth: 0
        },
        yAxis: {
            min: 0,
            title: {
                text: "Quantity Sold",
                align: "high"
            },
            labels: {
                overflow: "justify"
            },
            gridLineColor: "#e5e7eb"
        },
        tooltip: {
            formatter: function() {
                return `<b>${this.x}</b><br/>${this.y} units<br/>Code: ${processedData[this.point.index].product_code}`;
            }
        },
        plotOptions: {
            bar: {
                dataLabels: {
                    enabled: true,
                    format: '{point.y}',
                    style: {
                        fontSize: '11px',
                        fontWeight: '500'
                    }
                },
                color: "#3b82f6", // Blue color for columns
                borderRadius: 3,
                borderWidth: 0
            }
        },
        legend: {
            enabled: false
        },
        credits: {
            enabled: false
        },
        series: [{
            name: "Quantity",
            type: "bar",
            data: processedData.map(item => parseFloat(item.total_quantity))
        }]
    });

    // Set an explicit height for the container
    return (
        <div className="w-full" style={{ height: `${chartHeight}px`, overflow: 'visible' }}>
            <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
                containerProps={{ style: { height: '100%', overflow: 'visible' } }}
            />
        </div>
    );
}