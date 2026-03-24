import {
  AnnouncementBanner,
  AnnouncementButtonLinkDesktop,
  AnnouncementButtonLinkMobile,
  AnnouncementDivider,
  AnnouncementTextLink,
} from "../patterns/AnnouncementPatterns";

const ANNOUNCEMENT_URL = "https://github.com/wasp-lang/wasp";

export function Announcement() {
  return (
    <AnnouncementBanner>
      <AnnouncementTextLink href={ANNOUNCEMENT_URL}>
        Support Open-Source Software!
      </AnnouncementTextLink>
      <AnnouncementDivider />
      <AnnouncementButtonLinkDesktop href={ANNOUNCEMENT_URL}>
        Star Our Repo on Github ⭐️ →
      </AnnouncementButtonLinkDesktop>
      <AnnouncementButtonLinkMobile href={ANNOUNCEMENT_URL}>
        ⭐️ Star the Our Repo and Support Open-Source! ⭐️
      </AnnouncementButtonLinkMobile>
    </AnnouncementBanner>
  );
}
