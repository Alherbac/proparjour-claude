/** Vignette candidat — dossier design §4, "Candidatures reçues" : 40×50, radius 10px. Photo réelle si présente, sinon initiale. */
export function Vignette({ photoUrl, nom }: { photoUrl: string | null; nom: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- espace isolé, sans next/image existant réutilisé
      <img src={photoUrl} alt="" className="h-[50px] w-10 shrink-0 rounded-[10px] object-cover" />
    );
  }
  return (
    <span className="flex h-[50px] w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F6F4F0] text-[15px] font-bold text-[#98938B]">
      {nom.charAt(0).toUpperCase()}
    </span>
  );
}
