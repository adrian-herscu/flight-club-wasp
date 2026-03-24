import {
  SectionTitleContainer,
  SectionTitleHeading,
  SectionTitleText,
} from "../../client/components/patterns/LandingPagePatterns";

export default function SectionTitle({
  title,
  description,
}: {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
}) {
  const titleElement =
    typeof title === "string" ? (
      <SectionTitleHeading>{title}</SectionTitleHeading>
    ) : (
      title
    );
  const descriptionElement =
    typeof description === "string" ? (
      <SectionTitleText>{description}</SectionTitleText>
    ) : (
      description
    );

  return (
    <SectionTitleContainer>
      {titleElement}
      {descriptionElement}
    </SectionTitleContainer>
  );
}
