import { Search, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "principal", label: "Principal" },
  { id: "informativos", label: "Informativos" },
  { id: "arquivos", label: "Arquivos" },
  { id: "faq", label: "FAQ Técnico" },
  { id: "admin", label: "Admin" },
];

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-navy sticky top-0 z-50 shadow-lg">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <img src={logo} alt="Dovale Chaves" className="h-10 w-10 object-contain" />
            <span className="text-primary-foreground font-bold text-lg hidden sm:block tracking-tight">
              DOVALE CHAVES
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar na intranet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-navy-light text-primary-foreground placeholder:text-muted-foreground/60 text-sm border border-navy-light focus:border-orange focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? "bg-orange text-accent-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-navy-light"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-primary-foreground p-2"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1 animate-fade-in">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-navy-light text-primary-foreground placeholder:text-muted-foreground/60 text-sm border border-navy-light focus:border-orange focus:outline-none"
              />
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? "bg-orange text-accent-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-navy-light"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
