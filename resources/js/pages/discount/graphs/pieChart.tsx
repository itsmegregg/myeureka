import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import HighchartsDrilldown from 'highcharts/modules/drilldown';
import { formatNumber } from '@/lib/formats'; // Assuming this correctly formats currency

// Initialize the exporting modules
HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);
HighchartsDrilldown(Highcharts);

interface DiscountData {
    transaction_date: string;
    discount_code: string;
    total_discount: number;
    [key: string]: string | number; // Allow for dynamic data fields
}

interface PieChartProps {
    data: DiscountData[];
    viewByDate: boolean;
}

export default function PieChart({ data, viewByDate }: PieChartProps) {
    // Moved getRandomFlatUIColor outside useEffect so it's not redefined on every render
    const getRandomFlatUIColor = () => {
        const h = Math.random() * 360;
        const s = 30 + Math.random() * 40;
        const l = 40 + Math.random() * 35;
        return `hsl(${h}, ${s}%, ${l}%)`;
    };

    const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
        // Set chart size and spacing
        chart: {
            type: 'pie',
            height: 500,
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
                                // Keep this responsive rule's format as percentage if desired for small screens
                                format: '{point.percentage:.2f}%'
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
            text: viewByDate ? 'Daily Discount Distribution' : 'Discount Distribution'
        },
        subtitle: {
            text: 'Click the slices to view details' // This subtitle might be less relevant if drilldown is not implemented
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
            filename: 'discount-distribution-by-type'
        },
        plotOptions: {
            series: {
                borderWidth: 0,
                // This dataLabels section applies to all series by default
                // It will be overridden by plotOptions.pie.dataLabels for pie type charts
                dataLabels: {
                    enabled: true,
                    format: '{point.name}: {point.percentage:.2f}%', // This is generic
                    style: {
                        fontWeight: 'normal',
                        textOutline: 'none'
                    }
                }
            },
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                depth: 0,
                showInLegend: true,
                innerSize: '50%',
                dataLabels: {
                    enabled: true,
                    // *** MODIFICATION HERE ***
                    // Format to show name, total discount (formatted), and percentage
                    format: '{point.name}: <b>₱{point.y:,.2f}</b> ({point.percentage:.2f}%)',
                    // Adjust distance as needed. A positive distance places labels outside.
                    // A negative distance (like -30) places them inside.
                    // If you want outside, remove `distance` or set to a positive value (e.g., 20).
                    distance: 20, // Example: distance 20px outside the slice
                    style: {
                        color: 'black', // Often good for outside labels on varied colors
                        textOutline: 'none', // Remove outline for cleaner look
                        fontWeight: 'normal', // Can be 'bold' if desired
                        fontSize: '12px' // Adjust font size as needed
                    },
                    // Add a connector line if labels are outside
                    connectorColor: '#000000', // Black connector lines
                    connectorWidth: 1
                }
            }
        },
        tooltip: {
            pointFormat: '{series.name}: <b>₱{point.y:,.2f}</b> ({point.percentage:.2f}%)'
        },
        credits: {
            enabled: false
        },
        series: []
    });

    useEffect(() => {
        if (data && data.length > 0) {
            let pieData: {name: string; y: number; color: string}[] = [];
            let chartTitle = '';

            if (viewByDate) {
                // Group data by date for date-based pie chart
                const dateMap: {[key: string]: number} = {};

                data.forEach(item => {
                    const date = item.transaction_date;
                    if (!dateMap[date]) {
                        dateMap[date] = 0;
                    }
                    dateMap[date] += Number(item.total_discount);
                });

                // Convert to pie chart data format
                pieData = Object.entries(dateMap).map(([date, total]) => {
                    return {
                        name: date, // Date as name
                        y: total,   // Aggregated total discount for this date
                        color: getRandomFlatUIColor()
                    };
                });

                chartTitle = 'Daily Discount Distribution';
            } else {
                // Standard grouping by discount code
                pieData = data.map(item => {
                    return {
                        name: item.discount_code,
                        y: item.total_discount,
                        color: getRandomFlatUIColor()
                    };
                });

                chartTitle = 'Discount Distribution';
            }

            const filteredPieData = pieData.filter(item => item.y > 0);

            setChartOptions(prevOptions => ({ // Use functional update for setChartOptions
                ...prevOptions, // Keep existing options
                title: { // Update title based on viewByDate
                    ...prevOptions.title,
                    text: chartTitle
                },
                series: [{
                    type: 'pie',
                    name: 'Discount Amount',
                    data: filteredPieData
                }] as Highcharts.SeriesOptionsType[] // Cast to ensure correct type
            }));
        } else {
            // Optional: Reset chart options or display 'no data' message when data is empty
            setChartOptions(prevOptions => ({
                ...prevOptions,
                series: [], // Clear series if no data
                title: {
                    ...prevOptions.title,
                    text: 'No Data Available' // Or a more specific title
                },
                subtitle: {
                    text: 'Please adjust filters' // Or similar
                }
            }));
        }
    }, [data, viewByDate]); // Add viewByDate to dependencies

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