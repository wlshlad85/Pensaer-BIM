"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Complete manual setup guide. You do the work, we show the way.",
    features: [
      "Full step-by-step documentation",
      "All channels (Discord, Telegram, etc.)",
      "Community support on GitHub",
      "Self-managed infrastructure",
      "Open-source — fork and modify freely",
    ],
    cta: "Read the Docs",
    accent: "brand-teal",
  },
  {
    name: "Pro",
    price: "$39",
    period: "one-time",
    description: "Automated scripts, pre-built workspace, and setup support included.",
    features: [
      "Everything in Free",
      "Automated setup script",
      "Pre-configured workspace",
      "Priority email support",
      "1-hour setup consultation",
    ],
    cta: "Buy Pro",
    accent: "brand-red",
    popular: true,
  },
  {
    name: "Support",
    price: "$19",
    period: "/month",
    description: "Ongoing monthly support for when things change.",
    features: [
      "Everything in Pro",
      "Direct Discord support channel",
      "Configuration reviews & updates",
      "Priority feature requests",
      "Monthly check-in calls",
    ],
    cta: "Subscribe",
    accent: "brand-purple",
  },
];

export function PricingTiers() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-2">Choose Your Path</h2>
      <p className="text-muted-foreground text-center mb-12">
        Open-source at heart. Pay only for convenience.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={`relative bg-surface border-border ${
              tier.popular ? "border-brand-red/50 shadow-lg shadow-brand-red/5" : ""
            }`}
          >
            {tier.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-red text-white">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground text-sm">{tier.period}</span>
              </div>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className={`text-${tier.accent}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${
                  tier.popular
                    ? "bg-brand-red hover:bg-brand-red/90 text-white"
                    : "variant-outline"
                }`}
                variant={tier.popular ? "default" : "outline"}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
