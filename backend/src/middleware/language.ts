import type { NextFunction, Request, Response } from "express";
import { resolveRequestLanguage } from "../i18n/languages.js";

/**
 * Customer-app routes only: picks the response language from `?lang=` or `Accept-Language`
 * (English when neither names a supported language) and echoes it back as `lang` in the
 * response envelope and the Content-Language header.
 */
export const resolveLanguage = (req: Request, res: Response, next: NextFunction) => {
  const { lang, explicit } = resolveRequestLanguage(req.query.lang, req.headers["accept-language"]);
  req.lang = lang;
  req.langExplicit = explicit;
  res.locals.lang = lang;
  res.setHeader("Content-Language", lang);
  next();
};
