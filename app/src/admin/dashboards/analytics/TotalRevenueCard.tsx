import { ArrowDown, ArrowUp, ShoppingCart } from "lucide-react";
import { useMemo } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DailyStatsProps = { dailyStats?: any; weeklyStats?: any[]; isLoading?: boolean };

import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import {
  AnalyticsCardContentRow,
  AnalyticsCardIconContainer,
  AnalyticsCardLabel,
  AnalyticsCardDelta,
  AnalyticsCardValue,
  AnalyticsMetricBlock,
} from "../../../client/components/patterns/AdminAnalyticsPatterns";

const TotalRevenueCard = ({
  dailyStats,
  weeklyStats,
  isLoading,
}: DailyStatsProps) => {
  const isDeltaPositive = useMemo(() => {
    if (!weeklyStats) return false;
    return weeklyStats[0].totalRevenue - weeklyStats[1]?.totalRevenue > 0;
  }, [weeklyStats]);

  const deltaPercentage = useMemo(() => {
    if (!weeklyStats || weeklyStats.length < 2 || isLoading) return;
    if (
      weeklyStats[1]?.totalRevenue === 0 ||
      weeklyStats[0]?.totalRevenue === 0
    )
      return 0;

    weeklyStats.sort((a, b) => b.id - a.id);

    const percentage =
      ((weeklyStats[0].totalRevenue - weeklyStats[1]?.totalRevenue) /
        weeklyStats[1]?.totalRevenue) *
      100;
    return Math.floor(percentage);
  }, [weeklyStats]);

  return (
    <Card>
      <CardHeader>
        <AnalyticsCardIconContainer>
          <ShoppingCart style={{ width: "1.5rem", height: "1.5rem" }} />
        </AnalyticsCardIconContainer>
      </CardHeader>

      <CardContent>
        <AnalyticsCardContentRow>
          <AnalyticsMetricBlock>
          <AnalyticsCardValue>${dailyStats?.totalRevenue}</AnalyticsCardValue>
          <AnalyticsCardLabel>Total Revenue</AnalyticsCardLabel>
          </AnalyticsMetricBlock>

          <AnalyticsCardDelta
            isPositive={isDeltaPositive}
            isLoading={isLoading}
          >
            {isLoading
              ? "..."
              : deltaPercentage && deltaPercentage !== 0
                ? `${deltaPercentage}%`
                : "-"}
            {!isLoading &&
              deltaPercentage &&
              deltaPercentage !== 0 &&
              (isDeltaPositive ? <ArrowUp style={{ width: "1rem", height: "1rem" }} /> : <ArrowDown style={{ width: "1rem", height: "1rem" }} />)}
          </AnalyticsCardDelta>
        </AnalyticsCardContentRow>
      </CardContent>
    </Card>
  );
};

export default TotalRevenueCard;
