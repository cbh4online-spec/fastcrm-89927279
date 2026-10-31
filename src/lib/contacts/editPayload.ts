/** Campo vazio → null, para que a edição apague o valor guardado. */
export const emptyToNull = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t ? t : null;
};
