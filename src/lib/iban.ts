/**
 * Validation IBAN par la clé de contrôle mod-97 (ISO 7064/13616) —
 * détecte les fautes de saisie sans dépendre d'un service externe.
 */
export function ibanValide(iban: string): boolean {
  const normalise = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalise)) return false;

  const reordonne = normalise.slice(4) + normalise.slice(0, 4);
  const numerique = reordonne.replace(/[A-Z]/g, (lettre) => String(lettre.charCodeAt(0) - 55));

  let reste = 0;
  for (let i = 0; i < numerique.length; i++) {
    reste = (reste * 10 + Number(numerique[i])) % 97;
  }
  return reste === 1;
}

export function bicValide(bic: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.replace(/\s+/g, "").toUpperCase());
}

export function formaterIban(iban: string): string {
  const normalise = iban.replace(/\s+/g, "").toUpperCase();
  return normalise.replace(/(.{4})/g, "$1 ").trim();
}

export function masquerIban(iban: string): string {
  const normalise = iban.replace(/\s+/g, "").toUpperCase();
  if (normalise.length <= 4) return normalise;
  return `${normalise.slice(0, 4)} •••• •••• ${normalise.slice(-4)}`;
}
