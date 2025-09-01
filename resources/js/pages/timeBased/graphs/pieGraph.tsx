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

interface PieGraphData {
    name: string;
    value: number;
}

interface PieGraphProps {
    data: PieGraphData[];
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
            filename: 'pie-chart-export'
        },
        title: {
            text: 'Pie Chart'
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
                },
                showInLegend: true
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
                .filter(item => item.value > 0)
                .map((item, index) => ({
                    name: item.name,
                    y: item.value,
                    color: getColor(item.name, index)
                }));

            setChartOptions({
                ...chartOptions,
                series: [{
                    type: 'pie',
                    name: 'Value',
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
