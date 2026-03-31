import type { ReactNode } from "react";
import { cn } from "../../utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "../ui/card";
import SafeImage from "./SafeImage";

export const LandingPageShell = ({ children }: { children: ReactNode }) => (
  <div className="bg-background text-foreground min-h-[70vh]">{children}</div>
);

export const LandingPageMain = ({ children, testId }: { children: ReactNode; testId: string }) => (
  <main className="mx-auto w-full max-w-5xl px-6 py-12" data-testid={testId}>
    {children}
  </main>
);

export const LandingPageHeader = ({ children }: { children: ReactNode }) => (
  <header className="mb-8 space-y-2">{children}</header>
);

export const LandingPageTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="text-3xl font-bold tracking-tight">{children}</h1>
);

export const LandingPageSubtitle = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground">{children}</p>
);

export const LandingFilterBar = ({ children }: { children: ReactNode }) => (
  <div className="mb-6 flex flex-wrap gap-3">{children}</div>
);

export const LandingFilterInput = ({
  value,
  placeholder,
  onChange,
  testId,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  testId: string;
}) => (
  <input
    type="search"
    placeholder={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    data-testid={testId}
    className="h-9 w-56 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  />
);

export const LandingCountryFilter = ({
  value,
  onChange,
  children,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  testId: string;
}) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    data-testid={testId}
    className="h-9 w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    {children}
  </select>
);

export const LandingCountryOption = ({ value, children }: { value: string; children: ReactNode }) => (
  <option value={value}>{children}</option>
);

export const LandingHiddenCountryOption = ({ value, children }: { value: string; children: ReactNode }) => (
  <option value={value} aria-hidden>
    {children}
  </option>
);

export const LandingStatusText = ({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "danger";
}) => (
  <p className={tone === "danger" ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>{children}</p>
);

export const LandingResultsSection = ({ children }: { children: ReactNode }) => (
  <section className="space-y-5">{children}</section>
);

export const LandingSchoolCard = ({ children }: { children: ReactNode }) => (
  <article
    data-testid="landing-school-card"
    className="rounded-lg border border-border bg-card p-5 shadow-xs"
  >
    {children}
  </article>
);

export const LandingSchoolHeaderRow = ({ children }: { children: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">{children}</div>
);

export const LandingSchoolIdentityRow = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3">{children}</div>
);

export const LandingSchoolLogo = ({ src, alt }: { src: string; alt: string }) => (
  <SafeImage
    src={src}
    alt={alt}
    data-testid="landing-school-logo"
    className="h-12 w-12 rounded-md object-cover"
  />
);

export const LandingSchoolLogoPlaceholder = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div
    data-testid="landing-school-logo"
    aria-label={label}
    className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-md text-sm font-semibold"
  >
    {children}
  </div>
);

export const LandingSchoolTextColumn = ({ children }: { children: ReactNode }) => <div>{children}</div>;

export const LandingSchoolName = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

export const LandingSchoolLocation = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

export const LandingSchoolWebsite = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
  >
    {children}
  </a>
);

export const LandingCourseList = ({ children }: { children: ReactNode }) => (
  <ul className="space-y-2">{children}</ul>
);

export const LandingCourseItem = ({ children }: { children: ReactNode }) => (
  <li
    data-testid="landing-course-item"
    className="rounded-md border border-border/70 bg-background px-3 py-2"
  >
    {children}
  </li>
);

export const LandingCourseTitle = ({ children }: { children: ReactNode }) => (
  <p className="font-medium">{children}</p>
);

export const LandingCourseMeta = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

export const LandingCourseActionsRow = ({ children }: { children: ReactNode }) => (
  <div className="mt-2">{children}</div>
);

export const HeroRoot = ({ children }: { children: ReactNode }) => (
  <div className="relative w-full pt-14">{children}</div>
);

export const HeroTopGradient = () => (
  <div
    className="absolute right-0 top-0 -z-10 w-full transform-gpu overflow-hidden blur-3xl sm:top-0"
    aria-hidden="true"
  >
    <div
      className="aspect-1020/880 w-280 flex-none bg-linear-to-tr from-amber-400 to-purple-300 opacity-10 sm:right-1/4 sm:translate-x-1/2 dark:hidden"
      style={{ clipPath: "polygon(80% 20%, 90% 55%, 50% 100%, 70% 30%, 20% 50%, 50% 0)" }}
    />
  </div>
);

