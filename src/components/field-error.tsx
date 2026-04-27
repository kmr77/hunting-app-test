type FieldErrorProps = {
  error?: string;
};

export function FieldError({ error }: FieldErrorProps) {
  if (!error) {
    return null;
  }

  return <p className="text-red-600 text-sm leading-6">{error}</p>;
}
