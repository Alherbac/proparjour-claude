import { BadgeCheck } from "lucide-react";

export function Testimonial({
  citation,
  nom,
  role,
}: {
  citation: string;
  nom: string;
  role: string;
}) {
  return (
    <div className="relative rounded-[24px] border-[1.5px] border-line bg-white p-[30px] px-7 transition-[box-shadow,transform] duration-[250ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-[3px] hover:shadow-[var(--shadow-landing-md)] motion-reduce:transition-none">
      <span className="absolute right-6 top-6 rounded-[20px] border border-emerald px-2.5 py-[3px] font-mono-landing text-[9px] text-emerald opacity-85">
        <BadgeCheck className="mr-1 inline size-3 -translate-y-px" />
        vérifié
      </span>
      <div className="mb-4 text-[13px] tracking-[2px] text-gold-deep" aria-label="5 étoiles">
        ★★★★★
      </div>
      <p className="mb-5 text-[14.5px] leading-[1.68] text-[#333B4D]">{citation}</p>
      <div className="flex items-center gap-[11px]">
        <div className="size-9 rounded-full bg-[linear-gradient(135deg,#2A4C82,#647530)]" />
        <div>
          <b className="block text-[13.5px] font-semibold text-ink">{nom}</b>
          <span className="font-mono-landing text-xs text-muted-2">{role}</span>
        </div>
      </div>
    </div>
  );
}
