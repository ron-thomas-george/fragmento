import Image from "next/image";

export default function OnboardingLogo() {
  return (
    <Image
      src="/fragmento.svg"
      alt="Fragmento Logo"
      width={160}
      height={160}
      className="drop-shadow-2xl"
      priority
    />
  );
}
