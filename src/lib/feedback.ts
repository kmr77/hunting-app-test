export type FeedbackVariant = "success" | "error";

export type FeedbackState = {
  message: string;
  variant: FeedbackVariant;
};

export type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function getFeedbackFromSearchParams(
  input?: SearchParamsInput,
): Promise<FeedbackState | null> {
  const searchParams = (input ? await input : {}) ?? {};
  const status = getFirstValue(searchParams.status);
  const message = getFirstValue(searchParams.message);

  if (!message || (status !== "success" && status !== "error")) {
    return null;
  }

  return {
    message,
    variant: status,
  };
}