export const HeroBottomGradient = () => (
  <div
    className="absolute inset-x-0 top-[calc(100%-40rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-65rem)]"
    aria-hidden="true"
  >
    <div
      className="relative aspect-1020/880 w-360 bg-linear-to-br from-amber-400 to-purple-300 opacity-10 sm:-left-3/4 sm:translate-x-1/4 dark:hidden"
      style={{ clipPath: "ellipse(80% 30% at 80% 50%)" }}
    />
  </div>
);

export const HeroOuterPadding = ({ children }: { children: ReactNode }) => (
  <div className="md:p-24">{children}</div>
);

export const HeroContentContainer = ({ children }: { children: ReactNode }) => (
  <div className="max-w-8xl mx-auto px-6 lg:px-8">{children}</div>
);

export const HeroIntroBlock = ({ children }: { children: ReactNode }) => (
  <div className="lg:mb-18 mx-auto max-w-3xl text-center">{children}</div>
);

export const HeroTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="text-foreground text-5xl font-bold sm:text-6xl">{children}</h1>
);

export const HeroItalic = ({ children }: { children: ReactNode }) => (
  <span className="italic">{children}</span>
);

export const HeroGradient = ({ children }: { children: ReactNode }) => (
  <span className="text-gradient-primary">{children}</span>
);

export const HeroArrow = () => <span aria-hidden="true">→</span>;

export const HeroDescription = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-8">{children}</p>
);

export const HeroActionsRow = ({ children }: { children: ReactNode }) => (
  <div className="mt-10 flex items-center justify-center gap-x-6">{children}</div>
);

export const HeroPreviewSection = ({ children }: { children: ReactNode }) => (
  <div className="mt-14 flow-root sm:mt-14">{children}</div>
);

export const HeroPreviewFrame = ({ children }: { children: ReactNode }) => (
  <div className="m-2 hidden justify-center rounded-xl md:flex lg:-m-4 lg:rounded-2xl lg:p-4">{children}</div>
);

export const HeroLightScreenshot = ({ src }: { src: string }) => (
  <img
    src={src}
    alt="App screenshot"
    width={1000}
    height={530}
    loading="lazy"
    className="rounded-md shadow-2xl ring-1 ring-gray-900/10 dark:hidden"
  />
);

export const HeroDarkScreenshot = ({ src }: { src: string }) => (
  <img
    src={src}
    alt="App screenshot"
    width={1000}
    height={530}
    loading="lazy"
    className="hidden rounded-md shadow-2xl ring-1 ring-gray-900/10 dark:block"
  />
);

export const FooterContainer = ({ children }: { children: ReactNode }) => (
  <div className="dark:bg-boxdark-2 mx-auto mt-6 max-w-7xl px-6 lg:px-8">{children}</div>
);

export const FooterRoot = ({ children }: { children: ReactNode }) => (
  <footer
    aria-labelledby="footer-heading"
    className="relative border-t border-gray-900/10 py-24 sm:mt-32 dark:border-gray-200/10"
  >
    {children}
  </footer>
);

export const FooterHiddenHeading = ({ children }: { children: ReactNode }) => (
  <h2 id="footer-heading" className="sr-only">
    {children}
  </h2>
);

export const FooterColumns = ({ children }: { children: ReactNode }) => (
  <div className="mt-10 flex items-start justify-end gap-20">{children}</div>
);

export const FooterColumn = ({ children }: { children: ReactNode }) => <div>{children}</div>;

export const FooterColumnTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">{children}</h3>
);

export const FooterNav = ({ children }: { children: ReactNode }) => (
  <ul role="list" className="mt-6 space-y-4">
    {children}
  </ul>
);

export const FooterNavItem = ({ children }: { children: ReactNode }) => <li>{children}</li>;

export const FooterNavLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-white">
    {children}
  </a>
);

export const TestimonialsSection = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto mt-32 max-w-7xl sm:mt-56 sm:px-6 lg:px-8">{children}</div>
);

export const TestimonialsColumns = ({ children }: { children: ReactNode }) => (
  <div className="relative z-10 w-full columns-1 gap-2 px-4 md:columns-2 md:gap-6 md:px-0 lg:columns-3">{children}</div>
);

export const TestimonialsColumnItem = ({ children }: { children: ReactNode }) => (
  <div className="mb-6 break-inside-avoid">{children}</div>
);

