import aiReadyDark from "../../../client/static/assets/aiready-dark.webp";
import aiReady from "../../../client/static/assets/aiready.webp";
import {
  ExampleHighlightedFeatureDarkImage,
  ExampleHighlightedFeatureFrame,
  ExampleHighlightedFeatureLightImage,
} from "../../../client/components/patterns/LandingPagePatterns";
import HighlightedFeature from "./components/HighlightedFeature";

export default function AIReady() {
  return (
    <HighlightedFeature
      name="Example Feature Highlight"
      description="Yo! Use this component to show off the most important features in your app."
      highlightedComponent={<AIReadyExample />}
      direction="row-reverse"
    />
  );
}

const AIReadyExample = () => {
  return (
    <ExampleHighlightedFeatureFrame>
      <ExampleHighlightedFeatureLightImage src={aiReady} />
      <ExampleHighlightedFeatureDarkImage src={aiReadyDark} />
    </ExampleHighlightedFeatureFrame>
  );
};
