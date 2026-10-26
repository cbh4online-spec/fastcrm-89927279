"""ZIP piloto determinístico: stdlib zipfile, ZIP_STORED, ordenado, data fixa, modo 0644, sem extras.
Uso: python3 scripts/make-pilot-zip.py <dist_dir> <zip_path>
"""
import os, sys, zipfile

def build(dist, out):
    files = sorted(os.path.relpath(os.path.join(r, f), dist).replace(os.sep, "/")
                   for r, _, fs in os.walk(dist) for f in fs)
    if "manifest.json" not in files:
        raise SystemExit("manifest.json ausente na raiz")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_STORED) as z:
        for name in files:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            info.create_system = 3
            info.external_attr = (0o100644 & 0xFFFF) << 16
            with open(os.path.join(dist, name), "rb") as fh:
                z.writestr(info, fh.read())
    return files

if __name__ == "__main__":
    print("\n".join(build(sys.argv[1], sys.argv[2])))