export const TestimonialsCard = ({ children }: { children: ReactNode }) => (
  <Card className="flex flex-col justify-between">{children}</Card>
);

export const TestimonialsCardBody = ({ children }: { children: ReactNode }) => (
  <CardContent className="p-6">{children}</CardContent>
);

export const TestimonialsCardFooter = ({ children }: { children: ReactNode }) => (
  <CardFooter className="flex flex-col pt-0">{children}</CardFooter>
);

export const TestimonialsQuote = ({ children }: { children: ReactNode }) => (
  <blockquote className="mb-4 leading-6">{children}</blockquote>
);

export const TestimonialsQuoteText = ({ children }: { children: ReactNode }) => (
  <p className="text-sm italic">{children}</p>
);

export const TestimonialsAuthorLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    className="group flex w-full items-center gap-x-3 transition-all duration-200 hover:opacity-80"
  >
    {children}
  </a>
);

export const TestimonialsAvatar = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    loading="lazy"
    alt={alt}
    className="ring-border/20 group-hover:ring-primary/30 h-10 w-10 shrink-0 rounded-full ring-2 transition-all duration-200"
  />
);

export const TestimonialsAuthorText = ({ children }: { children: ReactNode }) => (
  <div className="min-w-0 flex-1">{children}</div>
);

export const TestimonialsAuthorName = ({ children }: { children: ReactNode }) => (
  <CardTitle className="group-hover:text-card-foreground truncate text-sm font-semibold transition-colors duration-200">
    {children}
  </CardTitle>
);

export const TestimonialsAuthorRole = ({ children }: { children: ReactNode }) => (
  <CardDescription className="truncate text-xs">{children}</CardDescription>
);

export const TestimonialsExpandArea = ({ children }: { children: ReactNode }) => (
  <div className="mt-8 flex justify-center md:hidden">{children}</div>
);

export const TestimonialsExpandButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    onClick={onClick}
    className="text-primary bg-primary/10 hover:bg-primary/20 rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-200"
  >
    {children}
  </button>
);

export const ExamplesCarouselRoot = ({
  children,
  innerRef,
}: {
  children: ReactNode;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div
    ref={innerRef}
    className="relative left-1/2 my-16 flex w-screen -translate-x-1/2 flex-col items-center"
  >
    {children}
  </div>
);

export const ExamplesCarouselTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-muted-foreground mb-6 text-center font-semibold tracking-wide">{children}</h2>
);

export const ExamplesViewport = ({ children }: { children: ReactNode }) => (
  <div className="w-full max-w-full overflow-hidden">{children}</div>
);

export const ExamplesTrack = ({
  children,
  innerRef,
}: {
  children: ReactNode;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div
    className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-10 pt-4"
    ref={innerRef}
  >
    {children}
  </div>
);

export const ExampleCardAnchor = ({
  href,
  onMouseEnter,
  children,
}: {
  href: string;
  onMouseEnter: () => void;
  children: ReactNode;
}) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0 snap-center" onMouseEnter={onMouseEnter}>
    {children}
  </a>
);

export const ExamplePreviewCard = ({
  children,
  cardRef,
  isCurrent,
}: {
  children: ReactNode;
  cardRef: React.Ref<HTMLDivElement>;
  isCurrent: boolean;
}) => (
  <Card
    ref={cardRef}
    className="w-70 overflow-hidden transition-all duration-200 hover:scale-105 sm:w-[320px] md:w-87.5"
    variant={isCurrent ? "default" : "faded"}
  >
    {children}
  </Card>
);

export const ExamplePreviewCardBody = ({ children }: { children: ReactNode }) => (
  <CardContent className="h-full p-0">{children}</CardContent>
);

export const ExampleCardImage = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} className="aspect-video h-auto w-full" />
);

export const ExampleCardTextBox = ({ children }: { children: ReactNode }) => (
  <div className="p-4">{children}</div>
);

export const ExampleCardName = ({ children }: { children: ReactNode }) => (
  <p className="font-bold">{children}</p>
);

export const ExampleCardDescription = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-xs">{children}</p>
);

export const FeaturesGridSection = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto my-16 flex max-w-7xl flex-col gap-4 md:my-24 lg:my-40" id="features">
    {children}
  </div>
);

