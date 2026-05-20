import torcida from "@/assets/torcida.jpg";

export function WatermarkBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-center bg-cover opacity-[0.09]"
        style={{ backgroundImage: `url(${torcida})`, filter: "blur(2px) saturate(1.1)" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.30_0.12_262/0.55),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
    </div>
  );
}
