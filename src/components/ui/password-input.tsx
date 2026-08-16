import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  visibilityLabel?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, id, visibilityLabel = "le mot de passe", ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const actionLabel = visible ? `Masquer ${visibilityLabel}` : `Afficher ${visibilityLabel}`;

    return (
      <div className="relative min-w-0">
        <Input
          {...props}
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pe-11", className)}
        />
        <button
          type="button"
          aria-label={actionLabel}
          aria-pressed={visible}
          aria-controls={id}
          title={actionLabel}
          disabled={disabled}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
