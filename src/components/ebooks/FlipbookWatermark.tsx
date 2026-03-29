interface FlipbookWatermarkProps {
  text?: string;
}

export function FlipbookWatermark({ text = "Documento Protegido" }: FlipbookWatermarkProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-10"
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="whitespace-nowrap text-[3rem] font-bold tracking-widest uppercase opacity-[0.06] select-none"
          style={{
            transform: "rotate(-35deg)",
            color: "currentColor",
            letterSpacing: "0.15em",
          }}
        >
          {text}
        </div>
      </div>
      {/* Repeat pattern for coverage */}
      <div className="absolute top-[15%] left-[10%] flex items-center justify-center">
        <div
          className="whitespace-nowrap text-[2rem] font-bold tracking-widest uppercase opacity-[0.04] select-none"
          style={{ transform: "rotate(-35deg)", color: "currentColor" }}
        >
          {text}
        </div>
      </div>
      <div className="absolute bottom-[15%] right-[10%] flex items-center justify-center">
        <div
          className="whitespace-nowrap text-[2rem] font-bold tracking-widest uppercase opacity-[0.04] select-none"
          style={{ transform: "rotate(-35deg)", color: "currentColor" }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