export const FeaturesGridLayout = ({
  children,
  extraClasses,
}: {
  children: ReactNode;
  extraClasses?: string;
}) => (
  <div
    className={cn(
      "mx-4 grid auto-rows-[minmax(140px,auto)] grid-cols-2 gap-4 md:mx-6 md:grid-cols-4 lg:mx-8 lg:grid-cols-6",
      extraClasses,
    )}
  >
    {children}
  </div>
);

export const FeatureCardLink = ({
  href,
  spanClass,
  children,
}: {
  href: string;
  spanClass: string;
  children: ReactNode;
}) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={spanClass}>
    {children}
  </a>
);

export const FeaturesGridCard = ({
  children,
  sizeClass,
}: {
  children: ReactNode;
  sizeClass: string;
}) => (
  <Card
    className={cn(
      "h-full min-h-35 cursor-pointer transition-all duration-300 hover:shadow-lg",
      sizeClass,
    )}
    variant="bento"
  >
    {children}
  </Card>
);

export const FeaturesGridCardBody = ({ children }: { children: ReactNode }) => (
  <CardContent className="flex h-full flex-col items-center justify-center p-4">{children}</CardContent>
);

export const FeaturesGridTitle = ({
  children,
  align,
}: {
  children: ReactNode;
  align: "center" | "left";
}) => <CardTitle className={align === "center" ? "text-center" : "text-left"}>{children}</CardTitle>;

export const FeaturesGridFullWidthTitle = ({ children }: { children: ReactNode }) => (
  <CardTitle className="mb-2 text-center">{children}</CardTitle>
);

export const FeaturesGridDescription = ({
  children,
  centered,
}: {
  children: ReactNode;
  centered: boolean;
}) => (
  <CardDescription className={cn("text-xs leading-relaxed", centered ? "text-center" : "text-left")}>
    {children}
  </CardDescription>
);

export const FeatureIconRow = ({
  children,
  direction,
  align,
}: {
  children: ReactNode;
  direction: "col" | "row" | "col-reverse" | "row-reverse";
  align: "center" | "left";
}) => (
  <div
    className={cn(
      "flex items-center gap-3",
      {
        "flex-col": direction === "col",
        "flex-row": direction === "row",
        "flex-col-reverse": direction === "col-reverse",
        "flex-row-reverse": direction === "row-reverse",
      },
      align === "center" ? "items-center justify-center" : "justify-start",
    )}
  >
    {children}
  </div>
);

export const FeatureIconBubble = ({ children }: { children: ReactNode }) => (
  <div className="flex h-10 w-10 items-center justify-center rounded-lg">{children}</div>
);

export const FeatureEmoji = ({ children, size = "sm" }: { children: ReactNode; size?: "sm" | "lg" }) => (
  <span className={size === "lg" ? "text-4xl" : "text-2xl"}>{children}</span>
);

export const FeatureFullWidthIcon = ({ children }: { children: ReactNode }) => (
  <div className="mb-3 flex w-full items-center justify-center">{children}</div>
);

export const FeaturesSection = ({ children }: { children: ReactNode }) => (
  <div id="features" className="mx-auto mt-48 max-w-7xl px-6 lg:px-8">
    {children}
  </div>
);

export const FeaturesTitleText = ({ children }: { children: ReactNode }) => (
  <p className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{children}</p>
);

export const FeaturesTitleHighlight = ({ children }: { children: ReactNode }) => (
  <span className="text-secondary">{children}</span>
);

export const FeaturesListContainer = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">{children}</div>
);

export const FeaturesDefinitionList = ({ children }: { children: ReactNode }) => (
  <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">{children}</dl>
);

export const FeaturesDefinitionItem = ({ children }: { children: ReactNode }) => (
  <div className="relative pl-16">{children}</div>
);

export const FeaturesDefinitionTerm = ({ children }: { children: ReactNode }) => (
  <dt className="text-foreground text-base font-semibold leading-7">{children}</dt>
);

export const FeaturesIconWrapper = ({ children }: { children: ReactNode }) => (
  <div className="border-accent bg-accent/30 absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg border">
    {children}
  </div>
);

export const FeaturesIconText = ({ children }: { children: ReactNode }) => (
  <div className="text-2xl">{children}</div>
);

export const FeaturesDefinitionDescription = ({ children }: { children: ReactNode }) => (
  <dd className="text-muted-foreground mt-2 text-base leading-7">{children}</dd>
);

