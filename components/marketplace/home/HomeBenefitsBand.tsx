import { FlaskConical, Leaf, ShieldCheck, Sparkles } from "lucide-react";

const BENEFITS = [
  {
    title: "Natural & Safe",
    description: "Made with careful, skin-friendly ingredients.",
    icon: Leaf,
  },
  {
    title: "Dermatologically Tested",
    description: "Gentle formulas for confident daily routines.",
    icon: FlaskConical,
  },
  {
    title: "Visible Glow",
    description: "Designed for soft, healthy-looking radiance.",
    icon: Sparkles,
  },
  {
    title: "Trusted Quality",
    description: "Premium Glowish care shipped with confidence.",
    icon: ShieldCheck,
  },
];

export function HomeBenefitsBand() {
  return (
    <section
      id="why-glowish"
      className="scroll-mt-24 rounded-[10px] border border-[#e6f1d8] bg-[#f3f9ec] p-6 sm:p-8"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex items-start gap-4">
            <benefit.icon className="h-8 w-8 shrink-0 text-[#6ea43f]" strokeWidth={1.5} aria-hidden />
            <div>
              <h3 className="font-semibold text-[#1f2a44]">{benefit.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#64748b]">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
