import {
  BreadcrumbRoot,
  BreadcrumbTitle,
  BreadcrumbNav,
  BreadcrumbList,
  BreadcrumbListItem,
} from "../../../client/components/patterns/AdminBreadcrumbPatterns";

interface BreadcrumbProps {
  pageName: string;
  showTitle?: boolean;
  showNavigation?: boolean;
}
const Breadcrumb = ({ pageName, showTitle = true, showNavigation = true }: BreadcrumbProps) => {
  if (!showTitle && !showNavigation) {
    return null;
  }

  return (
    <BreadcrumbRoot showTitle={showTitle}>
      {showTitle ? <BreadcrumbTitle>{pageName}</BreadcrumbTitle> : null}

      {showNavigation ? (
        <BreadcrumbNav>
          <BreadcrumbList>
            <BreadcrumbListItem>{pageName}</BreadcrumbListItem>
          </BreadcrumbList>
        </BreadcrumbNav>
      ) : null}
    </BreadcrumbRoot>
  );
};

export default Breadcrumb;