export const HighlightedFeatureRoot = ({
  children,
  direction,
}: {
  children: ReactNode;
  direction: "row" | "row-reverse";
}) => (
  <div
    className={cn(
      "my-50 mx-auto flex max-w-6xl flex-col items-center justify-between gap-x-20 gap-y-10 px-8 transition-all duration-300 ease-in-out md:px-4",
      direction === "row" ? "md:flex-row" : "md:flex-row-reverse",
    )}
  >
    {children}
  </div>
);

export const HighlightedFeatureText = ({ children }: { children: ReactNode }) => (
  <div className="flex-1 flex-col">{children}</div>
);

export const HighlightedFeatureName = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 text-4xl font-bold">{children}</h2>
);

export const HighlightedFeatureDescription = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground">{children}</p>
);

export const HighlightedFeatureVisual = ({
  children,
  tilt,
}: {
  children: ReactNode;
  tilt?: "left" | "right";
}) => (
  <div
    className={cn(
      "my-10 flex w-full flex-1 items-center justify-center transition-transform duration-300 ease-in-out",
      tilt === "left" && "rotate-1",
      tilt === "right" && "-rotate-1",
    )}
  >
    {children}
  </div>
);

export const FAQSection = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto mt-32 max-w-4xl px-6 pb-8 sm:pb-24 sm:pt-12 lg:max-w-7xl lg:px-8 lg:py-32">{children}</div>
);

export const FAQTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-foreground mb-12 text-center text-2xl font-bold leading-10 tracking-tight">{children}</h2>
);

export const FAQAccordion = ({ children }: { children: ReactNode }) => (
  <Accordion type="single" collapsible className="w-full space-y-4">
    {children}
  </Accordion>
);

export const FAQAccordionItem = ({ value, children }: { value: string; children: ReactNode }) => (
  <AccordionItem
    value={value}
    className="border-border hover:bg-muted/20 rounded-lg border px-6 py-2 transition-all duration-200"
  >
    {children}
  </AccordionItem>
);

export const FAQAccordionTrigger = ({ children }: { children: ReactNode }) => (
  <AccordionTrigger className="text-foreground hover:text-primary text-left text-base font-semibold leading-7 transition-colors duration-200">
    {children}
  </AccordionTrigger>
);

export const FAQAccordionContent = ({ children }: { children: ReactNode }) => (
  <AccordionContent className="text-muted-foreground">{children}</AccordionContent>
);

export const FAQAnswerRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col items-start justify-between gap-4">{children}</div>
);

export const FAQAnswerText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground flex-1 text-base leading-7">{children}</p>
);

export const FAQLearnMoreLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    className="text-primary hover:text-primary/80 shrink-0 whitespace-nowrap text-base font-medium leading-7 transition-colors duration-200"
  >
    {children}
  </a>
);

export const ClientsSection = ({ children }: { children: ReactNode }) => (
  <div className="items-between mx-auto mt-12 flex max-w-7xl flex-col gap-y-6 px-6 lg:px-8">{children}</div>
);

export const ClientsTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-muted-foreground mb-6 text-center font-semibold tracking-wide">{children}</h2>
);

export const ClientsGrid = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto grid max-w-lg grid-cols-2 items-center gap-x-8 gap-y-12 sm:max-w-xl sm:gap-x-10 sm:gap-y-14 md:grid-cols-4 lg:mx-0 lg:max-w-none">
    {children}
  </div>
);

export const ClientsLogoCell = ({ children }: { children: ReactNode }) => (
  <div className="col-span-1 flex max-h-12 w-full justify-center object-contain opacity-80 transition-opacity hover:opacity-100">
    {children}
  </div>
);

export const ExampleHighlightedFeatureFrame = ({ children }: { children: ReactNode }) => (
  <div className="w-full">{children}</div>
);

export const ExampleHighlightedFeatureLightImage = ({ src }: { src: string }) => (
  <img src={src} alt="AI Ready" className="dark:hidden" />
);

export const ExampleHighlightedFeatureDarkImage = ({ src }: { src: string }) => (
  <img src={src} alt="AI Ready" className="hidden dark:block" />
);

export const SectionTitleContainer = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto mb-8 max-w-2xl text-center">{children}</div>
);

export const SectionTitleHeading = ({ children }: { children: ReactNode }) => (
  <h3 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{children}</h3>
);

export const SectionTitleText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground mt-4 text-lg leading-8">{children}</p>
);
