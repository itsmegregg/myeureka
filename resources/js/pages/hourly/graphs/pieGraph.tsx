import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import { formatNumber } from '@/lib/formats';

// Initialize the exporting modules
HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);

interface HourlyData {
    hour: string;
    sales: number;
    [key: string]: string | number; // Allow for dynamic data fields
}

interface PieGraphProps {
    data: HourlyData[];
}

export default function PieGraph({ data }: PieGraphProps) {
    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        // Set chart size and spacing
        chart: {
            type: 'pie',
            height: '500px',
            spacingTop: 10,
            spacingBottom: 10,
            spacingLeft: 10,
            spacingRight: 10,
            reflow: true,
            style: {
                fontFamily: 'inherit'
            },
            options3d: {
                enabled: true,
                alpha: 45,
                beta: 0
            }
        },
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 600
                },
                chartOptions: {
                    legend: {
                        enabled: false
                    },
                    plotOptions: {
                        pie: {
                            dataLabels: {
                                enabled: true,
                                distance: -25,
                                style: {
                                    textOutline: 'none',
                                    fontWeight: 'normal',
                                    fontSize: '10px'
                                },
                                format: '{point.percentage:.1f}%'
                            }
                        }
                    },
                    subtitle: {
                        text: undefined
                    },
                    credits: {
                        enabled: false
                    }
                }
            }]
        },

        title: {
            text: 'Sales Distribution by Hour'
        },
        subtitle: {
            text: 'Click the slices to view details'
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
            filename: 'hourly-sales-distribution'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                depth: 35,
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f}%'
                },
                showInLegend: true
            }
        },
        tooltip: {
            pointFormat: '{series.name}: <b>₱{point.y:,.2f}</b> ({point.percentage:.1f}%)'
        },
        series: []
    });

    useEffect(() => {
        if (data && data.length > 0) {
            // Define a rich color palette
            const colorPalette = [
                '#fc5c65', // Red
                '#fed330', // Yellow
                '#26de81', // Green
                '#45aaf2', // Blue
                '#2bcbba', // Teal
                '#a55eea', // Purple
                '#fd9644', // Orange
                '#4b7bec', // Royal Blue
                '#778ca3', // Blue Gray
                '#d1d8e0', // Light Gray
                '#4b6584', // Dark Blue
                '#16a085', // Green Sea
            ];
            
            // Create pie chart data
            const pieData = data.map((item, index) => {
                return {
                    name: item.hour,
                    y: Number(item.sales), // Ensure sales is a number
                    color: colorPalette[index % colorPalette.length]
                };
            });
            
            // Only include data points with non-zero sales
            const filteredPieData = pieData.filter(item => item.y > 0);
            
            setChartOptions({
                ...chartOptions,
                series: [{
                    type: 'pie',
                    name: 'Sales Amount',
                    data: filteredPieData
                }] as any
            });
        }
    }, [data]);

    return (
        <div className="w-full h-[500px]">
            {data && data.length > 0 ? (
                <div className="w-full h-full">
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={chartOptions}
                        containerProps={{
                            style: {
                                height: '100%',
                                width: '100%'
                            }
                        }}
                    />
                </div>
            ) : (
                <div className="flex items-center justify-center h-[500px]">
                    <p className="text-gray-500">No data available for visualization</p>
                </div>
            )}
        </div>
    );
}
