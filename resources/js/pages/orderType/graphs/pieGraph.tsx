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

interface PieGraphProps {
    data: OrderTypeData[];
}

export default function PieGraph({ data }: PieGraphProps) {
    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        chart: {
            type: 'pie',
            options3d: {
                enabled: true,
                alpha: 45,
                beta: 0
            }
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
            filename: 'order-type-distribution-chart'
        },
        title: {
            text: 'Order Type Distribution'
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                depth: 35,
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    style: {
                        color: 'black'
                    }
                }
            }
        },
        series: []
    });

    const getColor = (name: string, index: number) => {
        const colorPalette = [
            '#fc5c65', '#fed330', '#45aaf2', '#2bcbba', '#a55eea',
            '#4b7bec', '#fd79a8', '#00b894', '#e17055', '#0984e3',
            '#badc58', '#f0932b'
        ];
        return colorPalette[index % colorPalette.length];
    };

    useEffect(() => {
        if (data && data.length > 0) {
            const chartData = data
                .filter(item => item.transaction_count > 0)
                .map((item, index) => ({
                    name: item.transaction_type,
                    y: item.transaction_count,
                    color: getColor(item.transaction_type, index)
                }));

            setChartOptions({
                ...chartOptions,
                series: [{
                    type: 'pie',
                    name: 'Transaction Count',
                    data: chartData
                }]
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
