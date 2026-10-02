import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className, ...props }, ref) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    return (
      <span className="password-field">
        <input ref={ref} className={className} type={visible ? "text" : "password"} {...props} />
        <button
          type="button"
          className="password-field__toggle"
          aria-label={visible ? t("form.hidePassword") : t("form.showPassword")}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    );
  },
);
