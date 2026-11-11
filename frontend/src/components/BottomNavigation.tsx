import { NavLink } from "react-router-dom";
import { House, UserRound } from "lucide-react";

export default function BottomNavigation() {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 border-t bg-card/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-2">
        {[{ to: "/dashboard", label: "Início", Icon: House }, { to: "/profile", label: "Perfil", Icon: UserRound }].map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg py-2 text-caption font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
