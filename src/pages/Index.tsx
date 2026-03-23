import { useState } from "react";
import Header from "@/components/Header";
import RamaisPanel from "@/components/RamaisPanel";
import NewsFeed from "@/components/NewsFeed";
import LunchButton from "@/components/LunchButton";
import BirthdayWidget from "@/components/BirthdayWidget";
import ServiceStatus from "@/components/ServiceStatus";
import FaqSection from "@/components/FaqSection";

const Index = () => {
  const [activeTab, setActiveTab] = useState("principal");

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {activeTab === "principal" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left — Ramais */}
            <aside className="lg:col-span-3 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24">
                <RamaisPanel />
              </div>
            </aside>

            {/* Center — News */}
            <section className="lg:col-span-6 order-1 lg:order-2">
              <NewsFeed />
            </section>

            {/* Right — Utilities */}
            <aside className="lg:col-span-3 order-3 space-y-5">
              <LunchButton />
              <BirthdayWidget />
              <ServiceStatus />
            </aside>
          </div>
        )}

        {activeTab === "informativos" && (
          <div className="max-w-3xl mx-auto">
            <NewsFeed />
          </div>
        )}

        {activeTab === "arquivos" && (
          <div className="max-w-3xl mx-auto text-center py-20">
            <h2 className="text-xl font-bold text-foreground mb-2">Arquivos</h2>
            <p className="text-muted-foreground text-sm">
              Módulo de arquivos em desenvolvimento. Em breve você poderá acessar documentos compartilhados.
            </p>
          </div>
        )}

        {activeTab === "faq" && (
          <div className="py-4">
            <FaqSection />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-navy mt-12 py-4 text-center">
        <p className="text-primary-foreground/50 text-xs">
          © 2026 Dovale Chaves — Intranet Corporativa
        </p>
      </footer>
    </div>
  );
};

export default Index;
