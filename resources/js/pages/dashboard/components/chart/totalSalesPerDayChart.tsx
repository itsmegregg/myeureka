import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import axios from 'axios';
import { useMonthPicker } from '@/store/useMonthPicker';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

// Import Highcharts modules for exporting functionality
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';

// Initialize the modules
HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);
HighchartsOfflineExporting(Highcharts);

interface TotalSalesData {
  total_sales: string | number;
  date_formatted: string;
}

interface Props {
  data: TotalSalesData[] | null;
  loading: boolean;
  error: string | null;
}

const TotalSalesPerDayChart: React.FC<Props> = ({ data, loading, error }) => {
  const { selectedMonth } = useMonthPicker();

  // Prepare Highcharts configuration
  const highchartsOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      borderRadius: 10,
      height: 500,
    },
    title: {
      text: 'Sales Data per Day - ' + new Date(`${format(selectedMonth, 'yyyy-MM')}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      align: 'left',
      style: {
        color: 'var(--color-secondary-foreground)',
        fontSize: '16px',
        fontWeight: 'semibold',
      },
    },
    xAxis: {
      categories: data?.map((item) => item.date_formatted) || [],
      title: {
        text: 'Date',
        style: {
          color: 'var(--color-secondary-foreground)',
        },
      },
      labels: {
        style: {
          color: 'var(--color-secondary-foreground)',
        },
      },
    },
    yAxis: {
      title: {
        text: 'Total Sales',
        style: {
          color: 'var(--color-secondary-foreground)',
        },
      },
      labels: {
        style: {
          color: 'var(--color-secondary-foreground)',
        },
      },
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat:
        '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
        '<td style="padding:0"><b>{point.y:.2f} PHP</b></td></tr>',
      footerFormat: '</table>',
      shared: true,
      useHTML: true,
    },
    plotOptions: {
      column: {
        color: "#eb3b5a", // Use primary color from CSS variable, fallback to default
        pointPadding: 0.2,
        borderWidth: 0,
        borderRadius:3,
      },
    },
    series: [
      {
        name: 'Sales',
        type: 'column',
        data: (data || []).map((item) => {
          const salesValue = item.total_sales;
          const numericValue = typeof salesValue === 'string' 
            ? parseFloat(salesValue) 
            : Number(salesValue);
          return isNaN(numericValue) ? 0 : numericValue;
        }),
      },
    ],
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
          chartOptions: {
            legend: {
              align: 'center',
              verticalAlign: 'bottom',
            },
          },
        },
      ],
    },
    exporting: {
      buttons: {
        contextButton: {
          menuItems: [
            'printChart',
            'downloadPDF',
            'downloadCSV',
            'downloadXLS',
            'downloadPNG',
            'downloadJPEG',
            'downloadSVG',
          ],
        },
      },
    },
  };

  if (loading) {
    return (
      <Card className="border shadow h-full">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48">
            <span className="loading loading-spinner text-primary"></span>
            <p className="mt-2">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-error text-center">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Daily Sales Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={highchartsOptions} height={600} />
      </CardContent>
    </Card>
  );
};

export default TotalSalesPerDayChart;