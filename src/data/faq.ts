export interface FaqItem {
  pergunta: string;
  resposta: string;
  categoria: string;
}

export const faqData: FaqItem[] = [
  {
    pergunta: "O que são chaves codificadas (transponder)?",
    resposta: "Chaves codificadas possuem um chip transponder embutido que se comunica com a central eletrônica do veículo. Sem o código correto, o motor não dá partida. Cada chave possui um código único programado na ECU do veículo. A duplicação exige equipamento específico de programação.",
    categoria: "Automotivas",
  },
  {
    pergunta: "Qual a diferença entre chave canivete e chave comum?",
    resposta: "A chave canivete possui a lâmina retrátil dentro do controle remoto, oferecendo praticidade e proteção. Já a chave comum possui lâmina fixa e geralmente não integra funções de controle remoto. Ambas podem ter chip transponder.",
    categoria: "Automotivas",
  },
  {
    pergunta: "O que é uma chave Tetra?",
    resposta: "A chave Tetra (ou chave de 4 faces) é um modelo de alta segurança usado em fechaduras residenciais e comerciais. Possui sulcos nos quatro lados da lâmina, tornando a duplicação mais complexa e aumentando significativamente a segurança contra cópias não autorizadas.",
    categoria: "Residenciais",
  },
  {
    pergunta: "Quais tipos de fechaduras residenciais trabalhamos?",
    resposta: "Trabalhamos com fechaduras de cilindro, fechaduras Tetra, fechaduras eletrônicas (senha/biometria), fechaduras de sobrepor, fechaduras de embutir e cadeados de alta segurança. Todas com certificação e garantia de fábrica.",
    categoria: "Residenciais",
  },
  {
    pergunta: "Como funciona a programação de controles automotivos?",
    resposta: "A programação é feita via equipamento de diagnóstico OBD2 conectado à porta do veículo. O processo inclui leitura da ECU, cadastro do novo transponder e sincronização do controle remoto. O tempo médio é de 30 a 60 minutos dependendo do modelo.",
    categoria: "Automotivas",
  },
  {
    pergunta: "Quais marcas de chaves automotivas são compatíveis?",
    resposta: "Trabalhamos com todas as principais marcas: Toyota, Honda, Volkswagen, Fiat, Chevrolet, Ford, Hyundai, Kia, Renault, Peugeot, Citroën, BMW, Mercedes-Benz e Audi. Consulte nosso catálogo para modelos específicos.",
    categoria: "Automotivas",
  },
  {
    pergunta: "O que é o sistema de mestre e submestre?",
    resposta: "É um sistema hierárquico de chaves onde a chave mestre abre todas as fechaduras do conjunto, enquanto cada submestre abre apenas as fechaduras designadas. Ideal para condomínios e empresas que precisam de controle de acesso por níveis.",
    categoria: "Comerciais",
  },
  {
    pergunta: "Como armazenar chaves brutas corretamente?",
    resposta: "As chaves brutas devem ser armazenadas em local seco, protegidas de umidade e calor excessivo. Organize por tipo e fabricante em gavetas ou painéis etiquetados. Chaves com chip transponder devem ser mantidas em embalagens antiestáticas.",
    categoria: "Estoque",
  },
];
