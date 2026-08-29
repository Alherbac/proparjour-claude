import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      // Refonte 110790prodesign : deux variantes seulement — jamais de
      // rouge plein sur un badge. "default"/"destructive" portent le
      // rouge clair (action requise / vérification) ; les autres
      // retombent sur le neutre. Pas de suppression de variant (12+18
      // appels existants sur secondary/ghost côté Button, pattern
      // identique à respecter côté Badge) : on restyle sans renommer.
      variant: {
        default:
          "bg-ppj-red-bg text-ppj-red-text border-ppj-red-border [a]:hover:bg-ppj-red-border",
        secondary:
          "bg-ppj-fill text-ppj-neutral-text border-ppj-line [a]:hover:bg-ppj-line",
        destructive:
          "bg-ppj-red-bg text-ppj-red-text border-ppj-red-border [a]:hover:bg-ppj-red-border",
        outline:
          "border-ppj-line text-ppj-neutral-text [a]:hover:bg-ppj-fill",
        ghost:
          "border-transparent text-ppj-neutral-text hover:bg-ppj-fill",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
