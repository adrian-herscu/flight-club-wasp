import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ExampleCardAnchor,
  ExampleCardDescription,
  ExampleCardImage,
  ExampleCardName,
  ExamplePreviewCard,
  ExamplePreviewCardBody,
  ExampleCardTextBox,
  ExamplesCarouselRoot,
  ExamplesCarouselTitle,
  ExamplesTrack,
  ExamplesViewport,
} from "../../../../client/components/patterns/LandingPagePatterns";

const EXAMPLES_CAROUSEL_INTERVAL = 3000;
const EXAMPLES_CAROUSEL_SCROLL_TIMEOUT = 200;

interface ExampleApp {
  name: string;
  description: string;
  imageSrc: string;
  href: string;
}

const ExamplesCarousel = ({ examples }: { examples: ExampleApp[] }) => {
  const [currentExample, setCurrentExample] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      {
        threshold: 0.5,
        rootMargin: "-200px 0px -100px 0px",
      },
    );

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isInView && examples.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentExample((prev) => (prev + 1) % examples.length);
      }, EXAMPLES_CAROUSEL_INTERVAL);
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const targetCard = scrollContainer.children[currentExample] as
          | HTMLElement
          | undefined;

        if (targetCard) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const cardRect = targetCard.getBoundingClientRect();
          const scrollLeft =
            targetCard.offsetLeft -
            scrollContainer.offsetLeft -
            containerRect.width / 2 +
            cardRect.width / 2;

          scrollContainer.scrollTo({
            left: scrollLeft,
            behavior: "smooth",
          });
        }
      }
    }, EXAMPLES_CAROUSEL_SCROLL_TIMEOUT);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isInView, examples.length, currentExample]);

  const handleMouseEnter = (index: number) => {
    setCurrentExample(index);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isInView && examples.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentExample((prev) => (prev + 1) % examples.length);
      }, EXAMPLES_CAROUSEL_INTERVAL);
    }
  };

  return (
    <ExamplesCarouselRoot innerRef={containerRef}>
      <ExamplesCarouselTitle>Used by:</ExamplesCarouselTitle>
      <ExamplesViewport>
        <ExamplesTrack innerRef={scrollContainerRef}>
          {examples.map((example, index) => (
            <ExampleCard
              key={index}
              example={example}
              index={index}
              isCurrent={index === currentExample}
              onMouseEnter={handleMouseEnter}
            />
          ))}
        </ExamplesTrack>
      </ExamplesViewport>
    </ExamplesCarouselRoot>
  );
};

interface ExampleCardProps {
  example: ExampleApp;
  index: number;
  isCurrent: boolean;
  onMouseEnter: (index: number) => void;
}

const ExampleCard = forwardRef<HTMLDivElement, ExampleCardProps>(
  ({ example, index, isCurrent, onMouseEnter }, ref) => {
    return (
      <ExampleCardAnchor href={example.href} onMouseEnter={() => onMouseEnter(index)}>
        <ExamplePreviewCard cardRef={ref} isCurrent={isCurrent}>
          <ExamplePreviewCardBody>
            <ExampleCardImage src={example.imageSrc} alt={example.name} />
            <ExampleCardTextBox>
              <ExampleCardName>{example.name}</ExampleCardName>
              <ExampleCardDescription>{example.description}</ExampleCardDescription>
            </ExampleCardTextBox>
          </ExamplePreviewCardBody>
        </ExamplePreviewCard>
      </ExampleCardAnchor>
    );
  },
);

ExampleCard.displayName = "ExampleCard";

export default ExamplesCarousel;
