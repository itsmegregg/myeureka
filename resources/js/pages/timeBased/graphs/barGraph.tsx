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

interface SeriesData {
    name: string;
    data: number[];
}

interface BarGraphData {
    categories: string[];
    series: SeriesData[];
}

interface BarGraphProps {
    data: BarGraphData;
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
            filename: 'bar-chart-export'
        },
        title: {
            text: 'Transaction Types per Hour'
        },
        xAxis: {
            categories: [],
            title: {
                text: 'Hour'
            },
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Transaction Count'
            }
        },
        legend: {
            enabled: true
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
        if (data && data.categories.length > 0) {
            const seriesWithOptions: Highcharts.SeriesOptionsType[] = data.series.map(s => ({
                ...s,
                type: 'column',
            }));

            setChartOptions({
                ...chartOptions,
                xAxis: {
                    ...chartOptions.xAxis,
                    categories: data.categories,
                },
                series: seriesWithOptions,
            });
        }
    }, [data]);

    return (
        <div className="w-full h-[500px]">
            {data && data.categories.length > 0 ? (
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
