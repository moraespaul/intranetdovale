export interface Ramal {
  ramal: string;
  nome: string;
}

export interface Departamento {
  nome: string;
  ramais: Ramal[];
}

export const departamentos: Departamento[] = [
  {
    nome: "CAP",
    ramais: [
      { ramal: "1027", nome: "Roberto Gonçalves" },
      { ramal: "1028", nome: "Fernanda Lima" },
      { ramal: "1029", nome: "Carlos Eduardo" },
    ],
  },
  {
    nome: "CAR",
    ramais: [
      { ramal: "1031", nome: "Ana Paula Silva" },
      { ramal: "1032", nome: "Marcos Oliveira" },
    ],
  },
  {
    nome: "COMERCIAL",
    ramais: [
      { ramal: "1040", nome: "Juliana Santos" },
      { ramal: "1041", nome: "Pedro Henrique" },
      { ramal: "1042", nome: "Luciana Ferreira" },
      { ramal: "1043", nome: "Ricardo Almeida" },
    ],
  },
  {
    nome: "COMPRAS",
    ramais: [
      { ramal: "1050", nome: "Tatiana Rocha" },
      { ramal: "1051", nome: "Bruno Martins" },
    ],
  },
  {
    nome: "PRODUÇÃO",
    ramais: [
      { ramal: "1060", nome: "José Aparecido" },
      { ramal: "1061", nome: "Leandro Costa" },
      { ramal: "1062", nome: "Simone Barbosa" },
    ],
  },
];
