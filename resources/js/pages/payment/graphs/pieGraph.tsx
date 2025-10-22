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

interface PieGraphProps {
    data: MergedPaymentData[] | GrandTotalPaymentData[];
}

const getColor = (name: string, index: number) => {
    const colors = ['#058DC7', '#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'];
    return colors[index % colors.length];
};

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
            filename: 'payment-distribution-chart'
        },
        title: {
            text: 'Payment Distribution'
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.percentage:.2f}%</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                depth: 35,
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.2f} %',
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

        const knownColors: { [key: string]: string } = {
            'Cash': colorPalette[0],
            'GCash': colorPalette[1],
            'Card': colorPalette[2],
            'Other': colorPalette[3],
        };

        return knownColors[name] || colorPalette[index % colorPalette.length];
    };

    useEffect(() => {
        if (data && data.length > 0) {
            const isGrandTotalData = (data[0] as GrandTotalPaymentData).payment_type !== undefined;

            let chartData: { name: string; y: number; color: string }[] = [];

            if (isGrandTotalData) {
                chartData = (data as GrandTotalPaymentData[])
                    .filter(item => item.total_amount > 0)
                    .map((item, index) => ({
                        name: item.payment_type,
                        y: item.total_amount,
                        color: getColor(item.payment_type, index)
                    }));
            } else {
                const aggregatedData: { [key: string]: number } = {};

                (data as MergedPaymentData[]).forEach(item => {
                    aggregatedData.Cash = (aggregatedData.Cash || 0) + item.cash;
                    aggregatedData.GCash = (aggregatedData.GCash || 0) + item.gcash;
                    aggregatedData.Card = (aggregatedData.Card || 0) + item.card;
                    aggregatedData.Other = (aggregatedData.Other || 0) + item.other;
                });

                chartData = Object.entries(aggregatedData)
                    .filter(([, value]) => value > 0)
                    .map(([name, y], index) => ({
                        name: name,
                        y: y,
                        color: getColor(name, index)
                    }));
            }

            setChartOptions({
                ...chartOptions,
                series: [{
                    type: 'pie',
                    name: 'Payment Amount',
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