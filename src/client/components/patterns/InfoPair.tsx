type InfoPairProps = {
  label: string;
  value: string | number;
  labelClassName: string;
  valueClassName: string;
};

const InfoPair = ({ label, value, labelClassName, valueClassName }: InfoPairProps) => {
  return (
    <div>
      <p className={labelClassName}>{label}</p>
      <p className={valueClassName}>{value}</p>
    </div>
  );
};

export default InfoPair;
