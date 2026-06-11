import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AgentFirstLanding } from "./agent-first-landing";

test("agent-first landing renders the shared header, login, and stripped-down first question without the booking header CTA", () => {
  const html = renderToStaticMarkup(<AgentFirstLanding />);

  assert.match(html, /Skillfully/i);
  assert.match(html, /Skills Guide/i);
  assert.match(html, /Blog/i);
  assert.match(html, /Log in/i);
  assert.doesNotMatch(html, /Book onboarding/i);
  assert.match(html, /Skillfully helps you make better agent skills/i);
  assert.match(html, /Do you know what an agent skill is\?/i);
  assert.match(html, /Do you have an agent that you can text right now\?/i);
  assert.match(html, /Step 1 of 2/i);
  assert.match(html, /No, learn first/i);
  assert.doesNotMatch(html, /\/guide\/start-with-agent-skills/);
  assert.match(html, /absolute inset-y-0 left-0 flex w-full transition-transform duration-500 ease-out translate-x-0/i);
  assert.match(html, /min-w-full/i);
  assert.doesNotMatch(html, /Two questions\. Then we point you to the right next step\./i);
  assert.doesNotMatch(html, /A reusable instruction set that helps an agent do one job well, consistently\./i);
  assert.doesNotMatch(html, /border border-\[var\(--ink\)\] bg-\[var\(--paper\)\]/i);
  assert.doesNotMatch(html, /If you already have an agent, we&#x27;ll copy the exact prompt for you\./i);
  assert.doesNotMatch(html, /See regular landing page/i);
});

test("agent-first landing tracks both question branches, keeps the copy CTA inactive until clicked, and removes the extra account CTA after copy", async () => {
  const source = await readFile(new URL("./agent-first-landing.tsx", import.meta.url), "utf8");

  assert.match(source, /question:\s*"knows_agent_skill"/);
  assert.match(source, /question:\s*"has_agent_access"/);
  assert.match(source, /answer:\s*"yes"/);
  assert.match(source, /answer:\s*"no"/);
  assert.match(source, /Agent skills are playbooks \/ SOPs for AI agents\. They allow you to inject your expertise into the agent\./);
  assert.match(source, /const currentStep = knowsAgentSkill \? "2 of 2" : "1 of 2"/);
  assert.match(source, /knowsAgentSkill \? "-translate-x-full" : "translate-x-0"/);
  assert.match(source, /knowsAgentSkill === "no" \?/);
  assert.match(source, /copiedPrompt \? PRIMARY_BUTTON : SECONDARY_BUTTON/);
  assert.match(source, /Prompt copied\. Paste it into your agent, then create your account in Skillfully\./);
  assert.doesNotMatch(source, /If you already have an agent/);
  assert.doesNotMatch(source, /Create account/);
  assert.doesNotMatch(source, /LEARN_SKILLS_HREF/);
  assert.doesNotMatch(source, /href=\{LEARN_SKILLS_HREF\}/);
  assert.match(source, /onOpen=\{answerAgentAccessNo\}/);
  assert.match(source, /<PublicHeader showBookingCta=\{false\} \/>/);
  assert.match(source, /<LandingPageView page="\/" variant="agent-first" \/>/);
});
