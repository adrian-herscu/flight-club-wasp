import AstroLogo from "../logos/AstroLogo";
import OpenAILogo from "../logos/OpenAILogo";
import PrismaLogo from "../logos/PrismaLogo";
import SalesforceLogo from "../logos/SalesforceLogo";
import {
  ClientsGrid,
  ClientsLogoCell,
  ClientsSection,
  ClientsTitle,
} from "../../../../client/components/patterns/LandingPagePatterns";

export default function Clients() {
  return (
    <ClientsSection>
      <ClientsTitle>Built with / Used by:</ClientsTitle>

      <ClientsGrid>
        {[
          <SalesforceLogo />,
          <PrismaLogo />,
          <AstroLogo />,
          <OpenAILogo />,
        ].map((logo, index) => (
          <ClientsLogoCell key={index}>
            {logo}
          </ClientsLogoCell>
        ))}
      </ClientsGrid>
    </ClientsSection>
  );
}
