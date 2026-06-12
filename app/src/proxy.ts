import { postHogMiddleware } from "@posthog/next";

export default postHogMiddleware({
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ingest).*)"],
};
