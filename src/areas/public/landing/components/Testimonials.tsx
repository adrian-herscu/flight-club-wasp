import { useState } from "react";
import {
  TestimonialsAuthorLink,
  TestimonialsAuthorName,
  TestimonialsAuthorRole,
  TestimonialsAuthorText,
  TestimonialsAvatar,
  TestimonialsCard,
  TestimonialsCardBody,
  TestimonialsCardFooter,
  TestimonialsColumnItem,
  TestimonialsColumns,
  TestimonialsExpandArea,
  TestimonialsExpandButton,
  TestimonialsQuote,
  TestimonialsQuoteText,
  TestimonialsSection,
} from "../../../../client/components/patterns/LandingPagePatterns";
import SectionTitle from "./SectionTitle";

interface Testimonial {
  name: string;
  role: string;
  avatarSrc: string;
  socialUrl: string;
  quote: string;
}

export default function Testimonials({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldShowExpand = testimonials.length > 5;
  const mobileItemsToShow = 3;
  const itemsToShow =
    shouldShowExpand && !isExpanded ? mobileItemsToShow : testimonials.length;

  return (
    <TestimonialsSection>
      <SectionTitle title="What Our Users Say" />

      <TestimonialsColumns>
        {testimonials.slice(0, itemsToShow).map((testimonial, idx) => (
          <TestimonialsColumnItem key={idx}>
            <TestimonialsCard>
              <TestimonialsCardBody>
                <TestimonialsQuote>
                  <TestimonialsQuoteText>{testimonial.quote}</TestimonialsQuoteText>
                </TestimonialsQuote>
              </TestimonialsCardBody>
              <TestimonialsCardFooter>
                <TestimonialsAuthorLink href={testimonial.socialUrl}>
                  <TestimonialsAvatar
                    src={testimonial.avatarSrc}
                    alt={`${testimonial.name}'s avatar`}
                  />
                  <TestimonialsAuthorText>
                    <TestimonialsAuthorName>{testimonial.name}</TestimonialsAuthorName>
                    <TestimonialsAuthorRole>{testimonial.role}</TestimonialsAuthorRole>
                  </TestimonialsAuthorText>
                </TestimonialsAuthorLink>
              </TestimonialsCardFooter>
            </TestimonialsCard>
          </TestimonialsColumnItem>
        ))}
      </TestimonialsColumns>

      {shouldShowExpand && (
        <TestimonialsExpandArea>
          <TestimonialsExpandButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded
              ? "Show Less"
              : `Show ${testimonials.length - mobileItemsToShow} More`}
          </TestimonialsExpandButton>
        </TestimonialsExpandArea>
      )}
    </TestimonialsSection>
  );
}
