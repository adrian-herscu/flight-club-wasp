import {
  HighlightedFeatureDescription,
  HighlightedFeatureName,
  HighlightedFeatureRoot,
  HighlightedFeatureText,
  HighlightedFeatureVisual,
} from "../../../../client/components/patterns/LandingPagePatterns";

interface FeatureProps {
  name: string;
  description: string | React.ReactNode;
  direction?: "row" | "row-reverse";
  highlightedComponent: React.ReactNode;
  tilt?: "left" | "right";
}

/**
 * A component that highlights a feature with a description and a highlighted component.
 * Shows text description on one side, and whatever component you want to show on the other side to demonstrate the functionality.
 */
const HighlightedFeature = ({
  name,
  description,
  direction = "row",
  highlightedComponent,
  tilt,
}: FeatureProps) => {
  return (
    <HighlightedFeatureRoot direction={direction}>
      <HighlightedFeatureText>
        <HighlightedFeatureName>{name}</HighlightedFeatureName>
        {typeof description === "string" ? (
          <HighlightedFeatureDescription>{description}</HighlightedFeatureDescription>
        ) : (
          description
        )}
      </HighlightedFeatureText>
      <HighlightedFeatureVisual tilt={tilt}>
        {highlightedComponent}
      </HighlightedFeatureVisual>
    </HighlightedFeatureRoot>
  );
};

export default HighlightedFeature;
