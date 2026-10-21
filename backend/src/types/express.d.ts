import type { AdminRole } from "../../generated/prisma/enums.js";
import type { Language } from "../i18n/languages.js";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      /** Response language for customer-app routes (set by resolveLanguage); English elsewhere. */
      lang?: Language;
      /** True when the client actually asked for a language (?lang= or Accept-Language). */
      langExplicit?: boolean;
      /** Present only on requests authenticated with an admin/superadmin JWT. */
      admin?: {
        id: string;
        email: string;
        role: AdminRole;
      };
      /** Present only on requests authenticated with a restaurant customer JWT. */
      customer?: {
        id: string;
        phone: string;
        /** Language push notifications are sent in. */
        language: Language;
      };
    }
  }
}
