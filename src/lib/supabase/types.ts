export type Restaurante = {
  id: string;
  nombre: string;
  tipo_cocina: string;
  rango_precio: 1 | 2 | 3;
  direccion: string;
  latitud: number;
  longitud: number;
  descripcion: string | null;
  patrocinado: boolean;
};

export type Plato = {
  id: string;
  restaurante_id: string;
  nombre: string;
  categoria: "Entrante" | "Principal" | "Postre" | "Bebida";
  descripcion: string | null;
  precio: number | null;
  ingredientes: string[];
  alergenos_declarados: string[];
  permite_modificacion: boolean;
  nota_cocina: string | null;
};

export type HistorialEleccion = {
  id: string;
  firma_perfil: string;
  restaurante_id: string;
  contador_selecciones: number;
  platos_validados: string[];
  updated_at: string;
};
