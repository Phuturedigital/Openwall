type LogoProps = {
  className?: string;
};

export function Logo({ className = "w-8 h-8" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="12"
        className="stroke-current"
        strokeWidth="6"
        fill="none"
      />

      <rect
        x="25"
        y="25"
        width="22"
        height="22"
        rx="4"
        className="fill-current"
      />

      <rect
        x="53"
        y="25"
        width="22"
        height="22"
        rx="4"
        className="fill-current"
      />

      <rect
        x="25"
        y="53"
        width="22"
        height="22"
        rx="4"
        className="fill-current"
      />

      <rect
        x="53"
        y="53"
        width="22"
        height="22"
        rx="4"
        className="fill-current opacity-30"
      />
    </svg>
  );
}
