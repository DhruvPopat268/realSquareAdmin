interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
  label?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-[2px]",
  md: "h-7 w-7 border-[3px]",
  lg: "h-10 w-10 border-[3px]",
};

export default function Spinner({ size = "md", fullPage = false, label }: SpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`animate-spin rounded-full border-primary/20 border-t-primary ${sizeMap[size]}`} />
      {label && <p className="text-sm text-muted-foreground animate-pulse">{label}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center w-full min-h-[60vh]">
        {spinner}
      </div>
    );
  }

  return spinner;
}
