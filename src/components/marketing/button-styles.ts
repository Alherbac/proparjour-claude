/**
 * Classes des boutons marketing — valeurs reprises telles quelles de
 * proparjour-landing-v2.html (.btn, .btn-primary, .btn-ghost-dark,
 * .btn-ghost-light). Combinées via cn() (tailwind-merge), donc
 * n'importe quel appelant peut surcharger padding/font-size en passant
 * ses propres classes après celles-ci.
 */
export const LANDING_BTN_BASE =
  "inline-flex h-auto items-center justify-center gap-[9px] rounded-[10px] border-[1.5px] border-transparent px-7 py-[15px] text-[15px] font-semibold font-body-landing whitespace-nowrap transition-[transform,box-shadow,background-color,border-color] duration-[220ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] active:translate-y-px active:scale-[0.99] motion-reduce:transition-none";

export const LANDING_BTN_PRIMARY =
  "bg-[linear-gradient(180deg,#E4B461,var(--color-gold))] text-ink shadow-[var(--shadow-landing-sm),inset_0_1px_0_rgba(255,255,255,0.4)] hover:-translate-y-[1.5px] hover:shadow-[0_12px_28px_-8px_rgba(217,164,65,0.55),inset_0_1px_0_rgba(255,255,255,0.4)]";

export const LANDING_BTN_GHOST_DARK =
  "bg-transparent border-white/22 text-white hover:border-white/55 hover:bg-white/6";

export const LANDING_BTN_GHOST_LIGHT =
  "border-[#D8D2BF] bg-white text-ink hover:border-ink hover:shadow-[var(--shadow-landing-sm)]";

export const LANDING_BTN_HEADER_SIZE = "px-5 py-[11px] text-[13.5px]";

export const LANDING_BTN_ARROW =
  "inline-block transition-transform duration-[220ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:translate-x-[3px] motion-reduce:transition-none";
