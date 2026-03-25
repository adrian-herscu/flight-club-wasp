import {
  LoadingSpinnerContainer,
  LoadingSpinnerCircle,
} from "../../client/components/patterns/AdminLoadingSpinnerPatterns";

const LoadingSpinner = () => {
  return (
    <LoadingSpinnerContainer>
      <LoadingSpinnerCircle />
    </LoadingSpinnerContainer>
  );
};

export default LoadingSpinner;
