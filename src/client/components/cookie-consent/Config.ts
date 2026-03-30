import type { CookieConsentConfig } from "vanilla-cookieconsent";

declare global {
  interface Window {
    dataLayer: any;
  }
}

const getConfig = (locale: string = "en") => {
  // See https://cookieconsent.orestbida.com/reference/configuration-reference.html for configuration options.
  const config: CookieConsentConfig = {
    // Default configuration for the modal.
    root: "body",
    autoShow: true,
    disablePageInteraction: false,
    hideFromBots: import.meta.env.PROD ? true : false, // Set this to false for dev/headless tests otherwise the modal will not be visible.
    mode: "opt-in",
    // Bump the revision field when you add new services
    revision: 0,

    // Default configuration for the cookie.
    cookie: {
      name: "cc_cookie",
      domain: location.hostname,
      path: "/",
      sameSite: "Lax",
      expiresAfterDays: 365,
    },

    guiOptions: {
      consentModal: {
        layout: "box",
        position: "bottom right",
        equalWeightButtons: true,
        flipButtons: false,
      },
    },

    categories: {
      necessary: {
        enabled: true, // this category is enabled by default
        readOnly: true, // this category cannot be disabled
      },
      analytics: {
        autoClear: {
          cookies: [
            {
              name: /^_ga/, // regex: match all cookies starting with '_ga'
            },
            {
              name: "_gid", // string: exact cookie name
            },
          ],
        },

        // https://cookieconsent.orestbida.com/reference/configuration-reference.html#category-services
        services: {
          ga: {
            label: "Google Analytics",
            onAccept: () => {
              try {
                const GA_ANALYTICS_ID =
                  import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID;
                if (!GA_ANALYTICS_ID || !String(GA_ANALYTICS_ID).trim()) {
                  throw new Error("Google Analytics ID is missing");
                }
                window.dataLayer = window.dataLayer || [];
                function gtag(..._args: unknown[]) {
                  (window.dataLayer as Array<any>).push(arguments);
                }
                gtag("js", new Date());
                gtag("config", GA_ANALYTICS_ID);

                // Adding the script tag dynamically to the DOM.
                const script = document.createElement("script");
                script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ANALYTICS_ID}`;
                script.async = true;
                document.body.appendChild(script);
              } catch (error) {
                console.error(error);
              }
            },
            onReject: () => {},
          },
        },
      },
    },

    language: {
      default: locale,
      translations: {
        en: {
          consentModal: {
            title: "We use cookies",
            description:
              "We use cookies primarily for analytics to enhance your experience. By accepting, you agree to our use of these cookies. You can manage your preferences or learn more about our cookie policy.",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            // showPreferencesBtn: 'Manage Individual preferences', // (OPTIONAL) Activates the preferences modal
            // TODO: Add your own privacy policy and terms and conditions links below.
            footer: `
            <a href="<your-url-here>" target="_blank">Privacy Policy</a>
            <a href="<your-url-here>" target="_blank">Terms and Conditions</a>
                    `,
          },
          // The showPreferencesBtn activates this modal to manage individual preferences https://cookieconsent.orestbida.com/reference/configuration-reference.html#translation-preferencesmodal
          preferencesModal: {
            sections: [],
          },
        },
        ro: {
          consentModal: {
            title: "Folosim cookie-uri",
            description:
              "Folosim cookie-uri în principal pentru analiză, pentru a-ți îmbunătăți experiența. Prin acceptare, ești de acord cu utilizarea acestor cookie-uri. Îți poți gestiona preferințele sau poți afla mai multe despre politica noastră de cookie-uri.",
            acceptAllBtn: "Acceptă toate",
            acceptNecessaryBtn: "Respinge toate",
            footer: `
            <a href="<your-url-here>" target="_blank">Politica de confidențialitate</a>
            <a href="<your-url-here>" target="_blank">Termeni și condiții</a>
                    `,
          },
          preferencesModal: {
            sections: [],
          },
        },
        he: {
          consentModal: {
            title: "אנו משתמשים בעוגיות",
            description:
              "אנו משתמשים בעוגיות בעיקר לניתוח כדי לשפר את חוויתך. על ידי קבלה, אתה מסכים לשימוש שלנו בעוגיות אלה. תוכל לנהל את העדפותיך או ללמוד עוד על מדיניות העוגיות שלנו.",
            acceptAllBtn: "קבל הכל",
            acceptNecessaryBtn: "דחה הכל",
            footer: `
            <a href="<your-url-here>" target="_blank">מדיניות פרטיות</a>
            <a href="<your-url-here>" target="_blank">תנאים והגבלות</a>
                    `,
          },
          preferencesModal: {
            sections: [],
          },
        },
      },
    },
  };

  return config;
};

export default getConfig;
