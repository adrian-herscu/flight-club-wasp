import { ArrowUp, UsersRound } from "lucide-react";
import { useMemo } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DailyStatsProps = { dailyStats?: any; isLoading?: boolean };

import {
  Card,
  CardContent,
  CardHeader,
} from "../../../../client/components/ui/card";
import {
  AnalyticsCardContentRow,
  AnalyticsCardDelta,
  AnalyticsCardIconContainer,
  AnalyticsCardLabel,
  AnalyticsCardValue,
  AnalyticsMetricBlock,
} from "../../../../client/components/patterns/AdminAnalyticsPatterns";

const TotalSignupsCard = ({ dailyStats, isLoading }: DailyStatsProps) => {
  const isDeltaPositive = useMemo(() => {
    return !!dailyStats?.userDelta && dailyStats.userDelta > 0;
  }, [dailyStats]);

  return (
    <Card>
      <CardHeader>
        <AnalyticsCardIconContainer>
          <UsersRound style={{ width: "1.5rem", height: "1.5rem" }} />
        </AnalyticsCardIconContainer>
      </CardHeader>

      <CardContent>
        <AnalyticsCardContentRow>
          <AnalyticsMetricBlock>
            <AnalyticsCardValue>{dailyStats?.userCount}</AnalyticsCardValue>
            <AnalyticsCardLabel>Total Signups</AnalyticsCardLabel>
          </AnalyticsMetricBlock>

          <AnalyticsCardDelta
            isPositive={isDeltaPositive}
            isLoading={isLoading}
          >
            {isLoading ? "..." : (dailyStats?.userDelta ?? "-")}
            {!isLoading && (dailyStats?.userDelta ?? 0) > 0 && (
              <ArrowUp style={{ width: "1rem", height: "1rem" }} />
            )}
          </AnalyticsCardDelta>
        </AnalyticsCardContentRow>
      </CardContent>
    </Card>
  );
};

export default TotalSignupsCard;
