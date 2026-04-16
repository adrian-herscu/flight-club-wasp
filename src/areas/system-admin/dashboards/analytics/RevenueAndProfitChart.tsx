import { ApexOptions } from "apexcharts";
import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import {
  ChartContainer,
  ChartHeader,
  ChartLegendGroup,
  ChartLegendItem,
  ChartLegendTitle,
  ChartLegendSubtitle,
  ChartTimePeriodSelector,
  ChartTimePeriodButtonGroup,
  ChartTimePeriodButton,
  ChartArea,
} from "../../../../client/components/patterns/AdminAnalyticsPatterns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DailyStatsProps = { weeklyStats?: any[]; isLoading?: boolean };


const options: ApexOptions = {
  legend: {
    show: false,
    position: "top",
    horizontalAlign: "left",
  },
  colors: ["#3C50E0", "#80CAEE"],
  chart: {
    fontFamily: "system-ui, sans-serif",
    height: 335,
    type: "area",
    dropShadow: {
      enabled: true,
      color: "#623CEA14",
      top: 10,
      blur: 4,
      left: 0,
      opacity: 0.1,
    },

    toolbar: {
      show: false,
    },
  },
  responsive: [
    {
      breakpoint: 1024,
      options: {
        chart: {
          height: 300,
        },
      },
    },
    {
      breakpoint: 1366,
      options: {
        chart: {
          height: 350,
        },
      },
    },
  ],
  stroke: {
    width: [2, 2],
    curve: "straight",
  },
  // labels: {
  //   show: false,
  //   position: "top",
  // },
  grid: {
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  markers: {
    size: 4,
    colors: "#fff",
    strokeColors: ["#3056D3", "#80CAEE"],
    strokeWidth: 3,
    strokeOpacity: 0.9,
    strokeDashArray: 0,
    fillOpacity: 1,
    discrete: [],
    hover: {
      size: undefined,
      sizeOffset: 5,
    },
  },
  xaxis: {
    type: "category",
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    title: {
      style: {
        fontSize: "0px",
      },
    },
    min: 0,
    max: 100,
  },
};

interface ChartOneState {
  series: {
    name: string;
    data: number[];
  }[];
}

const RevenueAndProfitChart = ({ weeklyStats, isLoading }: DailyStatsProps) => {
  const dailyRevenueArray = useMemo(() => {
    if (!!weeklyStats && weeklyStats?.length > 0) {
      const sortedWeeks = weeklyStats?.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      return sortedWeeks.map((stat) => stat.totalRevenue);
    }
  }, [weeklyStats]);

  const daysOfWeekArr = useMemo(() => {
    if (!!weeklyStats && weeklyStats?.length > 0) {
      const datesArr = weeklyStats?.map((stat) => {
        // get day of week, month, and day of month
        const dateArr = stat.date.toString().split(" ");
        return dateArr.slice(0, 3).join(" ");
      });
      return datesArr;
    }
  }, [weeklyStats]);

  const [state, setState] = useState<ChartOneState>({
    series: [
      {
        name: "Profit",
        data: [4, 7, 10, 11, 13, 14, 17],
      },
    ],
  });
  const [chartOptions, setChartOptions] = useState<ApexOptions>(options);

  useEffect(() => {
    if (dailyRevenueArray && dailyRevenueArray.length > 0) {
      setState((prevState) => {
        // Check if a "Revenue" series already exists
        const existingSeriesIndex = prevState.series.findIndex(
          (series) => series.name === "Revenue",
        );

        if (existingSeriesIndex >= 0) {
          // Update existing "Revenue" series data
          return {
            ...prevState,
            series: prevState.series.map((serie, index) => {
              if (index === existingSeriesIndex) {
                return { ...serie, data: dailyRevenueArray };
              }
              return serie;
            }),
          };
        } else {
          // Add "Revenue" series as it does not exist yet
          return {
            ...prevState,
            series: [
              ...prevState.series,
              {
                name: "Revenue",
                data: dailyRevenueArray,
              },
            ],
          };
        }
      });
    }
  }, [dailyRevenueArray]);

  useEffect(() => {
    if (
      !!daysOfWeekArr &&
      daysOfWeekArr?.length > 0 &&
      !!dailyRevenueArray &&
      dailyRevenueArray?.length > 0
    ) {
      setChartOptions({
        ...options,
        xaxis: {
          ...options.xaxis,
          categories: daysOfWeekArr,
        },
        yaxis: {
          ...options.yaxis,
          // get the min & max values to the neareast hundred
          max: Math.ceil(Math.max(...dailyRevenueArray) / 100) * 100,
          min: Math.floor(Math.min(...dailyRevenueArray) / 100) * 100,
        },
      });
    }
  }, [daysOfWeekArr, dailyRevenueArray]);

  return (
    <ChartContainer id="chartOne">
      <ChartHeader>
        <ChartLegendGroup>
          <ChartLegendItem borderColor="hsl(var(--primary))" dotColor="hsl(var(--primary))">
            <ChartLegendTitle>Total Profit</ChartLegendTitle>
            <ChartLegendSubtitle>Last 7 Days</ChartLegendSubtitle>
          </ChartLegendItem>
          <ChartLegendItem borderColor="hsl(var(--secondary))" dotColor="hsl(var(--secondary))">
            <ChartLegendTitle>Total Revenue</ChartLegendTitle>
            <ChartLegendSubtitle>Last 7 Days</ChartLegendSubtitle>
          </ChartLegendItem>
        </ChartLegendGroup>
        <ChartTimePeriodSelector>
          <ChartTimePeriodButtonGroup>
            <ChartTimePeriodButton isActive={true}>
              Day
            </ChartTimePeriodButton>
            <ChartTimePeriodButton isActive={false}>
              Week
            </ChartTimePeriodButton>
            <ChartTimePeriodButton isActive={false}>
              Month
            </ChartTimePeriodButton>
          </ChartTimePeriodButtonGroup>
        </ChartTimePeriodSelector>
      </ChartHeader>

      <ChartArea id="chartOne">
        <ReactApexChart
          options={chartOptions}
          series={state.series}
          type="area"
          height={350}
        />
      </ChartArea>
    </ChartContainer>
  );
};

export default RevenueAndProfitChart;
