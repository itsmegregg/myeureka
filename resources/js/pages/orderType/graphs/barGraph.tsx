import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';

if (typeof Highcharts === 'object') {
    HighchartsExporting(Highcharts);
    HighchartsExportData(Highcharts);
    HighchartsOfflineExporting(Highcharts);
}

interface OrderTypeData {
    transaction_type: string;
    transaction_count: number;
}

interface BarGraphProps {
    data: OrderTypeData[];
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
            filename: 'order-type-summary-chart'
        },
        title: {
            text: 'Order Type Summary'
        },
        xAxis: {
            categories: [],
            title: {
                text: 'Transaction Type'
            },
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Count'
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y}</b></td></tr>',
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
            const categories = data.map(item => item.transaction_type);
            const seriesData = data.map(item => item.transaction_count);

            const colorPalette = [
                '#fc5c65', '#fed330', '#45aaf2', '#2bcbba', '#a55eea',
                '#4b7bec', '#fd79a8', '#00b894', '#e17055', '#0984e3',
                '#badc58', '#f0932b'
            ];

            const series: Highcharts.SeriesOptionsType[] = [{
                name: 'Transaction Count',
                data: seriesData,
                type: 'column',
                colorByPoint: true,
                colors: colorPalette
            }];

            setChartOptions({
                ...chartOptions,
                xAxis: {
                    ...chartOptions.xAxis,
                    categories: categories
                },
                series: series
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
