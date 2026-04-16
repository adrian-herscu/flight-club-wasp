import SectionTitle from "./SectionTitle";
import {
  FeaturesDefinitionDescription,
  FeaturesDefinitionItem,
  FeaturesDefinitionList,
  FeaturesDefinitionTerm,
  FeaturesIconText,
  FeaturesIconWrapper,
  FeaturesListContainer,
  FeaturesSection,
  FeaturesTitleHighlight,
  FeaturesTitleText,
} from "../../../../client/components/patterns/LandingPagePatterns";

export interface Feature {
  name: string;
  description: string;
  icon: string;
  href: string;
}

export default function Features({ features }: { features: Feature[] }) {
  return (
    <FeaturesSection>
      <SectionTitle
        title={<FeaturesTitleText>The <FeaturesTitleHighlight>Best</FeaturesTitleHighlight> Features</FeaturesTitleText>}
        description="Don't work harder. Work smarter."
      />
      <FeaturesListContainer>
        <FeaturesDefinitionList>
          {features.map((feature) => (
            <FeaturesDefinitionItem key={feature.name}>
              <FeaturesDefinitionTerm>
                <FeaturesIconWrapper>
                  <FeaturesIconText>{feature.icon}</FeaturesIconText>
                </FeaturesIconWrapper>
                {feature.name}
              </FeaturesDefinitionTerm>
              <FeaturesDefinitionDescription>{feature.description}</FeaturesDefinitionDescription>
            </FeaturesDefinitionItem>
          ))}
        </FeaturesDefinitionList>
      </FeaturesListContainer>
    </FeaturesSection>
  );
}
