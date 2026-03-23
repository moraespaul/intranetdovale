import { UtensilsCrossed, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import LunchModal from "@/components/LunchModal";

const LunchButton = () => {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const isAvailable = currentMinutes >= 450 && currentMinutes <= 570; // 07:30 - 09:30

  return (
    <>
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <button
          onClick={() => setOpen(true)}
          disabled={!isAvailable}
          className={`w-full p-5 flex flex-col items-center gap-3 transition-all ${
            isAvailable
              ? "bg-orange hover:bg-orange-dark cursor-pointer"
              : "bg-muted cursor-not-allowed"
          }`}
        >
          <UtensilsCrossed className={`h-8 w-8 ${isAvailable ? "text-accent-foreground" : "text-muted-foreground"}`} />
          <span className={`font-bold text-base ${isAvailable ? "text-accent-foreground" : "text-muted-foreground"}`}>
            SOLICITAR ALMOÇO
          </span>
          <span className={`text-xs flex items-center gap-1 ${isAvailable ? "text-accent-foreground/80" : "text-muted-foreground/60"}`}>
            <Clock className="h-3 w-3" />
            Disponível 07:30 às 09:30
          </span>
        </button>
      </div>
      <LunchModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default LunchButton;
