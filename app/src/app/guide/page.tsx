import { redirect } from "next/navigation";

import { getFirstGuideArticle } from "@/content/guide";

export default function GuidePage() {
  const firstArticle = getFirstGuideArticle();

  redirect(`/guide/${firstArticle.slug}`);
}
