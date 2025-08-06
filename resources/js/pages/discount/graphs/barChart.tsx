import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import { formatNumber } from '@/lib/formats';

// Initialize the exporting modules
HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);

interface DiscountData {
    transaction_date: string;
    discount_code: string;
    total_discount: number;
    [key: string]: string | number; // Allow for dynamic data fields
}

interface BarChartProps {
    data: DiscountData[];
    viewByDate: boolean;
}

export default function BarChart({ data, viewByDate }: BarChartProps) {
    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        chart: {
            type: 'column',
            spacingTop: 10,
            spacingBottom: 10,
            spacingLeft: 10,
            spacingRight: 10,
            height: 500,
            reflow: true,
            style: {
                fontFamily: 'inherit'
            }
        },
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 800 
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
                    }]
                }
            }]
        },
        title: {
            text: viewByDate ? 'Daily Discount Distribution' : 'Discount Distribution'
        },
        xAxis: {
            categories: [],
            title: {
                text: 'Discount Type'
            },
            crosshair: true
        },
        yAxis: [{
            title: {
                text: 'Amount (PHP)',
                style: {
                    color: '#f59e0b'
                }
            },
            labels: {
                format: '₱{value}',
                style: {
                    color: '#f59e0b'
                }
            }
        }],
        tooltip: {
            shared: true,
            useHTML: true,
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>₱{point.y:,.2f}</b></td></tr>',
            footerFormat: '</table>'
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0,
                colorByPoint: true,
                dataLabels: {
                    enabled: true,
                    format: '₱{point.y:,.2f}',
                    style: {
                        fontSize: '10px'
                    }
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
            filename: 'discount-distribution'
        },
        credits: {
            enabled: false
        },
        series: []
    });

    useEffect(() => {
        if (data && data.length > 0) {
            let categories: string[] = [];
            let seriesData: any[] = [];
            let chartTitle: string = '';

            if (viewByDate) {
                const dateGroups: { [key: string]: DiscountData[] } = data.reduce<{ [key: string]: DiscountData[] }>((groups, item) => {
                    const date = item.transaction_date;
                    if (!groups[date]) {
                        groups[date] = [];
                    }
                    groups[date].push(item);
                    return groups;
                }, {});

                const uniqueDiscountCodes = [...new Set(data.map(item => item.discount_code))];
                categories = Object.keys(dateGroups).sort();
                chartTitle = 'Daily Discount Distribution';

                seriesData = uniqueDiscountCodes.map(code => {
                    const discountSeries = {
                        name: code,
                        type: 'column',
                        data: categories.map(date => {
                            const matchingItem = dateGroups[date]?.find(item => item.discount_code === code);
                            return matchingItem ? Number(matchingItem.total_discount) : 0;
                        })
                    };
                    return discountSeries;
                });
            } else {
                categories = data.map(item => item.discount_code);
                chartTitle = 'Discount Distribution';

                seriesData = [{
                    name: 'Discount Amount',
                    type: 'column',
                    colorByPoint: true,
                    data: data.map(item => ({
                        y: item.total_discount,
                        color: `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${40 + Math.random() * 35}%)`
                    }))
                }];
            }

            setChartOptions({
                ...chartOptions,
                title: {
                    text: chartTitle
                },
                xAxis: {
                    ...chartOptions.xAxis,
                    categories
                },
                series: seriesData
            });
        }
    }, [data, viewByDate]);

    return (
        <div className="w-full h-[500px]">
            {data && data.length > 0 ? (
                <HighchartsReact
                    highcharts={Highcharts}
                    options={chartOptions}
                    containerProps={{
                        style: {
                            width: '100%'
                        }
                    }}
                />
            ) : (
                <div className="p-4 w-full h-[500px] flex items-center justify-center">
                    <p className="text-gray-500">No data available for visualization</p>
                </div>
            )}
        </div>
    );
}