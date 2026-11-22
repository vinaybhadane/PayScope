import { Icon } from "@/components/ui/Icon";

interface DownloadAppLinkProps {
  className: string;
  iconSize: number;
  onClick?: () => void;
}

export function DownloadAppLink({ className, iconSize, onClick }: DownloadAppLinkProps) {
  return (
    <a className={className} href="/payscope-render-debug.apk" download onClick={onClick}>
      <Icon name="download" size={iconSize} /> Download app
    </a>
  );
}
