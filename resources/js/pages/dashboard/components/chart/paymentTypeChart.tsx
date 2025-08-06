import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import axios from 'axios';
import { useMonthPicker } from '@/store/useMonthPicker';
import { formatCurrency } from '@/lib/formats';
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

interface PaymentTypeData {
  payment_type  : string;
  amount: string;
}

interface Props {
  data: PaymentTypeData[] | null;
  loading: boolean;
  error: string | null;
}

const PaymentTypeChart: React.FC<Props> = ({ data, loading, error }) => {
  const { selectedMonth } = useMonthPicker();
  
  // Sort data by value in descending order if data exists
  const sortedData = data ? [...data].sort((a, b) => 
    parseFloat(b.amount.replace(/,/g, '')) - parseFloat(a.amount.replace(/,/g, ''))
  ) : [];

  // Prepare data for the pie chart
  const labels = sortedData.map((item) => item.payment_type);
  const values = sortedData.map((item) => parseFloat(item.amount.replace(/,/g, '')));

  // Calculate total for percentage display
  const total = values.reduce((sum, value) => sum + value, 0);

  // Prepare Highcharts configuration
  const highchartsOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 500,
      borderRadius: 10,
    },
    title: {
      text: 'Payment Methods Distribution - ' + new Date(`${format(selectedMonth, 'yyyy-MM')}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      align: 'left',
      style: {
        color: 'var(--color-secondary-foreground)',
        fontSize: '16px',
        fontWeight: 'semibold',
      },
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat:
        '<tr><td style="color:black;padding:0">{series.name}: </td>' +
        '<td style="padding:0"><b>{point.y:.2f} PHP</b></td></tr>',
      footerFormat: '</table>',
      shared: true,
      useHTML: true,
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f} %',
          style: {
            color: 'black',
          },
        },
        showInLegend: true,
      },
    },
    legend: {
      labelFormatter: function () {
        const index = this.index !== undefined ? this.index : 0;
        const value = values[index] || 0;
        return `${this.name}: P${value}`;
      },
      itemStyle: {
        color: 'var(--color-secondary-foreground)',
      },    
    },
    series: [
      {
        name: 'Payment Methods',
        type: 'pie',
        color: 'var(--color-primary)',
        data: sortedData.map((item) => ({
          name: item.payment_type,
          y: parseFloat(item.amount.replace(/,/g, ''))
        }))
      }
    ],
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 480,
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
          ]
        }
      }
    }
  };

  if (loading) {
    return (
      <Card className="border shadow p-6 h-full">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48">
            <span className="loading loading-spinner text-primary"></span>
            <p className="mt-2">Loading payment data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className=" h-full">
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

  if (sortedData.length === 0) {
    return (
      <Card className=" h-full">
        <CardHeader>
          <CardTitle>No Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <p>No payment data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={highchartsOptions} />
      </CardContent>
    </Card>
  );
};

export default PaymentTypeChart;