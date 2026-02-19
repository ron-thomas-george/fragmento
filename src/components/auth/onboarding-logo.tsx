import Image from "next/image";

export default function OnboardingLogo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/blackLogo.svg"
        alt="Fragmento Logo"
        width={30}
        height={30}
        className="drop-shadow-2xl"
        priority
      />
      <span className="text-2xl font-semibold tracking-tight">Fragmento</span>
    </div>
  );
}
