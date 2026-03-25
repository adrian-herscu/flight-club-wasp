import React from "react";
import {
  FeatureCardLink,
  FeatureEmoji,
  FeatureFullWidthIcon,
  FeatureIconBubble,
  FeatureIconRow,
  FeaturesGridCard,
  FeaturesGridCardBody,
  FeaturesGridDescription,
  FeaturesGridLayout,
  FeaturesGridSection,
  FeaturesGridFullWidthTitle,
  FeaturesGridTitle,
} from "../../client/components/patterns/LandingPagePatterns";
import { Feature } from "./Features";
import SectionTitle from "./SectionTitle";

export interface GridFeature extends Omit<Feature, "icon"> {
  icon?: React.ReactNode;
  emoji?: string;
  direction?: "col" | "row" | "col-reverse" | "row-reverse";
  align?: "center" | "left";
  size: "small" | "medium" | "large";
  fullWidthIcon?: boolean;
}

interface FeaturesGridProps {
  features: GridFeature[];
  layoutClassName?: string;
}

const FeaturesGrid = ({ features, layoutClassName = "" }: FeaturesGridProps) => {
  return (
    <FeaturesGridSection>
      <SectionTitle
        title="Features"
        description="These are some of the features of the product."
      />
      <FeaturesGridLayout extraClasses={layoutClassName}>
        {features.map((feature) => (
          <FeaturesGridItem
            key={feature.name + feature.description}
            {...feature}
          />
        ))}
      </FeaturesGridLayout>
    </FeaturesGridSection>
  );
};

function FeaturesGridItem({
  name,
  description,
  icon,
  emoji,
  href,
  direction = "col",
  align = "center",
  size = "medium",
  fullWidthIcon = true,
}: GridFeature) {
  const gridFeatureSizeToClasses: Record<GridFeature["size"], string> = {
    small: "col-span-1",
    medium: "col-span-2 md:col-span-2 lg:col-span-2",
    large: "col-span-2 md:col-span-2 lg:col-span-2 row-span-2",
  };

  const directionToClass: Record<
    NonNullable<GridFeature["direction"]>,
    string
  > = {
    col: "flex-col",
    row: "flex-row",
    "row-reverse": "flex-row-reverse",
    "col-reverse": "flex-col-reverse",
  };

  const gridFeatureCard = (
    <FeaturesGridCard sizeClass={gridFeatureSizeToClasses[size]}>
      <FeaturesGridCardBody>
        {fullWidthIcon && (icon || emoji) ? (
          <FeatureFullWidthIcon>
            {icon ? (
              icon
            ) : emoji ? (
              <FeatureEmoji size="lg">{emoji}</FeatureEmoji>
            ) : null}
          </FeatureFullWidthIcon>
        ) : (
          <FeatureIconRow direction={direction} align={align}>
            <FeatureIconBubble>
              {icon ? (
                icon
              ) : emoji ? (
                <FeatureEmoji>{emoji}</FeatureEmoji>
              ) : null}
            </FeatureIconBubble>
            <FeaturesGridTitle align={align}>{name}</FeaturesGridTitle>
          </FeatureIconRow>
        )}
        {fullWidthIcon && (icon || emoji) && (
          <FeaturesGridFullWidthTitle>{name}</FeaturesGridFullWidthTitle>
        )}
        <FeaturesGridDescription
          centered={fullWidthIcon || direction === "col" || align === "center"}
        >
          {description}
        </FeaturesGridDescription>
      </FeaturesGridCardBody>
    </FeaturesGridCard>
  );

  if (href) {
    return (
      <FeatureCardLink href={href} spanClass={gridFeatureSizeToClasses[size]}>
        {gridFeatureCard}
      </FeatureCardLink>
    );
  }

  return gridFeatureCard;
}

export default FeaturesGrid;
