import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import { formatNumber } from '@/lib/formats';
import { MergedPaymentData } from './types';

// Initialize the exporting module
if (typeof Highcharts === 'object') {
    HighchartsExporting(Highcharts);
    HighchartsExportData(Highcharts);
    HighchartsOfflineExporting(Highcharts);
}

interface GrandTotalPaymentData {
    payment_type: string;
    total_amount: number;
}

interface BarGraphProps {
    data: MergedPaymentData[] | GrandTotalPaymentData[];
}

export default function BarGraph({ data }: BarGraphProps) {
    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        chart: {
            type: 'column'
        },
        exporting: {
            enabled: true,
            buttons: {
                contextButton: {
                    menuItems: [
                        'downloadPNG',
                        'downloadJPEG',
                        'downloadPDF',
                        'downloadSVG',
                        'separator',
                        'downloadCSV',
                        'downloadXLS'
                    ]
                }
            },
            filename: 'payment-summary-chart'
        },
        title: {
            text: 'Payment Summary by Payment Method'
        },
        xAxis: {
            categories: [],
            title: {
                text: 'Payment Type'
            },
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Amount (PHP)'
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>₱{point.y:.2f}</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0
            }
        },
        series: []
    });

    useEffect(() => {
        if (data && data.length > 0) {
            // Determine if data is MergedPaymentData or GrandTotalPaymentData
            const isGrandTotalData = (data[0] as GrandTotalPaymentData).payment_type !== undefined;

            let categories: string[] = [];
            let seriesData: number[] = [];

            if (isGrandTotalData) {
                categories = (data as GrandTotalPaymentData[]).map(item => item.payment_type);
                seriesData = (data as GrandTotalPaymentData[]).map(item => item.total_amount);
            } else {
                // This part remains for the daily merged data, though it won't be used directly for the bar graph now
                // It's kept for completeness if the graph ever needs to show daily merged data again
                categories = (data as MergedPaymentData[]).map(item => item.date);
                // For daily merged data, we'd typically have multiple series (cash, gcash, etc.)
                // For a single bar graph showing total per payment type, we'll need to adapt
                // For now, we'll assume this graph is primarily for grand totals when merged
            }

            // Define a rich color palette with 12 distinct colors
            const colorPalette = [
                '#fc5c65', // Red
                '#fed330', // Yellow
                '#45aaf2', // Blue
                '#2bcbba', // Green
                '#a55eea', // Purple
                '#4b7bec', // Indigo
                '#fd79a8', // Pink
                '#00b894', // Emerald
                '#e17055', // Orange
                '#0984e3', // Light Blue
                '#badc58', // Light Green
                '#f0932b', // Dark Orange
            ];
            
            // For grand total data, create a single series
            const series: Highcharts.SeriesOptionsType[] = [{
                name: 'Total Amount',
                data: seriesData,
                type: 'column',
                colorByPoint: true, // Assign different colors to each column
                colors: colorPalette // Use the defined color palette
            }];

            setChartOptions({
                ...chartOptions,
                xAxis: {
                    ...chartOptions.xAxis,
                    categories: categories,
                    title: { text: isGrandTotalData ? 'Payment Type' : 'Date' } // Update x-axis title dynamically
                },
                series: series,
                title: {
                    text: isGrandTotalData ? 'Grand Total by Payment Type' : 'Payment Summary by Payment Method'
                }
            });
        }
    }, [data]);

    return (
        <div className="w-full h-[500px]">
            {data && data.length > 0 ? (
                <HighchartsReact
                    highcharts={Highcharts}
                    options={chartOptions}
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for visualization</p>
                </div>
            )}
        </div>
    );
}