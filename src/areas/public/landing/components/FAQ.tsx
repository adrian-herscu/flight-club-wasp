import {
  FAQAccordion,
  FAQAccordionContent,
  FAQAccordionItem,
  FAQAccordionTrigger,
  FAQAnswerRow,
  FAQAnswerText,
  FAQSection,
  FAQLearnMoreLink,
  FAQTitle,
} from "../../../../client/components/patterns/LandingPagePatterns";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  href?: string;
}

export default function FAQ({ faqs }: { faqs: FAQ[] }) {
  return (
    <FAQSection>
      <FAQTitle>Frequently asked questions</FAQTitle>

      <FAQAccordion>
        {faqs.map((faq) => (
          <FAQAccordionItem key={faq.id} value={`faq-${faq.id}`}>
            <FAQAccordionTrigger>
              {faq.question}
            </FAQAccordionTrigger>
            <FAQAccordionContent>
              <FAQAnswerRow>
                <FAQAnswerText>{faq.answer}</FAQAnswerText>
                {faq.href && (
                  <FAQLearnMoreLink href={faq.href}>Learn more →</FAQLearnMoreLink>
                )}
              </FAQAnswerRow>
            </FAQAccordionContent>
          </FAQAccordionItem>
        ))}
      </FAQAccordion>
    </FAQSection>
  );
}
