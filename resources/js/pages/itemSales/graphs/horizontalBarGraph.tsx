import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface ChartData {
    name: string;
    y: number;
}

interface HorizontalBarGraphProps {
    data: ChartData[];
    title: string;
}

const HorizontalBarGraph: React.FC<HorizontalBarGraphProps> = ({ data, title }) => {
    const options: Highcharts.Options = {
        chart: {
            type: 'bar',
        },
        title: {
            text: title,
        },
        xAxis: {
            categories: data.map(item => item.name),
            title: {
                text: null,
            },
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Total Net Sales',
                align: 'high',
            },
            labels: {
                overflow: 'justify',
            },
        },
        tooltip: {
            valueSuffix: ' ',
        },
        plotOptions: {
            bar: {
                dataLabels: {
                    enabled: true,
                },
                color: 'hsl(var(--primary))' // Using shadcn primary color
            },
        },
        legend: {
            enabled: false
        },
        credits: {
            enabled: false,
        },
        series: [
            {
                type: 'bar',
                name: 'Total Net Sales',
                data: data.map(item => item.y),
            },
        ],
    };

    return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default HorizontalBarGraph;
