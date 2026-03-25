import { type ImgHTMLAttributes } from "react";

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement>;

const SafeImage = ({ onError, ...props }: SafeImageProps) => {
  return (
    <img
      {...props}
      onError={(event) => {
        (event.target as HTMLImageElement).style.display = "none";
        onError?.(event);
      }}
    />
  );
};

export default SafeImage;
