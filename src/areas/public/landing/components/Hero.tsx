import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../../../client/components/ui/button";
import openSaasBannerDark from "../../../../client/static/open-saas-banner-dark.svg";
import openSaasBannerLight from "../../../../client/static/open-saas-banner-light.svg";
import {
  HeroActionsRow,
  HeroArrow,
  HeroBottomGradient,
  HeroContentContainer,
  HeroDarkScreenshot,
  HeroDescription,
  HeroGradient,
  HeroIntroBlock,
  HeroItalic,
  HeroLightScreenshot,
  HeroOuterPadding,
  HeroPreviewFrame,
  HeroPreviewSection,
  HeroRoot,
  HeroTitle,
  HeroTopGradient,
} from "../../../../client/components/patterns/LandingPagePatterns";

export default function Hero() {
  return (
    <HeroRoot>
      <HeroTopGradient />
      <HeroBottomGradient />
      <HeroOuterPadding>
        <HeroContentContainer>
          <HeroIntroBlock>
            <HeroTitle>
              Some <HeroItalic>cool</HeroItalic> words about <HeroGradient>your product</HeroGradient>
            </HeroTitle>
            <HeroDescription>
              With some more exciting words about your product!
            </HeroDescription>
            <HeroActionsRow>
              <Button size="lg" variant="default" asChild>
                <WaspRouterLink to={routes.LoginRoute.to}>
                  Get Started <HeroArrow />
                </WaspRouterLink>
              </Button>
            </HeroActionsRow>
          </HeroIntroBlock>
          <HeroPreviewSection>
            <HeroPreviewFrame>
              <HeroLightScreenshot src={openSaasBannerLight} />
              <HeroDarkScreenshot src={openSaasBannerDark} />
            </HeroPreviewFrame>
          </HeroPreviewSection>
        </HeroContentContainer>
      </HeroOuterPadding>
    </HeroRoot>
  );
}
