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
    voids: number;
    transactions: number;
    discounts: number;
    [key: string]: string | number; // Allow for dynamic data fields
}

interface BarGraphProps {
    data: HourlyData[];
}

export default function BarGraph({ data }: BarGraphProps) {
    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        // Set chart size and spacing
        chart: {
            type: 'column',
            zooming: {
                type: 'xy'
            },
            height: '500px',
     
            spacingTop: 10,
            spacingBottom: 10,
            spacingLeft: 10,
            spacingRight: 10,
            reflow: true,
            style: {
                fontFamily: 'inherit'
            }
        },
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 700
                },
                chartOptions: {
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom'
                    },
                    yAxis: [{
                        labels: {
                            align: 'left',
                            x: 0,
                            y: -5
                        },
                        title: {
                            text: ''
                        }
                    }, {
                        labels: {
                            align: 'right',
                            x: 0,
                            y: -5
                        },
                        title: {
                            text: ''
                        }
                    }],subtitle: {
                        text: ''
                    },
                    credits: {
                        enabled: false
                    }
                }
            }]
        },

        title: {
            text: 'Hourly Sales Analysis'
        },
        xAxis: {
            categories: [],
            title: {
                text: 'Hour'
            },
            crosshair: true
        },
        yAxis: [{
            // Primary y-axis for sales and discounts (lines)
            title: {
                text: 'Amount (PHP)',
                style: {
                    color: '#4ade80'
                }
            },
            labels: {
                format: '₱{value}',
                style: {
                    color: '#4ade80'
                }
            }
        }, {
            // Secondary y-axis for transactions and voids (bars)
            title: {
                text: 'Count',
                style: {
                    color: '#3b82f6'
                }
            },
            labels: {
                style: {
                    color: '#3b82f6'
                }
            },
            opposite: true
        }],
        tooltip: {
            shared: true,
            useHTML: true,
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:,.2f}</b></td></tr>',
            footerFormat: '</table>'
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0,
                groupPadding: 0.1
            },
            line: {
                marker: {
                    enabled: true,
                    radius: 4
                }
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
            filename: 'hourly-sales-analysis'
        },
        series: []
    });

    useEffect(() => {
        if (data && data.length > 0) {
            // Extract hours for x-axis categories
            const categories = data.map(item => item.hour);
            
            // Create series data
            const salesData = data.map(item => item.sales);
            const voidsData = data.map(item => item.voids);
            const transactionsData = data.map(item => item.transactions);
            const discountsData = data.map(item => item.discounts);
            
            setChartOptions({
                ...chartOptions,
                xAxis: {
                    ...chartOptions.xAxis,
                    categories
                },
                series: [
                    {
                        name: 'Sales',
                        type: 'line',
                        yAxis: 0,
                        data: salesData,
                        color: '#4ade80', // Green
                        tooltip: {
                            valuePrefix: '₱'
                        },
                        zIndex: 4
                    },
                    {
                        name: 'Voids',
                        type: 'column',
                        yAxis: 1,
                        data: voidsData,
                        color: '#fb923c', // Red-orange
                        tooltip: {
                            valuePrefix: '₱'
                        },
                        zIndex: 2
                    },
                    {
                        name: 'Transactions',
                        type: 'column',
                        yAxis: 1,
                        data: transactionsData,
                        color: '#3b82f6', // Blue
                        zIndex: 1
                    },
                    {
                        name: 'Discounts',
                        type: 'line',
                        yAxis: 0,
                        data: discountsData,
                        color: '#f59e0b', // Amber
                        tooltip: {
                            valuePrefix: '₱'
                        },
                        zIndex: 3
                    }
                ] as any
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