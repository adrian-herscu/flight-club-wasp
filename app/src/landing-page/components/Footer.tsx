interface NavigationItem {
  name: string;
  href: string;
}

import {
  FooterColumn,
  FooterColumns,
  FooterColumnTitle,
  FooterContainer,
  FooterHiddenHeading,
  FooterNav,
  FooterNavItem,
  FooterNavLink,
  FooterRoot,
} from "../../client/components/patterns/LandingPagePatterns";

export default function Footer({
  footerNavigation,
}: {
  footerNavigation: {
    app: NavigationItem[];
    company: NavigationItem[];
  };
}) {
  return (
    <FooterContainer>
      <FooterRoot>
        <FooterHiddenHeading>Footer</FooterHiddenHeading>
        <FooterColumns>
          <FooterColumn>
            <FooterColumnTitle>App</FooterColumnTitle>
            <FooterNav>
              {footerNavigation.app.map((item) => (
                <FooterNavItem key={item.name}>
                  <FooterNavLink href={item.href}>{item.name}</FooterNavLink>
                </FooterNavItem>
              ))}
            </FooterNav>
          </FooterColumn>
          <FooterColumn>
            <FooterColumnTitle>Company</FooterColumnTitle>
            <FooterNav>
              {footerNavigation.company.map((item) => (
                <FooterNavItem key={item.name}>
                  <FooterNavLink href={item.href}>{item.name}</FooterNavLink>
                </FooterNavItem>
              ))}
            </FooterNav>
          </FooterColumn>
        </FooterColumns>
      </FooterRoot>
    </FooterContainer>
  );
}
